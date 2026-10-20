import { create } from 'zustand'
import * as api from './room'
import { GameError, cleanName, joinRoom, leaveRoom } from './engine'

const ID_KEY = 'callbreak-online-identity'
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

// crypto.randomUUID needs a secure context; this also works over plain http on a LAN.
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')

/** This device's player id and last-used name. The id is what keeps your seat across refreshes. */
const loadIdentity = () => {
  const saved = read(ID_KEY)
  const me = saved && typeof saved.id === 'string' ? { id: saved.id, name: cleanName(saved.name) } : { id: randomId(), name: '' }
  write(ID_KEY, me)
  return me
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

  const saveName = (name) => {
    const me = { ...get().me, name: cleanName(name) }
    if (!me.name) throw new GameError('Enter your name.')
    set({ me })
    write(ID_KEY, me)
    return me
  }

  return {
    me: loadIdentity(),
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

    create: (name, totalRounds) =>
      request(async () => {
        const me = saveName(name)
        get().enter(await api.createRoom(me, totalRounds))
      }),

    join: (name, code) =>
      request(async () => {
        const me = saveName(name)
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

    /** After a reload (or the phone closing the tab in the background), take your seat back. */
    resume: async () => {
      const { savedCode, me, code } = get()
      if (code || !savedCode || !me.name) return
      set({ resuming: true, resumeError: null })
      const result = await get().join(me.name, savedCode)
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
