/**
 * Supabase access for online rooms: create, read, compare-and-set updates and live updates.
 * The table and its rules live in supabase/migrations.
 */
import { secureRandomInt } from '../blackjack/engine'
import { GameError, createRoomState } from './engine'
import { supabase } from './supabase'

const TABLE = 'callbreak_rooms'
const COLUMNS = 'code, state, version'
// No 0/O or 1/I/L, so a code read out loud or off a screen can't be mistyped.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 5

export const makeRoomCode = (randInt = secureRandomInt) =>
  Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randInt(CODE_ALPHABET.length)]).join('')

export const normalizeCode = (code) => String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)

const networkError = (error) =>
  new Error(error?.message?.includes('fetch') ? 'Could not reach the server. Check your connection.' : 'Something went wrong talking to the server.')

export async function fetchRoom(code) {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('code', code).maybeSingle()
  if (error) throw networkError(error)
  if (!data) throw new GameError(`No room called ${code}. Check the code and try again.`)
  return data
}

export async function createRoom(player, totalRounds) {
  const state = createRoomState(player, totalRounds)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode()
    const { data, error } = await supabase.from(TABLE).insert({ code, state, version: 0 }).select(COLUMNS).single()
    if (!error) return data
    if (error.code !== '23505') throw networkError(error) // 23505: code already taken, pick another
  }
  throw new Error('Could not create a room. Try again.')
}

/**
 * Applies `action(state) => newState` to the room. The write only lands if nobody else
 * changed the room since `row` was read; otherwise the latest row is fetched and the
 * action is re-run on it (so it is re-validated against the current table).
 */
export async function updateRoom(code, row, action) {
  let current = row
  for (let attempt = 0; attempt < 6; attempt++) {
    current ??= await fetchRoom(code)
    const state = action(current.state)
    if (state === current.state) return current
    const { data, error } = await supabase
      .from(TABLE)
      .update({ state, version: current.version + 1 })
      .eq('code', code)
      .eq('version', current.version)
      .select(COLUMNS)
      .maybeSingle()
    if (error) throw networkError(error)
    if (data) return data
    current = null // someone else moved first
  }
  throw new Error('The table is busy. Try again.')
}

/* ---------- History ---------- */

const GAMES = 'callbreak_games'

/** Finished games you played in, newest first (row-level security only returns your own). */
export async function fetchHistory(limit = 50) {
  const { data, error } = await supabase
    .from(GAMES)
    .select('id, room_code, finished_at, total_rounds, ended_early, players, rounds')
    .order('finished_at', { ascending: false })
    .limit(limit)
  if (error) throw networkError(error)
  return data
}

/** Stores a finished game. Every person at the table may call this; the first save wins. */
export async function saveGame(code, state) {
  const players = state.players.map(({ id, name, bot }) => ({ id, name, bot: Boolean(bot) }))
  const { error } = await supabase.from(GAMES).upsert(
    {
      id: state.gameId,
      room_code: code,
      total_rounds: state.totalRounds,
      ended_early: Boolean(state.endedEarly),
      players,
      rounds: state.rounds,
      player_ids: players.filter((p) => !p.bot).map((p) => p.id),
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )
  if (error) throw networkError(error)
}

/* ---------- Chat ---------- */

const MESSAGES = 'callbreak_messages'
const MESSAGE_COLUMNS = 'id, player_id, name, body, created_at'
export const MESSAGE_MAX = 200
const HISTORY = 60

/** The latest messages for a room, oldest first. */
export async function fetchMessages(code) {
  const { data, error } = await supabase
    .from(MESSAGES)
    .select(MESSAGE_COLUMNS)
    .eq('room_code', code)
    .order('id', { ascending: false })
    .limit(HISTORY)
  if (error) throw networkError(error)
  return data.reverse()
}

export async function sendMessage(code, me, body) {
  const text = String(body ?? '').replace(/\s+/g, ' ').trim().slice(0, MESSAGE_MAX)
  if (!text) throw new GameError('Type a message first.')
  const { data, error } = await supabase
    .from(MESSAGES)
    .insert({ room_code: code, player_id: me.id, name: me.name, body: text })
    .select(MESSAGE_COLUMNS)
    .single()
  if (error) {
    // 42501: row-level security said no, which here means you're not seated at this table.
    if (error.code === '42501') throw new GameError('Only players at this table can chat.')
    throw networkError(error)
  }
  return data
}

/**
 * Live chat messages. A separate channel from the game, so a chat problem (say, the chat
 * migration not run yet) can never stop game updates. Returns an unsubscribe function.
 */
export function subscribeChat(code, { onMessage, onStatus }) {
  const channel = supabase.channel(`callbreak-chat:${code}`)
  channel
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: MESSAGES, filter: `room_code=eq.${code}` }, (payload) =>
      onMessage(payload.new)
    )
    .subscribe((status) => onStatus?.(status))
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Live room updates plus presence (who has the room open right now).
 * Returns an unsubscribe function.
 */
export function subscribeRoom(code, me, { onRow, onPresence, onStatus }) {
  const channel = supabase.channel(`callbreak:${code}`, { config: { presence: { key: me.id } } })
  channel
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE, filter: `code=eq.${code}` }, (payload) =>
      onRow(payload.new)
    )
    .on('presence', { event: 'sync' }, () => onPresence(Object.keys(channel.presenceState())))
    .subscribe((status) => {
      onStatus(status)
      if (status === 'SUBSCRIBED') channel.track({ name: me.name }).catch(() => {})
    })
  return () => {
    supabase.removeChannel(channel)
  }
}
