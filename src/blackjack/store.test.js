import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = () => {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}

let useBlackjackStore

const card = (rank, suit = 'spades') => ({ id: `${rank}${suit}${Math.random()}`, rank, suit })

/** Put cards on top of the shoe in the order they will be dealt. */
const rig = (...ranks) => {
  const filler = Array.from({ length: 200 }, () => card('2', 'clubs'))
  const shoe = [...filler, ...ranks.map((r) => card(r)).reverse()]
  useBlackjackStore.setState({ shoe })
}

// Deal order is player, dealer up, player, dealer hole, then draws.
const deal = (bet = 100) => {
  useBlackjackStore.getState().setBet(bet)
  expect(useBlackjackStore.getState().deal()).toBe(true)
}

const run = async () => {
  // Finish the dealer's turn instantly.
  for (let i = 0; i < 20 && useBlackjackStore.getState().phase === 'dealer'; i++) {
    useBlackjackStore.getState().dealerStep()
  }
}

beforeEach(async () => {
  vi.resetModules()
  vi.stubGlobal('localStorage', memory())
  ;({ useBlackjackStore } = await import('./store'))
})

describe('betting', () => {
  it('takes the bet when the cards are dealt', () => {
    rig('10', '9', '8', '7')
    deal(100)
    expect(useBlackjackStore.getState().bankroll).toBe(900)
    expect(useBlackjackStore.getState().phase).toBe('player')
  })

  it('refuses to deal below the minimum or above the bankroll', () => {
    useBlackjackStore.getState().setBet(0)
    expect(useBlackjackStore.getState().deal()).toBe(false)
    useBlackjackStore.getState().setBet(99999)
    expect(useBlackjackStore.getState().bet).toBe(1000) // capped at the bankroll
  })
})

