/**
 * Jut Patti rules engine for the online table: pure functions, no React, no network.
 * Like the other online engines, every action takes the room state and returns a new one,
 * or throws a GameError. Lobby actions (join, leave, bots, lock) are shared with Call Break.
 *
 * Rules: 2-4 players, 7 cards each from a 52-card deck. One stock card is turned up and every
 * card exactly one rank higher is a joker for the round (K turned up makes aces jokers, A makes
 * 2s jokers). A turn is draw (stock or top of the discard pile), then discard. Pairs are two
 * cards of the same rank; a joker pairs with anything. Make 3 pairs plus one spare card and
 * declare while discarding to win. You can't throw back the card you just took from the pile.
 */
import { secureRandomInt, shuffle } from '../blackjack/engine'
import { GameError, RANKS, buildDeck, cleanName } from './engine'

export const JP_MIN_SEATS = 2
export const JP_MAX_SEATS = 4
export const ROUND_OPTIONS = [3, 5, 7, 10]
export const DEFAULT_ROUNDS = 5
export const HAND_SIZE = 7
export const PAIRS_TO_WIN = 3
export const WIN_POINTS = 10 // the winner of a round; everyone else loses a point per unpaired card

const fail = (message, code) => {
  throw new GameError(message, code)
}

/* ---------- Pairs ---------- */

/** The rank that is joker when `card` is turned up: one higher, with A wrapping round to 2. */
export const jokerRankFor = (card) => RANKS[(RANKS.indexOf(card.rank) + 1) % RANKS.length]

/**
 * The most pairs `cards` can make, as [card, card] couples. Cards of one rank pair off, jokers
 * then pair with leftover singles, and any jokers still spare pair with each other. Taking
 * same-rank pairs first never costs a pair, so this is the best possible.
 */
export const findPairs = (cards, jokerRank) => {
  const jokers = cards.filter((c) => c.rank === jokerRank)
  const byRank = new Map()
  cards
    .filter((c) => c.rank !== jokerRank)
    .forEach((c) => byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]))
  const pairs = []
  const singles = []
  for (const group of byRank.values()) {
    for (let i = 0; i + 1 < group.length; i += 2) pairs.push([group[i], group[i + 1]])
    if (group.length % 2) singles.push(group[group.length - 1])
  }
  const spare = [...jokers]
  while (spare.length && singles.length) pairs.push([singles.pop(), spare.pop()])
  while (spare.length > 1) pairs.push([spare.pop(), spare.pop()])
  return pairs
}

export const countPairs = (cards, jokerRank) => findPairs(cards, jokerRank).length
const unpaired = (cards, jokerRank) => cards.length - 2 * countPairs(cards, jokerRank)

/** Does holding `cards` (the 7 you keep) win? */
export const isWinning = (cards, jokerRank) => countPairs(cards, jokerRank) >= PAIRS_TO_WIN

/* ---------- Room ---------- */

export const createJutPattiState = (host, totalRounds = DEFAULT_ROUNDS) => {
  const name = cleanName(host.name)
  if (!name) fail('Enter your name.')
  if (!ROUND_OPTIONS.includes(totalRounds)) fail('Pick a valid number of rounds.')
  return {
    game: 'jutpatti',
    status: 'lobby', // 'lobby' -> 'playing' -> 'roundEnd' ... -> 'finished'
    hostId: host.id,
    players: [{ id: host.id, name }],
    locked: false,
    maxSeats: JP_MAX_SEATS,
    totalRounds,
    round: 0,
    dealer: 0,
    dealId: 0,
    gameId: null,
    hands: [],
    stock: [],
    discard: [], // face up, top card last
    jokerCard: null, // the card turned up to pick the joker rank
    jokerRank: null,
    turn: null,
    phase: 'draw', // 'draw' -> 'discard' for the player whose turn it is
    drawn: null, // { id, from: 'stock' | 'discard' } the card taken this turn
    lastAction: null, // { seat, type: 'stock' | 'pile' | 'discard' | 'declare', card? }
    result: null, // { winner, hands: [cards], unpaired: [n] }
    rounds: [], // one entry per finished round: { round, winner, scores, unpaired }
    endedEarly: false,
  }
}

const seatOf = (state, playerId) => state.players.findIndex((p) => p.id === playerId)
const requireSeat = (state, playerId) => {
  const seat = seatOf(state, playerId)
  if (seat < 0) fail('You are not seated at this table.')
  return seat
}
const requireHost = (state, playerId) => {
  if (state.hostId !== playerId) fail('Only the host can do that.')
}

export const setTotalRounds = (state, playerId, totalRounds) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby') fail('The game has already started.')
  if (!ROUND_OPTIONS.includes(totalRounds)) fail('Pick a valid number of rounds.')
  return { ...structuredClone(state), totalRounds }
}

