import { describe, expect, it } from 'vitest'
import {
  GameError,
  addBot,
  botBid,
  botMove,
  buildDeck,
  isBotTurn,
  removeBot,
  setLocked,
  createRoomState,
  endGame,
  joinRoom,
  restartGame,
  leaveRoom,
  legalCards,
  nextRound,
  placeBid,
  playCard,
  setTotalRounds,
  startGame,
  winningPlay,
} from './engine'

const c = (rank, suit) => ({ id: `${suit}-${rank}`, rank, suit })
const play = (seat, rank, suit) => ({ seat, card: c(rank, suit) })
// Deterministic "random" source: always 0, so the shuffle is fixed and the first dealer is seat 0.
const zero = () => 0

const room = (names = ['Asha', 'Bikash', 'Chandra', 'Dipa']) =>
  names.slice(1).reduce((s, name, i) => joinRoom(s, { id: `p${i + 1}`, name }), createRoomState({ id: 'p0', name: names[0] }))

describe('deck', () => {
  it('has 52 unique cards', () => {
    const deck = buildDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map((d) => d.id)).size).toBe(52)
  })
})

describe('winningPlay', () => {
  it('highest card of the led suit wins without trumps', () => {
    expect(winningPlay([play(0, '10', 'hearts'), play(1, 'K', 'hearts'), play(2, 'A', 'clubs')]).seat).toBe(1)
  })
  it('any spade beats the led suit, and the highest spade wins', () => {
    expect(winningPlay([play(0, 'A', 'hearts'), play(1, '2', 'spades'), play(2, '5', 'spades'), play(3, 'K', 'hearts')]).seat).toBe(2)
  })
})

describe('legalCards', () => {
  const hand = [c('A', 'hearts'), c('4', 'hearts'), c('3', 'spades'), c('Q', 'spades'), c('K', 'clubs')]

  it('allows anything on the lead', () => {
    expect(legalCards(hand, [])).toHaveLength(5)
  })
  it('must follow suit and beat the winning card when possible', () => {
    expect(legalCards(hand, [play(0, '10', 'hearts')]).map((x) => x.id)).toEqual(['hearts-A'])
  })
  it('may follow low when it cannot beat', () => {
    const ids = legalCards([c('4', 'hearts'), c('5', 'hearts'), c('K', 'clubs')], [play(0, 'A', 'hearts')]).map((x) => x.id)
    expect(ids).toEqual(['hearts-4', 'hearts-5'])
  })
  it('follows suit without needing to beat a trump', () => {
    const ids = legalCards(hand, [play(0, '10', 'hearts'), play(1, '2', 'spades')]).map((x) => x.id)
    expect(ids).toEqual(['hearts-A', 'hearts-4'])
  })
  it('must trump when void, over-trumping when possible', () => {
    expect(legalCards(hand, [play(0, '9', 'diamonds')]).map((x) => x.id)).toEqual(['spades-3', 'spades-Q'])
    expect(legalCards(hand, [play(0, '9', 'diamonds'), play(1, '5', 'spades')]).map((x) => x.id)).toEqual(['spades-Q'])
    expect(legalCards(hand, [play(0, '9', 'diamonds'), play(1, 'A', 'spades')]).map((x) => x.id)).toEqual(['spades-3', 'spades-Q'])
  })
  it('allows anything with no led suit and no spades', () => {
    expect(legalCards([c('K', 'clubs'), c('2', 'hearts')], [play(0, '9', 'diamonds')])).toHaveLength(2)
  })
})