describe('a round', () => {
  it('pays 3:2 on a natural and ends immediately', () => {
    rig('A', '9', 'K', '7') // player A K, dealer 9 7
    deal(100)
    const s = useBlackjackStore.getState()
    expect(s.phase).toBe('settled')
    expect(s.result.outcomes).toEqual(['blackjack'])
    expect(s.bankroll).toBe(1150)
  })

  it('loses the bet to a dealer natural when insurance is declined', () => {
    rig('10', 'A', '9', 'K') // player 19, dealer A K
    deal(100)
    expect(useBlackjackStore.getState().phase).toBe('insurance')
    useBlackjackStore.getState().resolveInsurance(false)
    const s = useBlackjackStore.getState()
    expect(s.phase).toBe('settled')
    expect(s.bankroll).toBe(900)
  })

  it('pays insurance 2:1 when the dealer has blackjack (net zero on an even-money loss)', () => {
    rig('10', 'A', '9', 'K')
    deal(100)
    expect(useBlackjackStore.getState().insuranceCost()).toBe(50)
    useBlackjackStore.getState().resolveInsurance(true)
    const s = useBlackjackStore.getState()
    expect(s.phase).toBe('settled')
    expect(s.result.insurance).toEqual({ bet: 50, paid: true })
    expect(s.bankroll).toBe(1000) // lost 100, insurance returned 150 on a 50 stake
  })

  it('loses the insurance stake when the dealer has no blackjack, and play continues', () => {
    rig('10', 'A', '9', '6') // dealer A 6 = soft 17
    deal(100)
    useBlackjackStore.getState().resolveInsurance(true)
    const s = useBlackjackStore.getState()
    expect(s.phase).toBe('player')
    expect(s.bankroll).toBe(850) // 100 bet + 50 insurance taken
    useBlackjackStore.getState().stand()
  })

  it('offers insurance only against an ace', () => {
    rig('10', '9', '8', '7')
    deal(100)
    expect(useBlackjackStore.getState().phase).toBe('player')
  })

  it('surrender returns half the bet and ends the round', () => {
    rig('10', '10', '6', '7') // player 16 vs dealer 10
    deal(100)
    expect(useBlackjackStore.getState().canSurrender()).toBe(true)
    useBlackjackStore.getState().surrender()
    const s = useBlackjackStore.getState()
    expect(s.phase).toBe('settled')
    expect(s.result.outcomes).toEqual(['surrender'])
    expect(s.bankroll).toBe(950)
    expect(s.stats.surrenders).toBe(1)
  })

  it('cannot surrender after hitting', () => {
    rig('10', '10', '2', '7', '2')
    deal(100)
    useBlackjackStore.getState().hit()
    expect(useBlackjackStore.getState().canSurrender()).toBe(false)
  })

  it('busts the player and skips the dealer draw', async () => {
    rig('10', '9', '6', '7', 'K') // player 16 hits a K
    deal(100)
    useBlackjackStore.getState().hit()
    await run()
    const s = useBlackjackStore.getState()
    expect(s.phase).toBe('settled')
    expect(s.result.outcomes).toEqual(['bust'])
    expect(s.dealer.cards).toHaveLength(2)
    expect(s.bankroll).toBe(900)
  })

  it('stands, dealer draws to 17, and the player wins', async () => {
    rig('10', '6', '9', '10', 'K') // player 19, dealer 16 must draw a K and busts
    deal(100)
    useBlackjackStore.getState().stand()
    await run()
    const s = useBlackjackStore.getState()
    expect(s.result.outcomes).toEqual(['win'])
    expect(s.bankroll).toBe(1100)
  })

  it('doubles: one card, doubled stake', async () => {
    rig('5', '6', '6', '10', '10', '9') // player 11, dealer 16; double draws a 10 -> 21
    deal(100)
    expect(useBlackjackStore.getState().canDouble()).toBe(true)
    useBlackjackStore.getState().double()
    await run()
    const s = useBlackjackStore.getState()
    expect(s.hands[0].bet).toBe(200)
    expect(s.hands[0].cards).toHaveLength(3)
    expect(s.result.net).toBe(200) // dealer drew a 9 -> 25 bust, player wins 2 x 100
    expect(s.bankroll).toBe(1200)
  })

  it('splits a pair into two hands with their own stake', async () => {
    rig('8', '10', '8', '7', '3', '10') // player 8 8 vs dealer 10 7; draws 3 then 10
    deal(100)
    expect(useBlackjackStore.getState().canSplit()).toBe(true)
    useBlackjackStore.getState().split()
    const s = useBlackjackStore.getState()
    expect(s.hands).toHaveLength(2)
    expect(s.bankroll).toBe(800)
    expect(s.hands.every((h) => h.fromSplit)).toBe(true)
    // can only split once per round
    expect(useBlackjackStore.getState().canSplit()).toBe(false)
  })

  it('gives split aces one card each', () => {
    rig('A', '10', 'A', '7', '9', '5')
    deal(100)
    useBlackjackStore.getState().split()
    const s = useBlackjackStore.getState()
    expect(s.hands.every((h) => h.cards.length === 2 && h.done)).toBe(true)
    expect(['dealer', 'settled']).toContain(s.phase)
  })
})

describe('records and persistence', () => {
  it('records stats and a hand log, and saves the bankroll', async () => {
    rig('A', '9', 'K', '7')
    deal(100)
    const s = useBlackjackStore.getState()
    expect(s.stats).toMatchObject({ rounds: 1, hands: 1, wins: 1, blackjacks: 1, net: 150 })
    expect(s.log).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('cardTableBlackjack_v1')).bankroll).toBe(1150)
  })

  it('forfeits an unfinished hand on refresh', async () => {
    rig('10', '9', '6', '7')
    deal(100)
    vi.resetModules()
    const { useBlackjackStore: fresh } = await import('./store')
    fresh.getState().hydrate()
    expect(fresh.getState().bankroll).toBe(900)
    expect(fresh.getState().phase).toBe('betting')
  })

  it('ignores corrupt saved data', async () => {
    localStorage.setItem('cardTableBlackjack_v1', '{"bankroll":"lots"}')
    useBlackjackStore.getState().hydrate()
    expect(useBlackjackStore.getState().bankroll).toBe(1000)
  })

  it('rebuy restores the bankroll and counts it', () => {
    useBlackjackStore.setState({ bankroll: 0 })
    useBlackjackStore.getState().rebuy()
    expect(useBlackjackStore.getState().bankroll).toBe(1000)
    expect(useBlackjackStore.getState().stats.rebuys).toBe(1)
  })
})
