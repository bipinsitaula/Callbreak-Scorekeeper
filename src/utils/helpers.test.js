import { describe, expect, it } from 'vitest'
import {
  calculateScore,
  computeScores,
  formatScore,
  getBidOrder,
  getDealerIndex,
  getLeaders,
  getMaxBid,
  getPlayerStats,
  rankPlayers,
  sumScores,
  validateBids,
  validateTricks,
} from './helpers'

describe('calculateScore (tenths of a point)', () => {
  it('awards the bid plus 0.1 per overtrick', () => {
    expect(calculateScore(3, 3)).toBe(30)
    expect(calculateScore(3, 4)).toBe(31)
    expect(calculateScore(3, 6)).toBe(33)
  })

  it('loses the full bid when short', () => {
    expect(calculateScore(3, 2)).toBe(-30)
    expect(calculateScore(5, 0)).toBe(-50)
  })

  it('has no floating-point drift when summing overtricks', () => {
    const rounds = Array.from({ length: 10 }, () => ({ scores: [calculateScore(1, 2)] }))
    expect(sumScores(rounds, 1)).toEqual([110]) // 11.0 exactly, not 11.000000000000002
  })
})

describe('formatScore', () => {
  it('formats tenths with a sign', () => {
    expect(formatScore(31)).toBe('+3.1')
    expect(formatScore(0)).toBe('+0.0')
    expect(formatScore(-30)).toBe('−3.0')
  })
})

describe('rankPlayers / getLeaders', () => {
  it('gives tied players the same rank and skips the next', () => {
    const ranked = rankPlayers(['A', 'B', 'C', 'D'], [50, 50, 20, -10])
    expect(ranked.map((r) => [r.name, r.rank])).toEqual([
      ['A', 1],
      ['B', 1],
      ['C', 3],
      ['D', 4],
    ])
  })

  it('returns every leader on a tie', () => {
    expect(getLeaders([10, 30, 30])).toEqual([1, 2])
    expect(getLeaders([])).toEqual([])
  })
})

describe('dealer rotation', () => {
  it('rotates one seat per round and wraps around', () => {
    expect(getDealerIndex(2, 1, 4)).toBe(2)
    expect(getDealerIndex(2, 2, 4)).toBe(3)
    expect(getDealerIndex(2, 3, 4)).toBe(0)
  })

  it('bids start left of the dealer and end with the dealer', () => {
    expect(getBidOrder(3, 4)).toEqual([0, 1, 2, 3])
    expect(getBidOrder(1, 4)).toEqual([2, 3, 0, 1])
  })
})

describe('bid range', () => {
  it('caps bids at 13 whatever the deal size', () => {
    expect(getMaxBid(2)).toBe(13)
    expect(getMaxBid(3)).toBe(13)
    expect(getMaxBid(4)).toBe(13)
    expect(getMaxBid(5)).toBe(10)
  })
})

describe('validation', () => {
  const players = ['A', 'B', 'C', 'D']

  it('rejects missing and out-of-range bids', () => {
    expect(validateBids([1, 2, 3, null], { players, maxBid: 13 })).toMatch(/Enter a bid for D/)
    expect(validateBids([1, 2, 3, 14], { players, maxBid: 13 })).toMatch(/Invalid bid for D/)
    expect(validateBids([1, 2, 3, 0], { players, maxBid: 13 })).toMatch(/Invalid bid for D/)
    expect(validateBids([1, 2, 3, 13], { players, maxBid: 13 })).toBeNull()
  })

  it('caps the total of all bids at the tricks available', () => {
    const opts = { players, maxBid: 13, maxTotal: 13 }
    expect(validateBids([4, 3, 3, 3], opts)).toBeNull()
    expect(validateBids([4, 4, 3, 3], opts)).toMatch(/Total bids \(14\) cannot exceed the 13/)
  })

  it('requires tricks to total the cards dealt', () => {
    expect(validateTricks([3, 3, 3, 3], { players, cards: 13 })).toMatch(/must equal 13 \(currently 12\)/)
    expect(validateTricks([4, 3, 3, 3], { players, cards: 13 })).toBeNull()
    expect(validateTricks([4, 3, 3, null], { players, cards: 13 })).toMatch(/Enter tricks won for D/)
  })
})

describe('getPlayerStats', () => {
  it('summarises bidding accuracy', () => {
    // Each entry is one round: [A, B]
    const bids = [[3, 4], [2, 2]]
    const tricks = [[3, 2], [4, 2]]
    const rounds = bids.map((b, i) => ({ bids: b, tricks: tricks[i], scores: computeScores(b, tricks[i]) }))
    const [a, b] = getPlayerStats(['A', 'B'], rounds)
    // A: exact 3/3 (+3.0), then 4 tricks on a bid of 2 (+2.2)
    expect(a).toMatchObject({ made: 2, exact: 1, overtricks: 2, total: 52, successRate: 100 })
    // B: missed 2/4 (-4.0), then exact 2/2 (+2.0)
    expect(b).toMatchObject({ made: 1, exact: 1, overtricks: 0, total: -20, successRate: 50 })
  })
})
