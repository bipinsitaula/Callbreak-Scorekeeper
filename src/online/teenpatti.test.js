import { describe, expect, it } from 'vitest'
import { addBot, joinRoom } from './engine'
import {
  BOOT,
  MAX_STAKE,
  START_CHIPS,
  allIn,
  chaal,
  compareHands,
  costs,
  createTeenPattiState,
  endTeenPatti,
  handName,
  handRank,
  isTeenPattiBotTurn,
  nextHand,
  options,
  pack,
  raise,
  restartTeenPatti,
  seeCards,
  setTotalHands,
  show,
  startTeenPatti,
  teenPattiBotMove,
} from './teenpatti'

const c = (rank, suit = 'spades') => ({ id: `${suit}-${rank}`, rank, suit })
const h = (...specs) => specs.map(([r, s]) => c(r, s))
const zero = () => 0

const table = (n = 3) =>
  ['Bo', 'Cy', 'Di', 'Ed', 'Fa'].slice(0, n - 1).reduce((s, name, i) => joinRoom(s, { id: `p${i + 1}`, name }), createTeenPattiState({ id: 'p0', name: 'Al' }))

const total = (s) => s.chips.reduce((a, b) => a + b, 0) + s.pot

describe('hand rankings', () => {
  const trail = h(['A', 'spades'], ['A', 'hearts'], ['A', 'clubs'])
  const pure = h(['Q', 'hearts'], ['K', 'hearts'], ['A', 'hearts'])
  const seq = h(['4', 'hearts'], ['5', 'clubs'], ['6', 'spades'])
  const color = h(['2', 'diamonds'], ['9', 'diamonds'], ['K', 'diamonds'])
  const pair = h(['8', 'hearts'], ['8', 'clubs'], ['3', 'spades'])
  const high = h(['A', 'hearts'], ['10', 'clubs'], ['3', 'spades'])

  it('orders the categories', () => {
    const ordered = [trail, pure, seq, color, pair, high]
    for (let i = 0; i < ordered.length - 1; i++) expect(compareHands(ordered[i], ordered[i + 1])).toBeGreaterThan(0)
    expect(ordered.map(handName)).toEqual(['Trail', 'Pure sequence', 'Sequence', 'Color', 'Pair', 'High card'])
  })

  it('A-K-Q is the best sequence, A-2-3 the second, then K-Q-J', () => {
    const akq = h(['A', 'hearts'], ['K', 'clubs'], ['Q', 'spades'])
    const a23 = h(['A', 'hearts'], ['2', 'clubs'], ['3', 'spades'])
    const kqj = h(['K', 'hearts'], ['Q', 'clubs'], ['J', 'spades'])
    expect(compareHands(akq, a23)).toBeGreaterThan(0)
    expect(compareHands(a23, kqj)).toBeGreaterThan(0)
    expect(handRank(h(['Q', 'hearts'], ['K', 'clubs'], ['A', 'spades']))).toEqual(handRank(akq))
  })

  it('A-A-A is the best trail; pairs compare pair then kicker', () => {
    expect(compareHands(trail, h(['K', 'spades'], ['K', 'hearts'], ['K', 'clubs']))).toBeGreaterThan(0)
    expect(compareHands(h(['8', 'hearts'], ['8', 'clubs'], ['K', 'spades']), pair)).toBeGreaterThan(0)
    expect(compareHands(h(['9', 'hearts'], ['9', 'clubs'], ['2', 'spades']), pair)).toBeGreaterThan(0)
    expect(compareHands(pair, h(['8', 'diamonds'], ['8', 'spades'], ['3', 'hearts']))).toBe(0)
  })

  it('a non-consecutive set is not a sequence', () => {
    expect(handName(h(['A', 'hearts'], ['K', 'clubs'], ['2', 'spades']))).toBe('High card')
  })
})

