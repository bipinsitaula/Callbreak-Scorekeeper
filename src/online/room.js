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
