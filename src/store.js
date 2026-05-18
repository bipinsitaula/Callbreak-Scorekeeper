import { create } from 'zustand'

const STORAGE_KEY = 'callBreakScorekeeper_v1'
const THEME_KEY = 'callBreakTheme'

/**
 * Game state management with Zustand
 * Preserves all original functionality and data structures
 */
export const useGameStore = create((set, get) => ({
    // Game state
    started: false,
    playerCount: 4,
    players: [],
    totalRounds: 13,
    currentRound: 1,
    rounds: [],

    // Theme
    theme: 'light',

    // Actions
    initializeGame: (playerCount, playerNames, totalRounds) => {
      const newState = {
        started: true,
        playerCount,
        players: playerNames,
        totalRounds,
        currentRound: 1,
        rounds: [],
      }
      set(newState)
      get().saveState()
    },

    resetGame: () => {
      const resetState = {
        started: false,
        playerCount: 4,
        players: [],
        totalRounds: 13,
        currentRound: 1,
        rounds: [],
      }
      set(resetState)
      get().clearStorage()
    },

    submitRound: (bids, tricks) => {
      const state = get()
      const scores = bids.map((bid, i) => {
        if (tricks[i] >= bid) {
          return bid + (tricks[i] - bid) * 0.1
        }
        return -bid
      })
      
      const updatedRounds = [...state.rounds, { bids, tricks, scores }]
      set({
        rounds: updatedRounds,
        currentRound: state.currentRound + 1,
      })
      get().saveState()
    },

    undoRound: () => {
      const state = get()
      if (state.rounds.length === 0) return
      
      const updatedRounds = state.rounds.slice(0, -1)
      set({
        rounds: updatedRounds,
        currentRound: state.rounds.length,
      })
      get().saveState()
    },

    editRound: (roundIndex, bids, tricks) => {
      const state = get()
      const scores = bids.map((bid, i) => {
        if (tricks[i] >= bid) {
          return bid + (tricks[i] - bid) * 0.1
        }
        return -bid
      })

      const updatedRounds = [...state.rounds]
      updatedRounds[roundIndex] = { bids, tricks, scores }
      set({ rounds: updatedRounds })
      get().saveState()
    },

    endGameEarly: () => {
      const state = get()
      set({ currentRound: state.totalRounds + 1 })
      get().saveState()
    },

    setTheme: (theme) => {
      set({ theme })
      localStorage.setItem(THEME_KEY, theme)
    },

    toggleTheme: () => {
      const state = get()
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      get().setTheme(newTheme)
    },

    getTotals: () => {
      const state = get()
      const totals = state.players.map(() => 0)
      state.rounds.forEach(round => {
        round.scores.forEach((score, i) => {
          totals[i] += score
        })
      })
      return totals.map(t => Math.round(t * 10) / 10)
    },

    getLeader: () => {
      const totals = get().getTotals()
      if (totals.length === 0) return -1
      return totals.indexOf(Math.max(...totals))
    },

    saveState: () => {
      try {
        const state = get()
        const saveData = {
          started: state.started,
          playerCount: state.playerCount,
          players: state.players,
          totalRounds: state.totalRounds,
          currentRound: state.currentRound,
          rounds: state.rounds,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData))
      } catch (e) {
        console.warn('Failed to save game state', e)
      }
    },

    loadState: () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) return false
        
        const data = JSON.parse(saved)
        if (data && data.started) {
          set(data)
          return true
        }
      } catch (e) {
        console.warn('Failed to load game state', e)
      }
      return false
    },

    clearStorage: () => {
      localStorage.removeItem(STORAGE_KEY)
    },

    loadTheme: () => {
      const saved = localStorage.getItem(THEME_KEY) || 'light'
      set({ theme: saved })
    },
  }))
