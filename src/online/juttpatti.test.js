import { describe, expect, it } from 'vitest'
import { addBot, joinRoom } from './engine'
import {
  HAND_SIZE,
  WIN_POINTS,
  countPairs,
  createJutPattiState,
  declare,
  discardCard,
  drawPile,
  drawStock,
  endJutPatti,
  findPairs,
  isJutPattiBotTurn,
  jokerRankFor,
  jutPattiBotMove,
  nextRound,
  options,
  playTurn,
  restartJutPatti,
  setTotalRounds,
  startJutPatti,
  totalScores,
} from './juttpatti'

const c = (rank, suit = 'spades') => ({ id: `${suit}-${rank}`, rank, suit })
const zero = () => 0

const table = (n = 3) =>
  ['Bo', 'Cy', 'Di'].slice(0, n - 1).reduce((s, name, i) => joinRoom(s, { id: `p${i + 1}`, name }), createJutPattiState({ id: 'p0', name: 'Al' }))

const started = (n = 3) => startJutPatti(table(n), 'p0', zero)

describe('joker rank', () => {
  it('is one rank above the turned-up card, with K -> A and A -> 2', () => {
    expect(jokerRankFor(c('7'))).toBe('8')
    expect(jokerRankFor(c('10'))).toBe('J')
    expect(jokerRankFor(c('K'))).toBe('A')
    expect(jokerRankFor(c('A'))).toBe('2')
  })
})

describe('pairs', () => {
  it('pairs cards of the same rank regardless of suit', () => {
    expect(countPairs([c('8', 'spades'), c('8', 'hearts'), c('3')], 'Q')).toBe(1)
  })

  it('lets a joker pair with a single, and two jokers pair together', () => {
    expect(countPairs([c('Q', 'hearts'), c('5')], 'Q')).toBe(1)
    expect(countPairs([c('Q', 'hearts'), c('Q', 'spades')], 'Q')).toBe(1)
  })

  it('does not waste a joker on a card that already has a partner', () => {
    const cards = [c('8', 'spades'), c('8', 'hearts'), c('9', 'clubs'), c('Q', 'hearts')]
    expect(countPairs(cards, 'Q')).toBe(2)
  })

  it('counts three of a kind as one pair plus a single', () => {
    expect(findPairs([c('4', 'spades'), c('4', 'hearts'), c('4', 'clubs')], 'Q')).toHaveLength(1)
  })
})

describe('setup', () => {
  it('seats 2 to 4 players and lets only the host pick rounds', () => {
    expect(() => startJutPatti(table(1), 'p0')).toThrow()
    expect(createJutPattiState({ id: 'p0', name: 'Al' }).maxSeats).toBe(4)
    expect(() => setTotalRounds(table(2), 'p1', 3)).toThrow(/host/i)
    expect(setTotalRounds(table(2), 'p0', 7).totalRounds).toBe(7)
    expect(() => setTotalRounds(table(2), 'p0', 4)).toThrow()
  })

  it('deals seven each, turns up a joker card and leaves the rest in the stock', () => {
    const s = started(3)
    expect(s.status).toBe('playing')
    expect(s.hands.map((h) => h.length)).toEqual([7, 7, 7])
    expect(s.stock.length).toBe(52 - 21 - 1)
    expect(s.jokerRank).toBe(jokerRankFor(s.jokerCard))
    const all = [...s.hands.flat(), ...s.stock, s.jokerCard]
    expect(new Set(all.map((x) => x.id)).size).toBe(52)
    expect(s.turn).toBe((s.dealer + 1) % 3)
    expect(s.phase).toBe('draw')
  })

  it('only the host starts, and not twice', () => {
    expect(() => startJutPatti(table(2), 'p1')).toThrow(/host/i)
    expect(() => startJutPatti(started(2), 'p0')).toThrow(/already/i)
  })
})

describe('turns', () => {
  it('draw then discard passes the turn on', () => {
    let s = started(3)
    const first = s.turn
    const id = `p${first}`
    expect(() => discardCard(s, id, s.hands[first][0].id)).toThrow(/draw/i)
    s = drawStock(s, id)
    expect(s.hands[first]).toHaveLength(8)
    expect(s.phase).toBe('discard')
    expect(() => drawStock(s, id)).toThrow(/discard/i)
    const thrown = s.hands[first][0]
    s = discardCard(s, id, thrown.id)
    expect(s.hands[first]).toHaveLength(7)
    expect(s.discard).toEqual([thrown])
    expect(s.turn).toBe((first + 1) % 3)
    expect(s.phase).toBe('draw')
  })

  it('rejects moves from the wrong player', () => {
    const s = started(3)
    const other = `p${(s.turn + 1) % 3}`
    expect(() => drawStock(s, other)).toThrow(/not your turn/i)
    expect(() => drawStock(s, 'stranger')).toThrow(/not seated/i)
  })

  it('cannot take from an empty pile, and cannot throw back what it took', () => {
    let s = started(2)
    const a = `p${s.turn}`
    expect(() => drawPile(s, a)).toThrow(/empty/i)
    s = drawStock(s, a)
    s = discardCard(s, a, s.hands[(s.turn)][0].id)
    const b = `p${s.turn}`
    const top = s.discard[0]
    s = drawPile(s, b)
    expect(s.hands[s.turn].some((x) => x.id === top.id)).toBe(true)
    expect(() => discardCard(s, b, top.id)).toThrow(/just took/i)
  })

  it('shuffles the pile back in when the stock runs out', () => {
    let s = started(2)
    s.stock = []
    s.discard = [c('2', 'hearts'), c('3', 'hearts'), c('4', 'hearts')]
    s = drawStock(s, `p${s.turn}`, zero)
    expect(s.discard).toEqual([c('4', 'hearts')])
    expect(s.stock).toHaveLength(1)
  })

  it('does not change the state it was given', () => {
    const s = started(2)
    const copy = structuredClone(s)
    drawStock(s, `p${s.turn}`)
    expect(s).toEqual(copy)
  })
})