/** Deals a round (mutates `next`, already a copy). */
const deal = (next, randInt) => {
  const n = next.players.length
  const deck = shuffle(buildDeck(), randInt)
  next.hands = Array.from({ length: n }, (_, seat) => deck.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE))
  const rest = deck.slice(n * HAND_SIZE)
  next.jokerCard = rest[0]
  next.jokerRank = jokerRankFor(rest[0])
  next.stock = rest.slice(1)
  next.discard = []
  next.turn = (next.dealer + 1) % n
  next.phase = 'draw'
  next.drawn = null
  next.lastAction = null
  next.result = null
  next.status = 'playing'
  next.dealId += 1
  return next
}

const begin = (next, randInt) => {
  next.gameId = Array.from({ length: 16 }, () => randInt(36).toString(36)).join('')
  next.round = 1
  next.rounds = []
  next.endedEarly = false
  next.dealer = randInt(next.players.length)
  return deal(next, randInt)
}

export const startJutPatti = (state, playerId, randInt = secureRandomInt) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby' && state.status !== 'finished') fail('The game has already started.')
  if (state.players.length < JP_MIN_SEATS) fail(`You need at least ${JP_MIN_SEATS} players to start.`)
  return begin(structuredClone(state), randInt)
}

export const restartJutPatti = (state, playerId, randInt = secureRandomInt) => {
  requireHost(state, playerId)
  if (state.status === 'lobby') fail('The game has not started yet.')
  return begin(structuredClone(state), randInt)
}

/** Anyone at the table deals the next round once the last one is settled. */
export const nextRound = (state, playerId, randInt = secureRandomInt) => {
  requireSeat(state, playerId)
  if (state.status !== 'roundEnd') fail('The round is not over yet.')
  const next = structuredClone(state)
  next.round += 1
  next.dealer = (next.dealer + 1) % next.players.length
  return deal(next, randInt)
}

/* ---------- Turns ---------- */

/** The moves `seat` can make right now (for the UI and the bots). */
export const options = (state, seat) => {
  const mine = state.status === 'playing' && state.turn === seat
  const hand = state.hands[seat] ?? []
  return {
    drawStock: mine && state.phase === 'draw' && state.stock.length + Math.max(state.discard.length - 1, 0) > 0,
    drawPile: mine && state.phase === 'draw' && state.discard.length > 0,
    discard: mine && state.phase === 'discard',
    // Cards that, thrown away, leave a winning seven.
    declare: mine && state.phase === 'discard' ? hand.filter((c) => canDeclareWith(state, seat, c.id)).map((c) => c.id) : [],
  }
}

const canDeclareWith = (state, seat, cardId) => {
  if (state.drawn?.from === 'discard' && state.drawn.id === cardId) return false
  return isWinning(state.hands[seat].filter((c) => c.id !== cardId), state.jokerRank)
}

const requireTurn = (state, playerId, phase) => {
  const seat = requireSeat(state, playerId)
  if (state.status !== 'playing') fail('There is no round being played.')
  if (state.turn !== seat) fail('It is not your turn.')
  if (state.phase !== phase) fail(phase === 'draw' ? 'Discard a card first.' : 'Draw a card first.')
  return seat
}

/** When the stock runs out, the discard pile (bar its top card) is shuffled back in. */
const refill = (next, randInt) => {
  if (next.stock.length || next.discard.length < 2) return
  const top = next.discard[next.discard.length - 1]
  next.stock = shuffle(next.discard.slice(0, -1), randInt)
  next.discard = [top]
}

export const drawStock = (state, playerId, randInt = secureRandomInt) => {
  const seat = requireTurn(state, playerId, 'draw')
  const next = structuredClone(state)
  refill(next, randInt)
  if (!next.stock.length) fail('There are no cards left to draw. Take the top of the pile.')
  const card = next.stock.shift()
  next.hands[seat].push(card)
  next.phase = 'discard'
  next.drawn = { id: card.id, from: 'stock' }
  next.lastAction = { seat, type: 'stock' }
  return next
}

export const drawPile = (state, playerId) => {
  const seat = requireTurn(state, playerId, 'draw')
  if (!state.discard.length) fail('The discard pile is empty. Draw from the stock.')
  const next = structuredClone(state)
  const card = next.discard.pop()
  next.hands[seat].push(card)
  next.phase = 'discard'
  next.drawn = { id: card.id, from: 'discard' }
  next.lastAction = { seat, type: 'pile', card }
  return next
}

/** Removes `cardId` from the player's hand and puts it on the pile. */
const throwAway = (state, playerId, cardId) => {
  const seat = requireTurn(state, playerId, 'discard')
  const index = state.hands[seat].findIndex((c) => c.id === cardId)
  if (index < 0) fail('That card is not in your hand.')
  if (state.drawn?.from === 'discard' && state.drawn.id === cardId) fail('You can’t throw back the card you just took from the pile.')
  const next = structuredClone(state)
  const [card] = next.hands[seat].splice(index, 1)
  next.discard.push(card)
  return { next, seat, card }
}

export const discardCard = (state, playerId, cardId) => {
  const { next, seat, card } = throwAway(state, playerId, cardId)
  next.lastAction = { seat, type: 'discard', card }
  next.turn = (seat + 1) % next.players.length
  next.phase = 'draw'
  next.drawn = null
  return next
}

