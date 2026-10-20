/**
 * Call Break rules engine for the online table: pure functions, no React, no network.
 *
 * Every action takes the shared room state and returns a NEW state (the input is never
 * changed), or throws a GameError with a message that can be shown to the player.
 *
 * Rules: spades are trump. You must follow the led suit, and beat the winning card when
 * you can. With no card of the led suit you must play a spade, over-trumping when you can.
 * With neither, play anything. Bids are 1 to 13 (capped by the cards dealt).
 */
import { SUITS, secureRandomInt, shuffle } from '../blackjack/engine'
import { computeScores, getCardsPerPlayer, getMaxBid } from '../utils/helpers'

export const MIN_SEATS = 2
export const MAX_SEATS = 5
export const DEFAULT_ROUNDS = 5
export const ROUND_OPTIONS = [1, 3, 5, 7, 10]
export const MAX_NAME = 16

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i + 2]))
// Hand order alternates colours so suits are easy to tell apart.
const SUIT_ORDER = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 }

/** A rule broken by a player. `code` marks the cases the UI treats specially ('full' | 'locked' | 'started'). */
export class GameError extends Error {
  constructor(message, code = null) {
    super(message)
    this.code = code
  }
}
const fail = (message, code) => {
  throw new GameError(message, code)
}

const BOT_NAMES = ['Robo Ram', 'Robo Sita', 'Robo Hari', 'Robo Gita', 'Robo Kiran', 'Robo Maya']

/* ---------- Cards ---------- */

export const buildDeck = () => SUITS.flatMap((s) => RANKS.map((rank) => ({ id: `${s.id}-${rank}`, rank, suit: s.id })))

export const rankValue = (card) => RANK_VALUE[card.rank]

export const sortHand = (cards) =>
  [...cards].sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || rankValue(b) - rankValue(a))

/** Does `card` beat `best`, the card winning the trick so far (always of the led suit or a spade)? */
export const beats = (card, best) => {
  if (card.suit === best.suit) return rankValue(card) > rankValue(best)
  return card.suit === 'spades'
}

/** The play currently winning a trick (`plays` is [{ seat, card }], in order). */
export const winningPlay = (plays) => plays.reduce((best, p) => (beats(p.card, best.card) ? p : best), plays[0])

/** Cards from `hand` that may legally be played on the trick so far. */
export const legalCards = (hand, plays) => {
  if (plays.length === 0) return hand
  const led = plays[0].card.suit
  const best = winningPlay(plays).card
  const higher = (cards) => cards.filter((c) => beats(c, best))

  const follow = hand.filter((c) => c.suit === led)
  if (follow.length) {
    const over = higher(follow)
    return over.length ? over : follow
  }
  const trumps = hand.filter((c) => c.suit === 'spades')
  if (trumps.length) {
    const over = higher(trumps)
    return over.length ? over : trumps
  }
  return hand
}

/* ---------- Seats ---------- */

export const cleanName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

export const seatOf = (state, playerId) => state.players.findIndex((p) => p.id === playerId)

const requireSeat = (state, playerId) => {
  const seat = seatOf(state, playerId)
  if (seat < 0) fail('You are not seated at this table.')
  return seat
}

const requireHost = (state, playerId) => {
  if (state.hostId !== playerId) fail('Only the host can do that.')
}

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase()

/* ---------- Room lifecycle ---------- */

export const createRoomState = (host, totalRounds = DEFAULT_ROUNDS) => {
  const name = cleanName(host.name)
  if (!name) fail('Enter your name.')
  if (!ROUND_OPTIONS.includes(totalRounds)) fail('Pick a valid number of rounds.')
  return {
    status: 'lobby', // 'lobby' -> 'bidding' -> 'playing' -> 'roundEnd' ... -> 'finished'
    hostId: host.id,
    players: [{ id: host.id, name }], // bots are { id, name, bot: true }
    locked: false, // when true, no new people can join (bots and returning players still can)
    totalRounds,
    round: 0,
    dealer: 0,
    dealId: 0, // bumps on every deal so clients know to play the shuffle animation
    hands: [],
    bids: [],
    won: [],
    turn: null,
    trick: [],
    trickNo: 0,
    lastTrick: null,
    rounds: [],
  }
}

