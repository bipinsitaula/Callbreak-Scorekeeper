import { beforeEach, describe, expect, it, vi } from 'vitest'

// Minimal in-memory localStorage so the store's persistence can be exercised in node.
const makeStorage = () => {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
  }
}

let useGameStore
let storage

beforeEach(async () => {
  vi.resetModules()
  storage = makeStorage()
  vi.stubGlobal('localStorage', storage)
  ;({ useGameStore } = await import('./store'))
})

const play = (bids, tricks) => {
  const s = useGameStore.getState()
  bids.forEach((b, i) => s.setBid(i, b))
  expect(s.lockBids().ok).toBe(true)
  tricks.forEach((t, i) => useGameStore.getState().setTricks(i, t))
  return useGameStore.getState().submitRound()
}

describe('game flow', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(4, ['A', 'B', 'C', 'D'], 2, 0)
  })

  it('scores a round in tenths and advances', () => {
    expect(play([3, 2, 4, 1], [4, 2, 3, 4]).ok).toBe(true)
    const s = useGameStore.getState()
    expect(s.rounds[0].scores).toEqual([31, 20, -40, 13])
    expect(s.currentRound).toBe(2)
    expect(s.phase).toBe('bidding')
  })

  it('rejects tricks that do not total 13', () => {
    const s = useGameStore.getState()
    ;[3, 3, 3, 3].forEach((b, i) => s.setBid(i, b))
    s.lockBids()
    ;[3, 3, 3, 3].forEach((t, i) => useGameStore.getState().setTricks(i, t))
    const result = useGameStore.getState().submitRound()
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/must equal 13/)
    expect(useGameStore.getState().rounds).toHaveLength(0)
  })

  it('rejects total bids above 13', () => {
    [4, 4, 3, 3].forEach((b, i) => useGameStore.getState().setBid(i, b))
    expect(useGameStore.getState().lockBids().error).toMatch(/cannot exceed/)
  })

  it('will not lock bids until everyone has bid', () => {
    useGameStore.getState().setBid(0, 3)
    expect(useGameStore.getState().lockBids().ok).toBe(false)
  })

  it('undo reopens the last round with its entries', () => {
    play([3, 2, 4, 1], [4, 2, 3, 4])
    expect(useGameStore.getState().undoRound()).toBe(true)
    const s = useGameStore.getState()
    expect(s.rounds).toHaveLength(0)
    expect(s.currentRound).toBe(1)
    expect(s.draftBids).toEqual([3, 2, 4, 1])
    expect(s.phase).toBe('tricks')
  })

  it('restores bids and phase after a refresh', async () => {
    const s = useGameStore.getState()
    ;[3, 2, 4, 1].forEach((b, i) => s.setBid(i, b))
    s.lockBids()

    vi.resetModules()
    const { useGameStore: fresh } = await import('./store')
    fresh.getState().hydrate()
    expect(fresh.getState().phase).toBe('tricks')
    expect(fresh.getState().draftBids).toEqual([3, 2, 4, 1])
  })
})

describe('history', () => {
  it('archives a finished game and removes it again on undo', () => {
    useGameStore.getState().initializeGame(4, ['A', 'B', 'C', 'D'], 1, 0)
    play([3, 2, 4, 1], [4, 2, 3, 4])
    expect(useGameStore.getState().history).toHaveLength(1)

    useGameStore.getState().undoRound()
    expect(useGameStore.getState().history).toHaveLength(0)
  })
})

describe('loading saved data', () => {
  it('ignores corrupt saves instead of crashing', () => {
    storage.setItem('callBreakScorekeeper_v2', '{"started":true,"players":["A"],"totalRounds":"x"}')
    useGameStore.getState().hydrate()
    expect(useGameStore.getState().started).toBe(false)
  })

  it('migrates a v1 save (float scores) to integer tenths', () => {
    storage.setItem(
      'callBreakScorekeeper_v1',
      JSON.stringify({
        started: true,
        playerCount: 4,
        players: ['A', 'B', 'C', 'D'],
        totalRounds: 13,
        currentRound: 2,
        rounds: [{ bids: [3, 2, 4, 1], tricks: [4, 2, 3, 4], scores: [3.1, 2, -4, 1.3] }],
      })
    )
    useGameStore.getState().hydrate()
    const s = useGameStore.getState()
    expect(s.started).toBe(true)
    expect(s.rounds[0].scores).toEqual([31, 20, -40, 13])
  })
})