/** Throw `cardId` away and show three pairs in the seven you keep: you win the round. */
export const declare = (state, playerId, cardId) => {
  const seat = requireSeat(state, playerId)
  const { next, card } = throwAway(state, playerId, cardId)
  if (!isWinning(next.hands[seat], next.jokerRank)) fail(`You need ${PAIRS_TO_WIN} pairs in the other ${HAND_SIZE} cards to declare.`)
  next.lastAction = { seat, type: 'declare', card }
  return settle(next, seat)
}

const settle = (next, winner) => {
  const left = next.hands.map((h) => unpaired(h, next.jokerRank))
  const scores = left.map((n, seat) => (seat === winner ? WIN_POINTS : -n))
  next.result = { winner, hands: next.hands, unpaired: left }
  next.rounds.push({ round: next.round, winner, scores, unpaired: left })
  next.turn = null
  next.phase = 'draw'
  next.drawn = null
  next.status = next.round >= next.totalRounds ? 'finished' : 'roundEnd'
  return next
}

/** Host: stop now. With nothing played, back to the lobby; otherwise show the standings so far. */
export const endJutPatti = (state, playerId) => {
  requireHost(state, playerId)
  if (state.status === 'lobby' || state.status === 'finished') fail('There is no game in progress.')
  const next = structuredClone(state)
  next.turn = null
  next.hands = next.players.map(() => [])
  next.stock = []
  next.discard = []
  if (next.rounds.length === 0) {
    next.status = 'lobby'
    next.round = 0
    return next
  }
  next.endedEarly = true
  next.status = 'finished'
  return next
}

/* ---------- Totals ---------- */

export const totalScores = (state) => state.players.map((_, i) => state.rounds.reduce((sum, r) => sum + (r.scores[i] ?? 0), 0))

export const formatPoints = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`

/* ---------- Bots ---------- */

export const isJutPattiBotTurn = (state) => state.status === 'playing' && Boolean(state.players[state.turn]?.bot)

/** How many cards of this rank are still hidden from `seat`: not in its hand, not on the pile. */
const unseen = (state, seat, rank) => {
  const seen = [...state.hands[seat], ...state.discard, state.jokerCard].filter((c) => c.rank === rank).length
  return 4 - seen
}

/**
 * A bot's move. It takes the top of the pile when that card pairs with something it holds (or is
 * a joker), otherwise draws. It declares when it can, and otherwise throws the card whose loss
 * keeps the most pairs, preferring one that is hardest to ever pair up.
 */
export const jutPattiBotMove = (state, playerId) => {
  const actor = seatOf(state, playerId)
  if (actor < 0 || state.players[actor].bot) fail('You are not seated at this table.')
  if (!isJutPattiBotTurn(state)) fail('It is not a bot’s turn.')
  return playTurn(state)
}

/** One move (a draw or a discard) for whoever's turn it is, by the bot rules above. */
export const playTurn = (state) => {
  const seat = state.turn
  const botId = state.players[seat].id
  const { jokerRank } = state

  if (state.phase === 'draw') {
    const top = state.discard[state.discard.length - 1]
    const helps = top && countPairs([...state.hands[seat], top], jokerRank) > countPairs(state.hands[seat], jokerRank)
    const stockLeft = state.stock.length > 0 || state.discard.length > 1
    return helps || !stockLeft ? drawPile(state, botId) : drawStock(state, botId)
  }

  const hand = state.hands[seat]
  const win = hand.find((c) => canDeclareWith(state, seat, c.id))
  if (win) return declare(state, botId, win.id)

  let best = null
  for (const card of hand) {
    if (state.drawn?.from === 'discard' && state.drawn.id === card.id) continue
    const kept = hand.filter((c) => c.id !== card.id)
    const score = countPairs(kept, jokerRank) * 100 + (card.rank === jokerRank ? -50 : 0) - unseen(state, seat, card.rank)
    if (!best || score > best.score) best = { card, score }
  }
  return discardCard(state, botId, best.card.id)
}

/* ---------- Views ---------- */

export const jutPattiStatus = (state, mySeat) => {
  const name = (seat) => (seat === mySeat ? 'You' : state.players[seat]?.name ?? 'Someone')
  if (state.status === 'playing') {
    const who = name(state.turn)
    if (state.turn === mySeat) return state.phase === 'draw' ? 'Your turn: draw a card' : 'Discard a card'
    return state.phase === 'draw' ? `${who} to draw` : `${who} to discard`
  }
  if (state.status === 'roundEnd') return `Round ${state.round} over`
  if (state.status === 'finished') return 'Game over'
  return 'Waiting for players'
}

export const describeAction = (state, mySeat, action = state.lastAction) => {
  if (!action) return null
  const who = action.seat === mySeat ? 'You' : state.players[action.seat]?.name
  const label = action.card ? `${action.card.rank}` : ''
  const verbs = {
    stock: 'drew from the stock',
    pile: `took the ${label} from the pile`,
    discard: `discarded a ${label}`,
    declare: `declared with a ${label} discard`,
  }
  return `${who} ${verbs[action.type] ?? action.type}`
}