/**
 * Seats a player. Someone already seated just reconnects. Once the game has started,
 * typing the name of an existing seat takes that seat back (for a new device or a cleared browser).
 */
export const joinRoom = (state, player) => {
  const name = cleanName(player.name)
  if (!name) fail('Enter your name.')
  const next = structuredClone(state)

  const mine = seatOf(next, player.id)
  if (mine >= 0) {
    if (next.players.some((p, i) => i !== mine && sameName(p.name, name))) fail(`Someone here is already called ${name}.`)
    next.players[mine].name = name
    return next
  }

  const byName = next.players.findIndex((p) => !p.bot && sameName(p.name, name))
  if (next.status !== 'lobby') {
    if (byName < 0) {
      fail('This game has already started, so no one new can join. If you were playing, use the exact name you joined with to take your seat back.', 'started')
    }
    if (next.hostId === next.players[byName].id) next.hostId = player.id
    next.players[byName].id = player.id
    return next
  }

  if (next.players.some((p) => sameName(p.name, name))) fail(`Someone here is already called ${name}. Pick another name.`)
  if (next.locked) fail('The host has closed this room to new players.', 'locked')
  if (next.players.length >= MAX_SEATS) fail(`This table is full (${MAX_SEATS} players).`, 'full')
  next.players.push({ id: player.id, name })
  return next
}

/** Leaving is only possible in the lobby; mid-game seats stay so the player can come back. */
export const leaveRoom = (state, playerId) => {
  if (state.status !== 'lobby') return state
  const next = structuredClone(state)
  next.players = next.players.filter((p) => p.id !== playerId)
  if (next.hostId === playerId) next.hostId = next.players.find((p) => !p.bot)?.id ?? null
  return next
}

/** Host: open or close the room to new players. */
export const setLocked = (state, playerId, locked) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby') fail('The game has already started.')
  return { ...structuredClone(state), locked: Boolean(locked) }
}

/** Host: fill an empty seat with a computer player. */
export const addBot = (state, playerId, randInt = secureRandomInt) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby') fail('The game has already started.')
  if (state.players.length >= MAX_SEATS) fail(`This table is full (${MAX_SEATS} players).`)
  const free = BOT_NAMES.filter((b) => !state.players.some((p) => sameName(p.name, b)))
  const name = free.length ? free[randInt(free.length)] : `Robo ${state.players.length + 1}`
  const id = `bot-${Array.from({ length: 8 }, () => randInt(36).toString(36)).join('')}`
  const next = structuredClone(state)
  next.players.push({ id, name, bot: true })
  return next
}

/** Host: turn a bot seat back into an empty seat. */
export const removeBot = (state, playerId, botId) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby') fail('The game has already started.')
  if (!state.players.some((p) => p.id === botId && p.bot)) fail('That seat is not a bot.')
  const next = structuredClone(state)
  next.players = next.players.filter((p) => p.id !== botId)
  return next
}

export const setTotalRounds = (state, playerId, totalRounds) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby') fail('The game has already started.')
  if (!ROUND_OPTIONS.includes(totalRounds)) fail('Pick a valid number of rounds.')
  return { ...structuredClone(state), totalRounds }
}

export const startGame = (state, playerId, randInt = secureRandomInt) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby' && state.status !== 'finished') fail('The game has already started.')
  if (state.players.length < MIN_SEATS) fail(`You need at least ${MIN_SEATS} players to start.`)
  return begin(structuredClone(state), randInt)
}

/** Host: start the game over from round 1 with the same players. All scores are wiped. */
export const restartGame = (state, playerId, randInt = secureRandomInt) => {
  requireHost(state, playerId)
  if (state.status === 'lobby') fail('The game has not started yet.')
  return begin(structuredClone(state), randInt)
}

