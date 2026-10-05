import { create } from 'zustand'
import {
  computeScores,
  getCardsPerPlayer,
  getMaxBid,
  isGameComplete,
  validateBids,
  validateTricks,
} from './utils/helpers'
import * as storage from './utils/storage'

const DEFAULT_ROUNDS = 5

const blankGame = () => ({
  started: false,
  playerCount: 4,
  players: [],
  totalRounds: DEFAULT_ROUNDS,
  currentRound: 1,
  rounds: [],
  dealerStart: 0,
  phase: 'bidding', // 'bidding' -> 'tricks' -> (submit) -> next round's 'bidding'
  draftBids: [],
  draftTricks: [],
  gameId: null,
})

const emptyDraft = (n) => Array(n).fill(null)

const gameSnapshot = (s) => ({
  started: s.started,
  playerCount: s.playerCount,
  players: s.players,
  totalRounds: s.totalRounds,
  currentRound: s.currentRound,
  rounds: s.rounds,
  dealerStart: s.dealerStart,
  phase: s.phase,
  draftBids: s.draftBids,
  draftTricks: s.draftTricks,
  gameId: s.gameId,
})

const VIEW_SECTION = {
  hub: 'hub',
  setup: 'callbreak',
  play: 'callbreak',
  leaderboard: 'callbreak',
  blackjack: 'blackjack',
  record: 'blackjack',
}

const ok = { ok: true, error: null }
const fail = (error) => ({ ok: false, error })

/**
 * Game state. Bids/tricks for the round in progress live here (not in
 * component state) so they survive refreshes. Scores are integer tenths.
 */
export const useGameStore = create((set, get) => ({
  ...blankGame(),
  history: [],
  prefs: null,
  theme: 'dark',
  // Screens (not persisted): 'hub' | 'setup' | 'play' | 'leaderboard' | 'blackjack' | 'record' | 'settings'.
  // `section` is the game the sidebar shows; Settings keeps whichever section you came from.
  view: 'hub',
  section: 'hub',

  setView: (view) => set((s) => ({ view, section: VIEW_SECTION[view] ?? s.section })),

  resultsOpen: true, // game-over dialog; closing it leaves a "Show results" button
  setResultsOpen: (resultsOpen) => set({ resultsOpen }),

  /* ---------- Persistence ---------- */

  // Saves the game and keeps the finished-games history in sync with it.
  persist: () => {
    const s = get()
    storage.saveGame(gameSnapshot(s))

    const finished = s.started && s.rounds.length > 0 && isGameComplete(s.currentRound, s.totalRounds)
    const existing = s.history.find((h) => h.id === s.gameId)
    let history = s.history
    if (finished) {
      const entry = {
        id: s.gameId,
        finishedAt: existing?.finishedAt ?? Date.now(),
        players: s.players,
        totalRounds: s.totalRounds,
        rounds: s.rounds,
      }
      history = existing
        ? s.history.map((h) => (h.id === s.gameId ? entry : h))
        : [entry, ...s.history].slice(0, storage.HISTORY_LIMIT)
    } else if (existing) {
      history = s.history.filter((h) => h.id !== s.gameId)
    }
    if (history !== s.history) {
      set({ history })
      storage.saveHistory(history)
    }
  },

  hydrate: () => {
    const game = storage.loadGame()
    set({
      theme: storage.loadTheme(),
      history: storage.loadHistory(),
      prefs: storage.loadPrefs(),
      ...(game ?? {}),
      view: 'hub',
      section: 'hub',
    })
  },

  /* ---------- Game lifecycle ---------- */

  initializeGame: (playerCount, players, totalRounds, dealerStart = 0) => {
    set({
      ...blankGame(),
      started: true,
      playerCount,
      players,
      totalRounds,
      dealerStart,
      draftBids: emptyDraft(playerCount),
      draftTricks: emptyDraft(playerCount),
      gameId: storage.createGameId(),
      view: 'play',
      section: 'callbreak',
    })
    storage.savePrefs({ playerCount, playerNames: players, totalRounds })
    set({ prefs: { playerCount, playerNames: players, totalRounds } })
    get().persist()
  },

  resetGame: () => {
    set({ ...blankGame(), view: 'setup', section: 'callbreak' })
    storage.clearGame()
  },

  /* ---------- Round entry ---------- */

  setBid: (index, value) => {
    const draftBids = [...get().draftBids]
    draftBids[index] = value
    set({ draftBids })
    get().persist()
  },

  setTricks: (index, value) => {
    const draftTricks = [...get().draftTricks]
    draftTricks[index] = value
    set({ draftTricks })
    get().persist()
  },

  lockBids: () => {
    const { players, playerCount, draftBids } = get()
    const error = validateBids(draftBids, {
      players,
      maxBid: getMaxBid(playerCount),
      maxTotal: getCardsPerPlayer(playerCount),
    })
    if (error) return fail(error)
    set({ phase: 'tricks' })
    get().persist()
    return ok
  },

  unlockBids: () => {
    set({ phase: 'bidding' })
    get().persist()
  },

  submitRound: () => {
    const s = get()
    const bidError = validateBids(s.draftBids, {
      players: s.players,
      maxBid: getMaxBid(s.playerCount),
      maxTotal: getCardsPerPlayer(s.playerCount),
    })
    if (bidError) return fail(bidError)
    const trickError = validateTricks(s.draftTricks, {
      players: s.players,
      cards: getCardsPerPlayer(s.playerCount),
    })
    if (trickError) return fail(trickError)

    const round = {
      bids: s.draftBids,
      tricks: s.draftTricks,
      scores: computeScores(s.draftBids, s.draftTricks),
    }
    set({
      rounds: [...s.rounds, round],
      currentRound: s.currentRound + 1,
      phase: 'bidding',
      draftBids: emptyDraft(s.playerCount),
      draftTricks: emptyDraft(s.playerCount),
    })
    get().persist()
    return ok
  },

  // Removes the last round but reopens its entries so they can be corrected.
  undoRound: () => {
    const s = get()
    if (s.rounds.length === 0) return false
    const last = s.rounds[s.rounds.length - 1]
    const rounds = s.rounds.slice(0, -1)
    set({
      rounds,
      currentRound: rounds.length + 1,
      phase: 'tricks',
      draftBids: last.bids,
      draftTricks: last.tricks,
    })
    get().persist()
    return true
  },

  editRound: (roundIndex, bids, tricks) => {
    const s = get()
    if (!s.rounds[roundIndex]) return
    const rounds = [...s.rounds]
    rounds[roundIndex] = { bids, tricks, scores: computeScores(bids, tricks) }
    set({ rounds })
    get().persist()
  },

  endGameEarly: () => {
    set({ currentRound: get().totalRounds + 1, phase: 'bidding' })
    get().persist()
  },

  /* ---------- History ---------- */

  deleteHistoryEntry: (id) => {
    const history = get().history.filter((h) => h.id !== id)
    set({ history })
    storage.saveHistory(history)
  },

  clearHistory: () => {
    set({ history: [] })
    storage.saveHistory([])
  },

  /* ---------- Theme ---------- */

  setTheme: (theme) => {
    set({ theme })
    storage.saveTheme(theme)
  },

  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))