describe('room lifecycle', () => {
  it('seats players and rejects duplicate names', () => {
    const s = room()
    expect(s.players.map((p) => p.name)).toEqual(['Asha', 'Bikash', 'Chandra', 'Dipa'])
    expect(() => joinRoom(s, { id: 'x', name: 'asha' })).toThrow(GameError)
  })

  it('caps the table at five', () => {
    const s = joinRoom(room(), { id: 'p4', name: 'Era' })
    expect(() => joinRoom(s, { id: 'p5', name: 'Faris' })).toThrow(/full/)
  })

  it('reconnecting with the same id keeps the seat', () => {
    const s = joinRoom(room(), { id: 'p2', name: 'Chandra K' })
    expect(s.players).toHaveLength(4)
    expect(s.players[2].name).toBe('Chandra K')
  })

  it('lets a player take their seat back by name after the start, but no newcomers', () => {
    const s = startGame(room(), 'p0', zero)
    const back = joinRoom(s, { id: 'new-device', name: 'bikash' })
    expect(back.players[1].id).toBe('new-device')
    expect(() => joinRoom(s, { id: 'q', name: 'Stranger' })).toThrow(/started/)
  })

  it('hands the host role on when the host leaves the lobby', () => {
    const s = leaveRoom(room(), 'p0')
    expect(s.hostId).toBe('p1')
    expect(s.players).toHaveLength(3)
  })

  it('only the host starts or changes settings', () => {
    expect(() => startGame(room(), 'p1')).toThrow(/host/)
    expect(() => setTotalRounds(room(), 'p1', 3)).toThrow(/host/)
    expect(setTotalRounds(room(), 'p0', 3).totalRounds).toBe(3)
  })

  it('takes the number of rounds when the room is created', () => {
    expect(createRoomState({ id: 'p0', name: 'Asha' }, 7).totalRounds).toBe(7)
    expect(createRoomState({ id: 'p0', name: 'Asha' }).totalRounds).toBe(5)
    expect(() => createRoomState({ id: 'p0', name: 'Asha' }, 4)).toThrow(/rounds/)
  })

  it('needs two players', () => {
    expect(() => startGame(createRoomState({ id: 'p0', name: 'Solo' }), 'p0')).toThrow(/at least/)
  })

  it('does not change the state it was given', () => {
    const s = room()
    const copy = structuredClone(s)
    startGame(s, 'p0', zero)
    expect(s).toEqual(copy)
  })
})

describe('bots and locking', () => {
  it('host adds and removes bots; they take seats', () => {
    let s = addBot(room(['Asha', 'Bikash']), 'p0', zero)
    expect(s.players).toHaveLength(3)
    expect(s.players[2].bot).toBe(true)
    expect(() => addBot(s, 'p1')).toThrow(/host/)
    s = removeBot(s, 'p0', s.players[2].id)
    expect(s.players).toHaveLength(2)
    expect(() => removeBot(s, 'p0', 'p1')).toThrow(/not a bot/)
  })

  it('bots count towards a full table', () => {
    let s = room()
    s = addBot(s, 'p0', zero)
    expect(() => addBot(s, 'p0', zero)).toThrow(/full/)
    try {
      joinRoom(s, { id: 'z', name: 'Zara' })
    } catch (e) {
      expect(e.code).toBe('full')
    }
  })

  it('a locked room turns away newcomers but not returning players', () => {
    const s = setLocked(room(['Asha', 'Bikash']), 'p0', true)
    expect(() => joinRoom(s, { id: 'z', name: 'Zara' })).toThrow(expect.objectContaining({ code: 'locked' }))
    expect(joinRoom(s, { id: 'p1', name: 'Bikash' }).players).toHaveLength(2)
    expect(() => setLocked(s, 'p1', false)).toThrow(/host/)
  })

  it('newcomers after the start get the started code', () => {
    expect(() => joinRoom(startGame(room(), 'p0', zero), { id: 'z', name: 'Zara' })).toThrow(expect.objectContaining({ code: 'started' }))
  })

  it('host role never passes to a bot', () => {
    let s = addBot(room(['Asha']), 'p0', zero)
    s = leaveRoom(s, 'p0')
    expect(s.hostId).toBe(null)
  })

  it('bots bid sensibly and play a whole game with a person', () => {
    let s = addBot(addBot(addBot(room(['Asha']), 'p0'), 'p0'), 'p0')
    s = startGame(setTotalRounds(s, 'p0', 3), 'p0')
    while (s.status !== 'finished') {
      if (s.status === 'roundEnd') s = nextRound(s, 'p0')
      else if (isBotTurn(s)) s = botMove(s, 'p0')
      else if (s.status === 'bidding') s = placeBid(s, 'p0', 2)
      else s = playCard(s, 'p0', legalCards(s.hands[0], s.trick)[0].id)
    }
    expect(s.rounds).toHaveLength(3)
    s.rounds.forEach((r) => r.bids.forEach((b) => expect(b).toBeGreaterThanOrEqual(1)))
  })

  it('botMove refuses on a person’s turn or from a non-player', () => {
    const s = startGame(addBot(room(['Asha']), 'p0', zero), 'p0', zero) // dealer seat 0, so the bot (seat 1) bids first
    expect(() => botMove(s, 'stranger')).toThrow()
    const after = botMove(s, 'p0')
    expect(after.bids[1]).not.toBeNull()
    expect(() => botMove(after, 'p0')).toThrow(/bot/)
  })

  it('botBid counts high cards and spades', () => {
    const strong = [c('A', 'spades'), c('K', 'spades'), c('Q', 'spades'), c('J', 'spades'), c('A', 'hearts'), c('A', 'clubs')]
    // 4 from spades (A, K, Q, one long spade), 2 side aces, half a trick for the short suits.
    expect(botBid(strong, 13)).toBe(7)
    expect(botBid(strong, 5)).toBe(5)
    expect(botBid([c('2', 'hearts'), c('3', 'clubs')], 13)).toBe(1)
  })
})