/**
 * Host: stop the game now. Finished rounds count and the round in progress is dropped.
 * If no round has finished yet there is nothing to score, so the table goes back to the lobby.
 */
export const endGame = (state, playerId) => {
  requireHost(state, playerId)
  if (state.status === 'lobby' || state.status === 'finished') fail('There is no game in progress.')
  const next = structuredClone(state)
  next.hands = next.players.map(() => [])
  next.bids = []
  next.won = []
  next.turn = null
  next.trick = []
  next.lastTrick = null
  if (next.rounds.length === 0) {
    next.status = 'lobby'
    next.round = 0
    return next
  }
  next.status = 'finished'
  next.endedEarly = true
  return next
}

/** Round 1 with a random dealer (mutates `next`, which is already a copy). */
const begin = (next, randInt) => {
  next.round = 1
  next.rounds = []
  next.endedEarly = false
  next.dealer = randInt(next.players.length)
  return deal(next, randInt)
}

/** Shuffles a fresh deck and deals the round (mutates `next`, which is already a copy). */
const deal = (next, randInt) => {
  const n = next.players.length
  const each = getCardsPerPlayer(n)
  const deck = shuffle(buildDeck(), randInt)
  next.hands = Array.from({ length: n }, (_, seat) => sortHand(deck.slice(seat * each, (seat + 1) * each)))
  next.bids = Array(n).fill(null)
  next.won = Array(n).fill(0)
  next.turn = (next.dealer + 1) % n
  next.trick = []
  next.trickNo = 0
  next.lastTrick = null
  next.status = 'bidding'
  next.dealId += 1
  return next
}

export const placeBid = (state, playerId, bid) => {
  const seat = requireSeat(state, playerId)
  if (state.status !== 'bidding') fail('Bidding is closed.')
  if (state.turn !== seat) fail('It is not your turn to bid.')
  const max = getMaxBid(state.players.length)
  if (!Number.isInteger(bid) || bid < 1 || bid > max) fail(`Bid between 1 and ${max}.`)

  const next = structuredClone(state)
  const n = next.players.length
  next.bids[seat] = bid
  next.turn = (seat + 1) % n
  if (next.bids.every((b) => b !== null)) {
    next.status = 'playing'
    next.turn = (next.dealer + 1) % n // left of the dealer leads the first trick
  }
  return next
}

export const playCard = (state, playerId, cardId) => {
  const seat = requireSeat(state, playerId)
  if (state.status !== 'playing') fail('Cards cannot be played right now.')
  if (state.turn !== seat) fail('It is not your turn.')
  const hand = state.hands[seat]
  const card = hand.find((c) => c.id === cardId)
  if (!card) fail('That card is not in your hand.')
  if (!legalCards(hand, state.trick).some((c) => c.id === cardId)) {
    const led = state.trick[0].card.suit
    fail(
      hand.some((c) => c.suit === led)
        ? `You must follow ${led}, with a higher card if you have one.`
        : hand.some((c) => c.suit === 'spades')
          ? 'You have no ' + led + ', so you must play a spade, a higher one if you can.'
          : 'That card cannot be played.'
    )
  }

  const next = structuredClone(state)
  const n = next.players.length
  next.hands[seat] = hand.filter((c) => c.id !== cardId)
  next.trick.push({ seat, card })

  if (next.trick.length < n) {
    next.turn = (seat + 1) % n
    return next
  }

  const winner = winningPlay(next.trick).seat
  next.won[winner] += 1
  next.lastTrick = { id: next.trickNo, plays: next.trick, winner }
  next.trick = []
  next.trickNo += 1
  next.turn = winner

  if (next.hands.every((h) => h.length === 0)) {
    next.rounds.push({ bids: next.bids, tricks: next.won, scores: computeScores(next.bids, next.won) })
    next.status = next.round >= next.totalRounds ? 'finished' : 'roundEnd'
    next.turn = null
  }
  return next
}

