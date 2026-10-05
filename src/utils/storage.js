import {
  MAX_PLAYERS,
  MAX_ROUNDS,
  MIN_PLAYERS,
  computeScores,
  getCardsPerPlayer,
} from './helpers'

export const GAME_KEY = 'callBreakScorekeeper_v2'
export const LEGACY_GAME_KEY = 'callBreakScorekeeper_v1'
export const HISTORY_KEY = 'callBreakHistory_v1'
export const PREFS_KEY = 'callBreakPrefs_v1'
export const THEME_KEY = 'callBreakTheme'
export const HISTORY_LIMIT = 50

const read = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.warn(`Failed to read "${key}"`, e)
    return null
  }
}

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`Failed to save "${key}"`, e)
  }
}

const remove = (key) => {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.warn(`Failed to remove "${key}"`, e)
  }
}

const isIntArray = (arr, length, min, max) =>
  Array.isArray(arr) &&
  arr.length === length &&
  arr.every((v) => Number.isInteger(v) && v >= min && v <= max)

const isDraftArray = (arr, length, min, max) =>
  Array.isArray(arr) &&
  arr.length === length &&
  arr.every((v) => v === null || (Number.isInteger(v) && v >= min && v <= max))

const newGameId = () =>
  `g_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/**
 * Validate untrusted saved data and rebuild a safe game state from it.
 * Scores are always recomputed from bids/tricks, which also migrates v1
 * saves (float scores) to integer tenths. Returns null if unusable.
 */
export const sanitizeRounds = (rawRounds, playerCount) => {
  const cards = getCardsPerPlayer(playerCount)
  if (!Array.isArray(rawRounds)) return null
  const rounds = []
  for (const r of rawRounds) {
    if (!r || !isIntArray(r.bids, playerCount, 1, cards) || !isIntArray(r.tricks, playerCount, 0, cards)) {
      return null
    }
    rounds.push({ bids: r.bids, tricks: r.tricks, scores: computeScores(r.bids, r.tricks) })
  }
  return rounds
}

export const sanitizeGame = (data) => {
  if (!data || typeof data !== 'object' || !data.started) return null

  const { players, totalRounds } = data
  if (!Array.isArray(players) || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return null
  if (!players.every((p) => typeof p === 'string' && p.trim())) return null
  if (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > MAX_ROUNDS) return null

  const n = players.length
  const cards = getCardsPerPlayer(n)
  const rounds = sanitizeRounds(data.rounds ?? [], n)
  if (!rounds || rounds.length > totalRounds) return null

  // A game is either in progress (next round follows the last) or ended early.
  const currentRound = data.currentRound === totalRounds + 1 ? totalRounds + 1 : rounds.length + 1

  const draftBids = isDraftArray(data.draftBids, n, 1, cards) ? data.draftBids : Array(n).fill(null)
  const draftTricks = isDraftArray(data.draftTricks, n, 0, cards) ? data.draftTricks : Array(n).fill(null)
  const bidsComplete = draftBids.every((b) => b !== null)

  return {
    started: true,
    playerCount: n,
    players: players.map((p) => p.trim()),
    totalRounds,
    currentRound,
    rounds,
    dealerStart: Number.isInteger(data.dealerStart) && data.dealerStart >= 0 && data.dealerStart < n ? data.dealerStart : 0,
    phase: data.phase === 'tricks' && bidsComplete ? 'tricks' : 'bidding',
    draftBids,
    draftTricks,
    gameId: typeof data.gameId === 'string' && data.gameId ? data.gameId : newGameId(),
  }
}

export const createGameId = newGameId

/* ---------- Current game ---------- */

export const loadGame = () => sanitizeGame(read(GAME_KEY)) ?? sanitizeGame(read(LEGACY_GAME_KEY))

export const saveGame = (state) => write(GAME_KEY, state)

export const clearGame = () => {
  remove(GAME_KEY)
  remove(LEGACY_GAME_KEY)
}

/* ---------- Finished-game history ---------- */

export const sanitizeHistory = (data) => {
  if (!Array.isArray(data)) return []
  const entries = []
  for (const e of data) {
    if (!e || typeof e.id !== 'string' || !Array.isArray(e.players)) continue
    if (e.players.length < MIN_PLAYERS || e.players.length > MAX_PLAYERS) continue
    if (!e.players.every((p) => typeof p === 'string')) continue
    const rounds = sanitizeRounds(e.rounds, e.players.length)
    if (!rounds || rounds.length === 0) continue
    entries.push({
      id: e.id,
      finishedAt: Number.isFinite(e.finishedAt) ? e.finishedAt : Date.now(),
      players: e.players,
      totalRounds: Number.isInteger(e.totalRounds) ? e.totalRounds : rounds.length,
      rounds,
    })
  }
  return entries.slice(0, HISTORY_LIMIT)
}

export const loadHistory = () => sanitizeHistory(read(HISTORY_KEY))

export const saveHistory = (history) => write(HISTORY_KEY, history.slice(0, HISTORY_LIMIT))

/* ---------- Setup preferences (last used names etc.) ---------- */

export const loadPrefs = () => {
  const p = read(PREFS_KEY)
  if (!p || typeof p !== 'object') return null
  const names = Array.isArray(p.playerNames) ? p.playerNames.filter((n) => typeof n === 'string') : []
  if (!Number.isInteger(p.playerCount) || p.playerCount < MIN_PLAYERS || p.playerCount > MAX_PLAYERS) return null
  return {
    playerCount: p.playerCount,
    playerNames: names.length === p.playerCount ? names : null,
    totalRounds: Number.isInteger(p.totalRounds) ? p.totalRounds : null,
  }
}

export const savePrefs = (prefs) => write(PREFS_KEY, prefs)

/* ---------- Theme ---------- */

export const loadTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') return saved
    return 'dark'
  } catch {
    return 'dark'
  }
}

export const saveTheme = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (e) {
    console.warn('Failed to save theme', e)
  }
}
