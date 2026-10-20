/**
 * Teen Patti (3 Patti) rules engine for the online table: pure functions, no React, no network.
 * Like the Call Break engine, every action takes the room state and returns a new one, or
 * throws a GameError. Lobby actions (join, leave, bots, lock) are shared with Call Break.
 *
 * Rules: 2-6 players with play chips. Each hand everyone pays the boot and gets 3 cards.
 * Blind players bet the stake, seen players bet double. On your turn: chaal (call), raise
 * (doubles the stake, up to a cap), pack (fold), show (only with two players left; on a tie
 * the player asking loses), or all in when you can't afford to call (every hand left is then
 * shown and the best takes the pot). Seeing your cards doesn't use your turn.
 */
import { secureRandomInt, shuffle } from '../blackjack/engine'
import { GameError, buildDeck, cleanName } from './engine'

export const TP_MIN_SEATS = 2
export const TP_MAX_SEATS = 6
export const HAND_OPTIONS = [5, 10, 20, 30]
export const DEFAULT_HANDS = 10
export const BOOT = 10
export const START_CHIPS = 1000
// The blind stake stops doubling here (seen players pay twice this): 80 blind / 160 seen, so a
// 1,000-chip stack lasts several hands instead of going in one raise war.
export const MAX_STAKE = BOOT * 8

const fail = (message, code) => {
  throw new GameError(message, code)
}

/* ---------- Hands ---------- */

const VALUE = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 }
export const HAND_NAMES = { 6: 'Trail', 5: 'Pure sequence', 4: 'Sequence', 3: 'Color', 2: 'Pair', 1: 'High card' }

/**
 * Comparable strength of a 3-card hand: [category, tie-breakers...], higher is better.
 * Categories: 6 trail, 5 pure sequence, 4 sequence, 3 color, 2 pair, 1 high card.
 * A-K-Q is the best sequence and A-2-3 the second best.
 */
export const handRank = (cards) => {
  const v = cards.map((c) => VALUE[c.rank]).sort((a, b) => b - a)
  const suited = cards.every((c) => c.suit === cards[0].suit)
  let run = null
  if (new Set(v).size === 3) {
    if (v[0] - v[1] === 1 && v[1] - v[2] === 1) run = v[0] === 14 ? 100 : v[0]
    else if (v[0] === 14 && v[1] === 3 && v[2] === 2) run = 99
  }
  if (v[0] === v[2]) return [6, v[0]]
  if (run && suited) return [5, run]
  if (run) return [4, run]
  if (suited) return [3, ...v]
  if (v[0] === v[1]) return [2, v[0], v[2]]
  if (v[1] === v[2]) return [2, v[1], v[0]]
  return [1, ...v]
}

/** > 0 when hand a beats hand b, < 0 when it loses, 0 for a tie. */
export const compareHands = (a, b) => {
  const ra = handRank(a)
  const rb = handRank(b)
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
    const d = (ra[i] ?? 0) - (rb[i] ?? 0)
    if (d) return d
  }
  return 0
}

export const handName = (cards) => HAND_NAMES[handRank(cards)[0]]

/* ---------- Room ---------- */

