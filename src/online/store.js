import { create } from 'zustand'
import * as api from './room'
import * as auth from './auth'
import { GameError, joinRoom, leaveRoom } from './engine'
import { GAMES } from './games'
import { supabase } from './supabase'

const ROOM_KEY = 'callbreak-online-room'

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}
const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode): the session still works, it just isn't remembered */
  }
}

const loadSavedCode = () => {
  const code = read(ROOM_KEY)
  return typeof code === 'string' ? api.normalizeCode(code) : null
}

const ok = { ok: true, error: null, code: null }
const fail = (error, code = null) => ({ ok: false, error, code })
const message = (e) => (e instanceof GameError ? e.message : e?.message || 'Something went wrong.')
const errorCode = (e) => (e instanceof GameError ? e.code : null)

let unsubscribe = null

export const useOnlineStore = create((set, get) => {
  /** Runs a create/join request with the busy flag set; returns { ok, error }. */
  const request = async (fn) => {
    set({ busy: true })
    try {
      await fn()
      return ok
    } catch (e) {
      return fail(message(e), errorCode(e))
    } finally {
      set({ busy: false })
    }
  }

  const signedIn = () => {
    const { me } = get()
    if (!me.id) throw new GameError('Sign in to play online.')
    return me
  }

  return {
    // The signed-in account ({ id: auth user id, name: username }); id is null when signed out.
    me: { id: null, name: '' },
    authReady: false, // false until the saved session (if any) has been read
    history: {}, // finished games for this account by game id, newest first (missing = not loaded)
    historyError: null,
    code: null,
    row: null, // { code, state, version }: the room as last seen
    online: [], // player ids with the room open right now
    connection: 'idle', // 'idle' | 'connecting' | 'live' | 'offline'
    busy: false,
    savedCode: loadSavedCode(), // room to offer rejoining after a refresh
    inviteCode: null, // from a ?room= invite link
    messages: [], // chat, oldest first: { id, player_id, name, body, created_at }
    chatOpen: false,
    unread: 0,

    setInviteCode: (inviteCode) => set({ inviteCode: api.normalizeCode(inviteCode) || null }),

    /** Takes a newer copy of the room (live update or fetch). `force` also accepts the same version. */
    receive: (row, force = false) => {
      const current = get().row
      if (!row || row.code !== get().code) return
      if (!current || row.version > current.version || (force && row.version === current.version)) set({ row })
    },

    refresh: async () => {
      const { code } = get()
      if (!code) return
      try {
        get().receive(await api.fetchRoom(code), true)
      } catch {
        /* offline: the next live update or refresh catches up */
      }
    },

    enter: (row) => {
      unsubscribe?.()
      const { me } = get()
      set({
        code: row.code,
        row,
        online: [],
        connection: 'connecting',
        savedCode: row.code,
        inviteCode: null,
        messages: [],
        unread: 0,
        chatOpen: false,
      })
      write(ROOM_KEY, row.code)
      const stopRoom = api.subscribeRoom(row.code, me, {
        onRow: (next) => get().receive(next),
        onPresence: (online) => set({ online }),
        onStatus: (status) => {
          if (get().code !== row.code) return
          set({ connection: status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' ? 'idle' : 'offline' })
          // Catch up on anything missed while connecting or reconnecting.
          if (status === 'SUBSCRIBED') get().refresh()
        },
      })
      const stopChat = api.subscribeChat(row.code, {
        onMessage: (msg) => get().addMessages([msg], true),
        onStatus: (status) => {
          if (status === 'SUBSCRIBED' && get().code === row.code) get().loadMessages()
        },
      })
      unsubscribe = () => {
        stopRoom()
        stopChat()
      }
    },

    /* ----- Chat ----- */

    /** Merges messages in by id (live updates and fetches can overlap). `live` counts unread ones. */
    addMessages: (incoming, live = false) => {
      const { messages, me, chatOpen } = get()
      const known = new Set(messages.map((m) => m.id))
      const fresh = incoming.filter((m) => m && !known.has(m.id))
      if (!fresh.length) return
      const merged = [...messages, ...fresh].sort((a, b) => a.id - b.id).slice(-100)
      const unseen = live && !chatOpen ? fresh.filter((m) => m.player_id !== me.id).length : 0
      set({ messages: merged, unread: get().unread + unseen })
    },

    loadMessages: async () => {
      const { code } = get()
      if (!code) return
      try {
        const history = await api.fetchMessages(code)
        if (get().code === code) get().addMessages(history)
      } catch {
        /* chat history is a nice-to-have; live messages still arrive */
      }
    },

    sendMessage: async (body) => {
      const { code, me } = get()
      if (!code) return fail('You are not at a table.')
      try {
        get().addMessages([await api.sendMessage(code, me, body)])
        return ok
      } catch (e) {
        return fail(message(e))
      }
    },

    setChatOpen: (chatOpen) => set(chatOpen ? { chatOpen, unread: 0 } : { chatOpen }),

    /* ----- Account ----- */

    /** Reads the saved session and follows sign-ins and sign-outs from here on. */
    initAuth: async () => {
      if (!supabase) {
        set({ authReady: true })
        return
      }
      const apply = (session) => {
        const player = auth.playerFrom(session)
        const wasId = get().me.id
        set({ me: player ?? { id: null, name: '' }, authReady: true })
        if (player && player.id !== wasId) {
          set({ history: {} })
          if (get().pendingResume) get().resume()
        }
        if (!player) set({ resuming: false }) // nothing to resume until they sign in
        if (!player && wasId) get().leave()
      }
      const { data } = await supabase.auth.getSession()
      apply(data.session)
      supabase.auth.onAuthStateChange((_event, session) => apply(session))
    },

    signIn: (username, password) => request(() => auth.signIn(username, password)),
    signUp: (username, password) => request(() => auth.signUp(username, password)),
    signOut: async () => {
      get().leave()
      await auth.signOut()
      set({ me: { id: null, name: '' }, history: {} })
    },

    /* ----- History ----- */

    loadHistory: async (game = 'callbreak') => {
      const { me } = get()
      if (!me.id) return
      set({ historyError: null })
      try {
        const games = await api.fetchHistory(game)
        if (get().me.id === me.id) set({ history: { ...get().history, [game]: games } })
      } catch (e) {
        set({ historyError: message(e), history: { ...get().history, [game]: get().history[game] ?? [] } })
      }
    },

    /** Saves a finished game to every seated player's history (safe to call from each of their devices). */
    recordGame: async (state) => {
      if (!get().me.id || !state.gameId || state.status !== 'finished' || !state.rounds.length) return
      try {
        await api.saveGame(get().code, state)
        const history = { ...get().history }
        delete history[state.game ?? 'callbreak'] // refetch next time that game's history is opened
        set({ history })
      } catch {
        /* another player's device may already have saved it; history is best-effort */
      }
    },

    /* ----- Rooms ----- */

    /** Makes a new table for `gameId` ('callbreak' | 'teenpatti') with its length option. */
    create: (option, gameId = 'callbreak') =>
      request(async () => {
        const me = signedIn()
        const game = GAMES[gameId]
        if (!game) throw new GameError('Unknown game.')
        get().enter(await api.createRoom(game.createState(me, option)))
      }),

    join: (code) =>
      request(async () => {
        const me = signedIn()
        const roomCode = api.normalizeCode(code)
        if (roomCode.length < 4) throw new GameError('Enter the room code.')
        get().enter(await api.updateRoom(roomCode, null, (s) => joinRoom(s, me)))
      }),

    /** Leaves the room. In the lobby this frees the seat; mid-game the seat waits for you. */
    leave: () => {
      const { code, row, me } = get()
      unsubscribe?.()
      unsubscribe = null
      set({ code: null, row: null, online: [], connection: 'idle', savedCode: null, messages: [], unread: 0, chatOpen: false })
      write(ROOM_KEY, null)
      if (code && row?.state.status === 'lobby') api.updateRoom(code, row, (s) => leaveRoom(s, me.id)).catch(() => {})
    },

    forgetSavedRoom: () => {
      set({ savedCode: null, resumeError: null })
      write(ROOM_KEY, null)
    },

    resuming: false, // rejoining the saved room after a page reload
    resumeError: null,
    pendingResume: false, // a reload asked to resume before the session was read

    /** After a reload (or the phone closing the tab in the background), take your seat back. */
    resume: async () => {
      const { savedCode, me, code, authReady } = get()
      if (code || !savedCode) return
      if (!authReady || !me.id) {
        set({ pendingResume: true, resuming: !authReady })
        return
      }
      set({ resuming: true, resumeError: null, pendingResume: false })
      const result = await get().join(savedCode)
      set({ resuming: false, resumeError: result.ok ? null : result.error })
    },

    /**
     * Runs a game action `(state, playerId) => newState`. It is shown straight away and then
     * saved; if the save fails the table snaps back to the server copy.
     */
    act: async (action) => {
      const { code, row, me } = get()
      if (!code || !row) return fail('You are not at a table.')
      let optimistic
      try {
        optimistic = action(row.state, me.id)
      } catch (e) {
        return fail(message(e))
      }
      set({ row: { ...row, state: optimistic } })
      try {
        get().receive(await api.updateRoom(code, row, (s) => action(s, me.id)), true)
        return ok
      } catch (e) {
        await get().refresh()
        return fail(message(e))
      }
    },
  }
})