describe('a hand', () => {
  it('everyone pays the boot and gets three cards', () => {
    const s = startTeenPatti(table(3), 'p0', zero)
    expect(s.status).toBe('betting')
    expect(s.cards.map((x) => x.length)).toEqual([3, 3, 3])
    expect(s.pot).toBe(BOOT * 3)
    expect(s.chips).toEqual([START_CHIPS - BOOT, START_CHIPS - BOOT, START_CHIPS - BOOT])
    expect(s.turn).toBe(1) // left of the dealer (seat 0)
    expect(s.gameId).toMatch(/^[a-z0-9]{16}$/)
  })

  it('blind pays the stake, seen pays double, raise doubles the stake', () => {
    let s = startTeenPatti(table(3), 'p0', zero)
    expect(costs(s, 1)).toEqual({ call: BOOT, raise: BOOT * 2 })
    s = chaal(s, 'p1')
    expect(s.chips[1]).toBe(START_CHIPS - BOOT * 2)
    s = seeCards(s, 'p2')
    expect(s.turn).toBe(2) // seeing doesn't use the turn
    expect(costs(s, 2).call).toBe(BOOT * 2)
    s = raise(s, 'p2')
    expect(s.stake).toBe(BOOT * 2)
    expect(s.bets[2]).toBe(BOOT + BOOT * 4)
    expect(costs(s, 0).call).toBe(BOOT * 2) // blind, at the new stake
    expect(total(s)).toBe(START_CHIPS * 3)
  })

  it('packing down to one player gives them the pot', () => {
    let s = startTeenPatti(table(3), 'p0', zero)
    s = pack(s, 'p1')
    s = pack(s, 'p2')
    expect(s.status).toBe('handEnd')
    expect(s.result.winners).toEqual([0])
    expect(s.result.shown).toEqual({})
    expect(s.chips[0]).toBe(START_CHIPS + BOOT * 2)
    expect(total(s)).toBe(START_CHIPS * 3)
  })

  it('a show compares the last two hands; the asker loses a tie', () => {
    let s = startTeenPatti(table(2), 'p0', zero)
    s.cards = [h(['2', 'hearts'], ['5', 'clubs'], ['9', 'spades']), h(['K', 'hearts'], ['K', 'clubs'], ['4', 'spades'])]
    s = show(s, 'p1') // seat 1 (pair of kings) asks
    expect(s.result.winners).toEqual([1])
    expect(Object.keys(s.result.shown)).toEqual(['0', '1'])

    let t = startTeenPatti(table(2), 'p0', zero)
    t.cards = [h(['8', 'hearts'], ['8', 'clubs'], ['3', 'spades']), h(['8', 'diamonds'], ['8', 'spades'], ['3', 'hearts'])]
    t = show(t, 'p1')
    expect(t.result.winners).toEqual([0])
  })

  it('show needs exactly two players left', () => {
    const s = startTeenPatti(table(3), 'p0', zero)
    expect(() => show(s, 'p1')).toThrow(/two players/)
    expect(options(s, 1).show).toBe(false)
  })

  it('stops raising at the cap', () => {
    let s = startTeenPatti(table(2), 'p0', zero)
    s.stake = MAX_STAKE
    expect(costs(s, s.turn).raise).toBeNull()
    expect(() => raise(s, `p${s.turn}`)).toThrow(/limit/)
  })

  it('all in when short: every hand left is shown and the best takes the pot', () => {
    let s = startTeenPatti(table(3), 'p0', zero)
    s.chips[1] = 5
    s.cards = [h(['A', 'hearts'], ['A', 'clubs'], ['2', 'spades']), h(['K', 'hearts'], ['K', 'clubs'], ['K', 'spades']), h(['3', 'hearts'], ['7', 'clubs'], ['9', 'spades'])]
    expect(options(s, 1).allIn).toBe(true)
    expect(() => chaal(s, 'p1')).toThrow(/all in/)
    const before = total(s)
    s = allIn(s, 'p1')
    expect(s.result.winners).toEqual([1])
    expect(s.chips[1]).toBe(before - s.chips[0] - s.chips[2])
    expect(total(s)).toBe(before)
  })

  it('only the player whose turn it is can bet', () => {
    const s = startTeenPatti(table(3), 'p0', zero)
    expect(() => chaal(s, 'p2')).toThrow(/turn/)
    expect(() => seeCards(s, 'stranger')).toThrow(/seated/)
  })
})

describe('the game', () => {
  it('rotates the deal and finishes after the set number of hands', () => {
    let s = startTeenPatti(setTotalHands(table(2), 'p0', 5), 'p0', zero)
    for (let hand = 1; hand <= 5; hand++) {
      expect(s.hand).toBe(hand)
      s = pack(s, `p${s.turn}`)
      if (hand < 5) {
        expect(s.status).toBe('handEnd')
        const dealer = s.dealer
        s = nextHand(s, 'p1', zero)
        expect(s.dealer).toBe((dealer + 1) % 2)
      }
    }
    expect(s.status).toBe('finished')
    expect(s.rounds).toHaveLength(5)
    expect(s.chips.reduce((a, b) => a + b, 0)).toBe(START_CHIPS * 2)
  })

  it('ends when only one player can afford the boot', () => {
    let s = startTeenPatti(table(2), 'p0', zero)
    s.chips = [0, s.chips[1] + s.chips[0]]
    s = pack(s, 'p1') // seat 0 wins the 20-chip pot, still has enough
    expect(s.status).toBe('handEnd')
    s.chips = [5, START_CHIPS * 2 - 5]
    s = nextHand(s, 'p0', zero)
    expect(s.status).toBe('finished')
  })

  it('host can end (refunding the open hand) or restart', () => {
    let s = startTeenPatti(table(2), 'p0', zero)
    expect(endTeenPatti(s, 'p0').status).toBe('lobby') // nothing finished yet
    s = nextHand(pack(s, `p${s.turn}`), 'p0', zero)
    s = chaal(s, `p${s.turn}`)
    const ended = endTeenPatti(s, 'p0')
    expect(ended.status).toBe('finished')
    expect(ended.endedEarly).toBe(true)
    expect(ended.chips.reduce((a, b) => a + b, 0)).toBe(START_CHIPS * 2)
    expect(() => endTeenPatti(s, 'p1')).toThrow(/host/)
    const again = restartTeenPatti(ended, 'p0', zero)
    expect(again.hand).toBe(1)
    expect(again.rounds).toEqual([])
  })

  it('six seats, and bots play whole games to the end', () => {
    let s = createTeenPattiState({ id: 'p0', name: 'Al' }, 5)
    for (let i = 0; i < 5; i++) s = addBot(s, 'p0')
    expect(() => addBot(s, 'p0')).toThrow(/full/)
    s = startTeenPatti(s, 'p0')
    let guard = 0
    while (s.status !== 'finished' && guard++ < 2000) {
      if (s.status === 'handEnd') s = nextHand(s, 'p0')
      else if (isTeenPattiBotTurn(s)) s = teenPattiBotMove(s, 'p0')
      else s = options(s, 0).chaal ? chaal(s, 'p0') : pack(s, 'p0')
      expect(total(s)).toBe(START_CHIPS * 6)
    }
    expect(s.status).toBe('finished')
  })
})