export const createTeenPattiState = (host, totalHands = DEFAULT_HANDS) => {
  const name = cleanName(host.name)
  if (!name) fail('Enter your name.')
  if (!HAND_OPTIONS.includes(totalHands)) fail('Pick a valid number of hands.')
  return {
    game: 'teenpatti',
    status: 'lobby', // 'lobby' -> 'betting' -> 'handEnd' ... -> 'finished'
    hostId: host.id,
    players: [{ id: host.id, name }],
    locked: false,
    maxSeats: TP_MAX_SEATS,
    totalHands,
    boot: BOOT,
    startChips: START_CHIPS,
    hand: 0,
    dealer: 0,
    dealId: 0,
    gameId: null,
    chips: [],
    cards: [],
    seen: [],
    folded: [],
    bets: [], // chips each seat has put in this hand
    pot: 0,
    stake: BOOT, // what a blind player pays to stay in; seen players pay double
    turn: null,
    lastAction: null, // { seat, type, amount }
    result: null, // { winners, reason, pot, shown: { seat: cards } }
    rounds: [], // one entry per finished hand: { hand, winners, pot, reason, chips }
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

export const setTotalHands = (state, playerId, totalHands) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby') fail('The game has already started.')
  if (!HAND_OPTIONS.includes(totalHands)) fail('Pick a valid number of hands.')
  return { ...structuredClone(state), totalHands }
}

const withChips = (s) => s.chips.filter((c) => c >= s.boot).length

const begin = (next, randInt) => {
  next.gameId = Array.from({ length: 16 }, () => randInt(36).toString(36)).join('')
  next.hand = 1
  next.rounds = []
  next.endedEarly = false
  next.chips = next.players.map(() => next.startChips)
  next.dealer = randInt(next.players.length)
  return deal(next, randInt)
}

export const startTeenPatti = (state, playerId, randInt = secureRandomInt) => {
  requireHost(state, playerId)
  if (state.status !== 'lobby' && state.status !== 'finished') fail('The game has already started.')
  if (state.players.length < TP_MIN_SEATS) fail(`You need at least ${TP_MIN_SEATS} players to start.`)
  return begin(structuredClone(state), randInt)
}

export const restartTeenPatti = (state, playerId, randInt = secureRandomInt) => {
  requireHost(state, playerId)
  if (state.status === 'lobby') fail('The game has not started yet.')
  return begin(structuredClone(state), randInt)
}

/** Next seat after `from` that is still in the hand. */
const nextLive = (s, from) => {
  const n = s.players.length
  for (let i = 1; i <= n; i++) {
    const seat = (from + i) % n
    if (!s.folded[seat]) return seat
  }
  return from
}
const liveSeats = (s) => s.players.map((_, i) => i).filter((i) => !s.folded[i])

/** Deals a hand (mutates `next`, already a copy). Players without the boot sit it out. */
const deal = (next, randInt) => {
  if (withChips(next) < 2) return finish(next)
  const deck = shuffle(buildDeck(), randInt)
  let d = 0
  next.cards = next.players.map((_, i) => (next.chips[i] >= next.boot ? deck.slice(3 * d, 3 * ++d) : []))
  next.folded = next.players.map((_, i) => next.chips[i] < next.boot)
  next.seen = next.players.map(() => false)
  next.bets = next.players.map((_, i) => (next.folded[i] ? 0 : next.boot))
  next.chips = next.chips.map((c, i) => (next.folded[i] ? c : c - next.boot))
  next.pot = next.bets.reduce((a, b) => a + b, 0)
  next.stake = next.boot
  next.turn = nextLive(next, next.dealer)
  next.lastAction = null
  next.result = null
  next.status = 'betting'
  next.dealId += 1
  return next
}

const finish = (next) => {
  next.status = 'finished'
  next.turn = null
  return next
}

/** Pays the pot to `winners` (split, remainder to the first) and closes the hand. */
const settle = (next, winners, reason, shownSeats = []) => {
  const share = Math.floor(next.pot / winners.length)
  winners.forEach((w, i) => {
    next.chips[w] += share + (i === 0 ? next.pot - share * winners.length : 0)
  })
  next.result = {
    winners,
    reason, // 'fold' | 'show' | 'allin'
    pot: next.pot,
    shown: Object.fromEntries(shownSeats.map((s) => [s, next.cards[s]])),
  }
  next.rounds.push({ hand: next.hand, winners, pot: next.pot, reason, chips: [...next.chips] })
  next.pot = 0
  next.turn = null
  next.status = next.hand >= next.totalHands || withChips(next) < 2 ? 'finished' : 'handEnd'
  return next
}

/* ---------- Betting ---------- */

/** What `seat` pays to stay in (chaal), and to raise. */
export const costs = (state, seat) => {
  const call = state.seen[seat] ? state.stake * 2 : state.stake
  const canRaise = state.stake * 2 <= MAX_STAKE
  return { call, raise: canRaise ? call * 2 : null }
}

/** The moves `seat` can make right now (for the UI and the bots). */
export const options = (state, seat) => {
  const mine = state.status === 'betting' && state.turn === seat && !state.folded[seat]
  const { call, raise } = costs(state, seat)
  const chips = state.chips[seat] ?? 0
  const live = liveSeats(state).length
  return {
    see: state.status === 'betting' && !state.folded[seat] && !state.seen[seat] && Boolean(state.cards[seat]?.length),
    chaal: mine && chips >= call,
    raise: mine && raise !== null && chips >= raise,
    show: mine && live === 2 && chips >= call,
    allIn: mine && chips < call && chips > 0,
    pack: mine,
    call,
    raiseTo: raise,
  }
}

const requireTurn = (state, playerId) => {
  const seat = requireSeat(state, playerId)
  if (state.status !== 'betting') fail('Betting is closed.')
  if (state.turn !== seat) fail('It is not your turn.')
  if (state.folded[seat]) fail('You have packed this hand.')
  return seat
}

const pay = (next, seat, amount) => {
  next.chips[seat] -= amount
  next.bets[seat] += amount
  next.pot += amount
}

/** Look at your cards. Any time during the hand; it doesn't use your turn. */
export const seeCards = (state, playerId) => {
  const seat = requireSeat(state, playerId)
  if (state.status !== 'betting') fail('There is no hand being played.')
  if (state.folded[seat]) fail('You have packed this hand.')
  if (state.seen[seat]) return state
  const next = structuredClone(state)
  next.seen[seat] = true
  next.lastAction = { seat, type: 'see', amount: 0 }
  return next
}

export const chaal = (state, playerId) => {
  const seat = requireTurn(state, playerId)
  const { call } = costs(state, seat)
  if (state.chips[seat] < call) fail('Not enough chips to chaal. Go all in or pack.')
  const next = structuredClone(state)
  pay(next, seat, call)
  next.lastAction = { seat, type: 'chaal', amount: call }
  next.turn = nextLive(next, seat)
  return next
}

export const raise = (state, playerId) => {
  const seat = requireTurn(state, playerId)
  const { raise: amount } = costs(state, seat)
  if (amount === null) fail('The stake is at its limit. You can chaal or pack.')
  if (state.chips[seat] < amount) fail('Not enough chips to raise.')
  const next = structuredClone(state)
  next.stake *= 2
  pay(next, seat, amount)
  next.lastAction = { seat, type: 'raise', amount }
  next.turn = nextLive(next, seat)
  return next
}

export const pack = (state, playerId) => {
  const seat = requireTurn(state, playerId)
  const next = structuredClone(state)
  next.folded[seat] = true
  next.lastAction = { seat, type: 'pack', amount: 0 }
  const live = liveSeats(next)
  if (live.length === 1) return settle(next, live, 'fold')
  next.turn = nextLive(next, seat)
  return next
}

/** With two players left: pay to stay in and compare. On a tie the player asking loses. */
export const show = (state, playerId) => {
  const seat = requireTurn(state, playerId)
  const live = liveSeats(state)
  if (live.length !== 2) fail('A show is only possible when two players are left.')
  const { call } = costs(state, seat)
  if (state.chips[seat] < call) fail('Not enough chips for a show. Go all in or pack.')
  const next = structuredClone(state)
  pay(next, seat, call)
  next.lastAction = { seat, type: 'show', amount: call }
  const other = live.find((s) => s !== seat)
  const winner = compareHands(next.cards[seat], next.cards[other]) > 0 ? seat : other
  return settle(next, [winner], 'show', live)
}

/** Can't afford to stay in: put in everything; every hand left is shown and the best wins. */
export const allIn = (state, playerId) => {
  const seat = requireTurn(state, playerId)
  const { call } = costs(state, seat)
  if (state.chips[seat] >= call) fail('You can afford to chaal, so all in isn’t needed.')
  if (state.chips[seat] <= 0) fail('You have no chips left.')
  const next = structuredClone(state)
  pay(next, seat, next.chips[seat])
  next.lastAction = { seat, type: 'allin', amount: next.bets[seat] }
  const live = liveSeats(next)
  let best = [live[0]]
  for (const s of live.slice(1)) {
    const d = compareHands(next.cards[s], next.cards[best[0]])
    if (d > 0) best = [s]
    else if (d === 0) best.push(s)
  }
  return settle(next, best, 'allin', live)
}

/** Anyone at the table deals the next hand once the last one is settled. */
export const nextHand = (state, playerId, randInt = secureRandomInt) => {
  requireSeat(state, playerId)
  if (state.status !== 'handEnd') fail('The hand is not over yet.')
  const next = structuredClone(state)
  next.hand += 1
  // The deal moves to the next player who can still afford the boot.
  const n = next.players.length
  for (let i = 1; i <= n; i++) {
    const seat = (next.dealer + i) % n
    if (next.chips[seat] >= next.boot) {
      next.dealer = seat
      break
    }
  }
  return deal(next, randInt)
}

/** Host: stop now. Chips bet in an unfinished hand go back; with nothing played, back to the lobby. */
export const endTeenPatti = (state, playerId) => {
  requireHost(state, playerId)
  if (state.status === 'lobby' || state.status === 'finished') fail('There is no game in progress.')
  const next = structuredClone(state)
  if (next.status === 'betting') {
    next.chips = next.chips.map((c, i) => c + next.bets[i])
    next.pot = 0
  }
  next.turn = null
  next.cards = next.players.map(() => [])
  if (next.rounds.length === 0) {
    next.status = 'lobby'
    next.hand = 0
    return next
  }
  next.endedEarly = true
  next.status = 'finished'
  return next
}

/* ---------- Bots ---------- */

export const isTeenPattiBotTurn = (state) => state.status === 'betting' && Boolean(state.players[state.turn]?.bot)

/**
 * A bot's move: blind for its first couple of bets, then it looks. Strong hands raise, decent
 * hands call (and ask for a show heads-up), weak hands pack once the price goes up.
 */
export const teenPattiBotMove = (state, playerId) => {
  const actor = seatOf(state, playerId)
  if (actor < 0 || state.players[actor].bot) fail('You are not seated at this table.')
  if (!isTeenPattiBotTurn(state)) fail('It is not a bot’s turn.')
  const seat = state.turn
  const botId = state.players[seat].id
  let s = state
  if (!s.seen[seat] && s.bets[seat] >= s.boot * 3) s = seeCards(s, botId)

  const o = options(s, seat)
  const [category, top] = handRank(s.cards[seat])
  const live = liveSeats(s).length
  if (o.allIn) return category >= 2 ? allIn(s, botId) : pack(s, botId)
  if (!s.seen[seat]) return o.chaal ? chaal(s, botId) : pack(s, botId)
  if (live === 2 && o.show && (category >= 2 || s.bets[seat] >= s.boot * 20)) return show(s, botId)
  // Raise with a sequence or better, but only while the stake is still low (or with a trail / pure sequence).
  if (o.raise && (category >= 5 || (category >= 4 && s.stake <= s.boot * 2))) return raise(s, botId)
  if (category >= 2 && o.chaal) return chaal(s, botId)
  if (category === 1 && top >= 13 && o.chaal && o.call <= s.boot * 4) return chaal(s, botId)
  return pack(s, botId)
}

/* ---------- Views ---------- */

export const teenPattiStatus = (state, mySeat) => {
  const name = (seat) => (seat === mySeat ? 'You' : state.players[seat]?.name ?? 'Someone')
  if (state.status === 'betting') return state.turn === mySeat ? 'Your turn' : `${name(state.turn)} to bet`
  if (state.status === 'handEnd') return `Hand ${state.hand} over`
  if (state.status === 'finished') return 'Game over'
  return 'Waiting for players'
}

export const describeAction = (state, mySeat, action = state.lastAction) => {
  if (!action) return null
  const who = action.seat === mySeat ? 'You' : state.players[action.seat]?.name
  const verbs = { see: 'looked at the cards', chaal: `played chaal (${action.amount})`, raise: `raised to ${action.amount}`, pack: 'packed', show: `asked for a show (${action.amount})`, allin: `went all in (${action.amount})` }
  return `${who} ${verbs[action.type] ?? action.type}`
}