describe('declaring', () => {
  // The player to move holds a winning eight: three pairs plus two spares.
  const winning = () => {
    const s = started(3)
    const seat = s.turn
    s.jokerRank = '2'
    s.hands[seat] = [c('5', 'spades'), c('5', 'hearts'), c('6', 'spades'), c('6', 'hearts'), c('7', 'spades'), c('7', 'hearts'), c('9', 'clubs'), c('K', 'clubs')]
    s.phase = 'discard'
    s.drawn = { id: 'clubs-K', from: 'stock' }
    return { s, seat, id: `p${seat}` }
  }

  it('wins the round with three pairs and a discard', () => {
    const { s, seat, id } = winning()
    expect([...options(s, seat).declare].sort()).toEqual(['clubs-9', 'clubs-K'])
    const done = declare(s, id, 'clubs-9')
    expect(done.status).toBe('roundEnd')
    expect(done.result.winner).toBe(seat)
    expect(done.rounds[0].scores[seat]).toBe(WIN_POINTS)
    expect(done.rounds[0].scores.filter((x) => x <= 0)).toHaveLength(2)
    expect(totalScores(done)[seat]).toBe(WIN_POINTS)
  })

  it('refuses to declare without three pairs', () => {
    const { s, id } = winning()
    s.hands[s.turn][0] = c('Q', 'diamonds')
    expect(() => declare(s, id, 'clubs-9')).toThrow(/3 pairs/i)
    expect(options(s, s.turn).declare).toEqual([])
  })

  it('counts jokers as pairs when declaring', () => {
    const { s, seat, id } = winning()
    s.hands[seat] = [c('5', 'spades'), c('5', 'hearts'), c('6', 'spades'), c('6', 'hearts'), c('7', 'spades'), c('2', 'hearts'), c('9', 'clubs'), c('K', 'clubs')]
    expect(declare(s, id, 'clubs-9').result.winner).toBe(seat)
  })

  it('cannot declare by throwing back the card taken from the pile', () => {
    const { s, id } = winning()
    s.drawn = { id: 'clubs-9', from: 'discard' }
    expect(() => declare(s, id, 'clubs-9')).toThrow(/just took/i)
    expect(declare(s, id, 'clubs-K').status).toBe('roundEnd')
  })

  it('deals on after a round, and finishes after the last one', () => {
    const { s, id } = winning()
    s.totalRounds = 3
    let next = declare(s, id, 'clubs-9')
    expect(next.status).toBe('roundEnd')
    const dealer = next.dealer
    next = nextRound(next, 'p1', zero)
    expect(next.round).toBe(2)
    expect(next.dealer).toBe((dealer + 1) % 3)
    expect(next.hands.every((h) => h.length === HAND_SIZE)).toBe(true)
    expect(next.rounds).toHaveLength(1)
    expect(() => nextRound(next, 'p1')).toThrow(/not over/i)

    const last = winning()
    last.s.totalRounds = 1
    expect(declare(last.s, last.id, 'clubs-9').status).toBe('finished')
  })
})

describe('host controls', () => {
  it('redo starts again from round 1 with scores wiped', () => {
    const s = restartJutPatti(started(2), 'p0', zero)
    expect(s.round).toBe(1)
    expect(s.rounds).toEqual([])
  })

  it('ending with nothing played goes back to the lobby; otherwise it shows the standings', () => {
    expect(endJutPatti(started(2), 'p0').status).toBe('lobby')
    const s = started(2)
    s.rounds = [{ round: 1, winner: 0, scores: [10, -2], unpaired: [1, 2] }]
    const ended = endJutPatti(s, 'p0')
    expect(ended.status).toBe('finished')
    expect(ended.endedEarly).toBe(true)
    expect(() => endJutPatti(s, 'p1')).toThrow(/host/i)
  })
})

describe('bots', () => {
  it('only move on a bot’s turn', () => {
    const s = addBot(createJutPattiState({ id: 'p0', name: 'Al' }), 'p0', zero)
    const live = startJutPatti(s, 'p0', zero)
    expect(isJutPattiBotTurn(live)).toBe(live.players[live.turn].bot === true)
    if (!isJutPattiBotTurn(live)) expect(() => jutPattiBotMove(live, 'p0')).toThrow(/bot/i)
  })

  it('play whole games on their own and always finish', () => {
    let s = createJutPattiState({ id: 'p0', name: 'Al' }, 3)
    s = addBot(s, 'p0', () => 0)
    s = addBot(s, 'p0', () => 1)
    s = startJutPatti(s, 'p0')
    s.players[0].bot = true // let the loop run unattended
    for (let moves = 0; s.status !== 'finished' && moves < 5000; moves++) {
      s = s.status === 'roundEnd' ? nextRound(s, 'p0') : playTurn(s)
    }
    expect(s.status).toBe('finished')
    expect(s.rounds).toHaveLength(3)
  })
})