/** Anyone at the table can deal the next round once the scores are in. */
export const nextRound = (state, playerId, randInt = secureRandomInt) => {
  requireSeat(state, playerId)
  if (state.status !== 'roundEnd') fail('The round is not over yet.')
  const next = structuredClone(state)
  next.round += 1
  next.dealer = (next.dealer + 1) % next.players.length
  return deal(next, randInt)
}

/* ---------- Bots ---------- */

export const isBotTurn = (state) =>
  (state.status === 'bidding' || state.status === 'playing') && Boolean(state.players[state.turn]?.bot)

/** A bot's bid: sure tricks from high cards plus extra spades, between 1 and the maximum. */
export const botBid = (hand, max) => {
  const bySuit = (suit) => hand.filter((c) => c.suit === suit)
  const spades = bySuit('spades')
  const has = (cards, rank) => cards.some((c) => c.rank === rank)
  let tricks = 0
  if (has(spades, 'A')) tricks += 1
  if (has(spades, 'K')) tricks += spades.length >= 2 ? 1 : 0.5
  if (has(spades, 'Q') && spades.length >= 3) tricks += 1
  tricks += Math.max(0, spades.length - 3)
  let short = false
  for (const suit of ['hearts', 'clubs', 'diamonds']) {
    const cards = bySuit(suit)
    if (has(cards, 'A')) tricks += 1
    if (has(cards, 'K') && cards.length >= 2 && cards.length <= 5) tricks += 0.75
    if (cards.length <= 1) short = true
  }
  // A short side suit lets spare spades trump in.
  if (short && spades.length >= 3) tricks += 0.5
  return Math.max(1, Math.min(max, Math.round(tricks)))
}

const lowest = (cards) =>
  [...cards].sort((a, b) => (a.suit === 'spades') - (b.suit === 'spades') || rankValue(a) - rankValue(b))[0]
const highest = (cards) => [...cards].sort((a, b) => rankValue(b) - rankValue(a))[0]

/** A bot's card: chase tricks while short of its bid, otherwise throw its cheapest legal card. */
export const botCard = (state, seat) => {
  const hand = state.hands[seat]
  const legal = legalCards(hand, state.trick)
  const short = state.won[seat] < state.bids[seat]

  if (state.trick.length === 0) {
    const aces = legal.filter((c) => c.rank === 'A' && c.suit !== 'spades')
    if (short && aces.length) return aces[0]
    return lowest(legal)
  }
  const best = winningPlay(state.trick).card
  const winners = legal.filter((c) => beats(c, best))
  if (short && winners.length) {
    const last = state.trick.length === state.players.length - 1
    // Last to play only needs to just win; earlier, play high so later players can't beat it.
    return last ? lowest(winners) : highest(winners)
  }
  return lowest(legal)
}

/**
 * Plays the move for whichever bot is up. Any seated person may trigger it (the host's
 * browser normally does), so bots keep playing without their own device.
 */
export const botMove = (state, playerId) => {
  const actor = seatOf(state, playerId)
  if (actor < 0 || state.players[actor].bot) fail('You are not seated at this table.')
  if (!isBotTurn(state)) fail('It is not a bot’s turn.')
  const bot = state.players[state.turn]
  if (state.status === 'bidding') return placeBid(state, bot.id, botBid(state.hands[state.turn], getMaxBid(state.players.length)))
  return playCard(state, bot.id, botCard(state, state.turn).id)
}

/* ---------- Views ---------- */

/** Short line saying whose move it is. `mySeat` is -1 for someone not seated. */
export const statusText = (state, mySeat) => {
  const name = (seat) => (seat === mySeat ? 'You' : state.players[seat]?.name ?? 'Someone')
  if (state.status === 'bidding') return state.turn === mySeat ? 'Your bid' : `${name(state.turn)} is bidding`
  if (state.status === 'playing') {
    if (state.turn === mySeat) return state.trick.length ? 'Your turn' : 'Your lead'
    return `${name(state.turn)} to play`
  }
  if (state.status === 'roundEnd') return `Round ${state.round} complete`
  if (state.status === 'finished') return 'Game over'
  return 'Waiting for players'
}