describe('host controls', () => {
  const playRound = (s) => {
    for (let i = 0; i < s.players.length; i++) s = placeBid(s, `p${s.turn}`, 1)
    while (s.status === 'playing') s = playCard(s, `p${s.turn}`, legalCards(s.hands[s.turn], s.trick)[0].id)
    return s
  }

  it('only the host can redo or end the game', () => {
    const s = startGame(room(), 'p0', zero)
    expect(() => restartGame(s, 'p1')).toThrow(/host/)
    expect(() => endGame(s, 'p1')).toThrow(/host/)
  })

  it('redo starts again from round 1 with scores wiped and a new deal', () => {
    let s = nextRound(playRound(startGame(room(), 'p0', zero)), 'p0', zero)
    expect(s.round).toBe(2)
    const redone = restartGame(s, 'p0', zero)
    expect(redone.round).toBe(1)
    expect(redone.rounds).toEqual([])
    expect(redone.status).toBe('bidding')
    expect(redone.dealId).toBe(s.dealId + 1)
    expect(redone.players).toEqual(s.players)
  })

  it('ending keeps finished rounds and drops the one in progress', () => {
    const s = nextRound(playRound(startGame(room(), 'p0', zero)), 'p0', zero)
    const ended = endGame(s, 'p0')
    expect(ended.status).toBe('finished')
    expect(ended.endedEarly).toBe(true)
    expect(ended.rounds).toHaveLength(1)
    expect(ended.hands.every((h) => h.length === 0)).toBe(true)
    expect(() => endGame(ended, 'p0')).toThrow()
    expect(startGame(ended, 'p0', zero).endedEarly).toBe(false)
  })

  it('ending before any round is scored goes back to the lobby', () => {
    const ended = endGame(startGame(room(), 'p0', zero), 'p0')
    expect(ended.status).toBe('lobby')
    expect(ended.players).toHaveLength(4)
  })
})

describe('a full round', () => {
  it('deals, bids, plays 13 tricks and scores', () => {
    let s = startGame(room(), 'p0', zero)
    expect(s.status).toBe('bidding')
    expect(s.hands.map((h) => h.length)).toEqual([13, 13, 13, 13])
    expect(new Set(s.hands.flat().map((x) => x.id)).size).toBe(52)
    expect(s.dealer).toBe(0)
    expect(s.turn).toBe(1)

    expect(() => placeBid(s, 'p0', 3)).toThrow(/turn/)
    for (const seat of [1, 2, 3, 0]) s = placeBid(s, `p${seat}`, 2)
    expect(s.status).toBe('playing')
    expect(s.turn).toBe(1)

    // Everyone plays their first legal card until the hands are empty.
    while (s.status === 'playing') {
      const seat = s.turn
      s = playCard(s, `p${seat}`, legalCards(s.hands[seat], s.trick)[0].id)
    }
    expect(s.status).toBe('roundEnd')
    expect(s.won.reduce((a, b) => a + b, 0)).toBe(13)
    expect(s.rounds).toHaveLength(1)
    expect(s.rounds[0].scores).toEqual(s.won.map((w) => (w >= 2 ? 20 + (w - 2) : -20)))

    s = nextRound(s, 'p2', zero)
    expect(s.round).toBe(2)
    expect(s.dealer).toBe(1)
    expect(s.turn).toBe(2)
    expect(s.dealId).toBe(2)
  })

  it('rejects an illegal card', () => {
    let s = startGame(room(['A', 'B']), 'p0', zero)
    s = placeBid(placeBid(s, 'p1', 1), 'p0', 1)
    const leader = s.turn
    const lead = s.hands[leader][0]
    s = playCard(s, `p${leader}`, lead.id)
    const other = 1 - leader
    const illegal = s.hands[other].find((x) => !legalCards(s.hands[other], s.trick).includes(x))
    if (illegal) expect(() => playCard(s, `p${other}`, illegal.id)).toThrow(GameError)
  })

  it('finishes after the last round', () => {
    let s = startGame(setTotalRounds(room(['A', 'B']), 'p0', 1), 'p0', zero)
    s = placeBid(placeBid(s, `p${s.turn}`, 1), `p${(s.turn + 1) % 2}`, 1)
    while (s.status === 'playing') s = playCard(s, `p${s.turn}`, legalCards(s.hands[s.turn], s.trick)[0].id)
    expect(s.status).toBe('finished')
    expect(() => nextRound(s, 'p0')).toThrow()
  })
})
