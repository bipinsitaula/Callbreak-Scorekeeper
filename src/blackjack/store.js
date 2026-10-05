import { create } from 'zustand'
import {
  CHIPS,
  DECKS,
  MIN_BET,
  START_BANKROLL,
  canSplitCards,
  cardLabel,
  createShoe,
  handValue,
  isBust,
  isNatural,
  needsReshuffle,
  settleHand,
} from './engine'

const SAVE_KEY = 'cardTableBlackjack_v1'
const LOG_LIMIT = 30

const blankStats = () => ({
  rounds: 0,
  hands: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  busts: 0,
  surrenders: 0,
  doubles: 0,
  splits: 0,
  net: 0,
  peak: START_BANKROLL,
  rebuys: 0,
})

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY))
  } catch {
    return null
  }
}

const isNum = (n) => Number.isFinite(n)

/** Validate untrusted saved data; falls back to a fresh account on anything odd. */
const sanitize = (data) => {
  if (!data || typeof data !== 'object') return null
  const stats = { ...blankStats() }
  for (const key of Object.keys(stats)) if (isNum(data.stats?.[key])) stats[key] = data.stats[key]
  if (!isNum(data.bankroll) || data.bankroll < 0) return null
  const log = Array.isArray(data.log)
    ? data.log
        .filter((e) => e && typeof e.id === 'string' && isNum(e.net) && isNum(e.stake))
        .slice(0, LOG_LIMIT)
    : []
  return { bankroll: data.bankroll, lastBet: isNum(data.lastBet) ? data.lastBet : MIN_BET, stats, log }
}

const clampBet = (bet, bankroll) => Math.max(0, Math.min(bet, bankroll))

const summarise = (outcomes) => {
  const unique = [...new Set(outcomes)]
  if (unique.length === 1) return unique[0]
  return 'split'
}

/**
 * Blackjack table state. Phases: 'betting' -> 'player' -> 'dealer' -> 'settled'.
 * The bet is taken from the bankroll when the cards are dealt and the bankroll is saved
 * straight away, so refreshing the page mid-hand forfeits that hand (no escaping a bad one).
 */
export const useBlackjackStore = create((set, get) => ({
  bankroll: START_BANKROLL,
  lastBet: 50,
  stats: blankStats(),
  log: [],

  phase: 'betting',
  bet: 50,
  shoe: createShoe(DECKS),
  reshuffled: false,
  dealer: { cards: [], holeHidden: true },
  hands: [],
  active: 0,
  insurance: 0, // side bet taken when the dealer shows an ace
  result: null, // { net, outcomes, insurance } once settled

  /* ---------- Persistence ---------- */

  persist: () => {
    const { bankroll, lastBet, stats, log } = get()
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ bankroll, lastBet, stats, log }))
    } catch (e) {
      console.warn('Failed to save blackjack data', e)
    }
  },

  hydrate: () => {
    const saved = sanitize(read())
    if (saved) set({ ...saved, bet: clampBet(saved.lastBet, saved.bankroll) })
  },

  /* ---------- Betting ---------- */

  addChip: (value) => {
    const { phase, bet, bankroll } = get()
    if (phase !== 'betting' && phase !== 'settled') return
    set({ bet: clampBet(bet + value, bankroll) })
  },

  clearBet: () => set({ bet: 0 }),

  setBet: (bet) => set({ bet: clampBet(bet, get().bankroll) }),

  /* ---------- Dealing ---------- */

  deal: () => {
    const s = get()
    if (s.phase !== 'betting') return false
    if (s.bet < MIN_BET || s.bet > s.bankroll) return false

    const reshuffled = needsReshuffle(s.shoe.length)
    const shoe = reshuffled ? createShoe(DECKS) : [...s.shoe]
    // Real deal order: player, dealer (up), player, dealer (hole).
    const p1 = shoe.pop()
    const up = shoe.pop()
    const p2 = shoe.pop()
    const hole = shoe.pop()

    set({
      shoe,
      reshuffled,
      bankroll: s.bankroll - s.bet,
      lastBet: s.bet,
      dealer: { cards: [up, hole], holeHidden: true },
      hands: [{ cards: [p1, p2], bet: s.bet, doubled: false, fromSplit: false, done: false }],
      active: 0,
      insurance: 0,
      phase: up.rank === 'A' ? 'insurance' : 'player',
      result: null,
    })

    if (up.rank === 'A') {
      // The dealer only peeks after the player has decided on insurance.
      get().persist()
      return true
    }
    // A natural on either side ends the round immediately (dealer peeks on a ten).
    if (isNatural([p1, p2]) || isNatural([up, hole])) get().finish()
    else get().persist()
    return true
  },

  /** Insurance costs half the bet and pays 2:1 if the dealer has blackjack. */
  insuranceCost: () => Math.floor((get().hands[0]?.bet ?? 0) / 2),

  resolveInsurance: (take) => {
    const s = get()
    if (s.phase !== 'insurance') return
    const cost = s.insuranceCost()
    const insurance = take && s.bankroll >= cost ? cost : 0
    set({ insurance, bankroll: s.bankroll - insurance })

    const { hands, dealer } = get()
    if (isNatural(hands[0].cards) || isNatural(dealer.cards)) get().finish()
    else {
      set({ phase: 'player' })
      get().persist()
    }
  },

  /* ---------- Player actions ---------- */

  hit: () => {
    const s = get()
    if (s.phase !== 'player') return
    const shoe = [...s.shoe]
    const hands = s.hands.map((h) => ({ ...h, cards: [...h.cards] }))
    const hand = hands[s.active]
    hand.cards.push(shoe.pop())
    if (handValue(hand.cards).total >= 21) hand.done = true
    set({ shoe, hands })
    get().advance()
  },

  stand: () => {
    const s = get()
    if (s.phase !== 'player') return
    const hands = s.hands.map((h, i) => (i === s.active ? { ...h, done: true } : h))
    set({ hands })
    get().advance()
  },

  canDouble: () => {
    const s = get()
    const hand = s.hands[s.active]
    return s.phase === 'player' && !!hand && hand.cards.length === 2 && s.bankroll >= hand.bet
  },

  double: () => {
    const s = get()
    if (!s.canDouble()) return
    const shoe = [...s.shoe]
    const hands = s.hands.map((h) => ({ ...h, cards: [...h.cards] }))
    const hand = hands[s.active]
    set({ bankroll: s.bankroll - hand.bet })
    hand.bet *= 2
    hand.doubled = true
    hand.cards.push(shoe.pop())
    hand.done = true
    set({ shoe, hands })
    get().advance()
  },

  canSplit: () => {
    const s = get()
    const hand = s.hands[s.active]
    return (
      s.phase === 'player' && s.hands.length === 1 && !!hand && canSplitCards(hand.cards) && s.bankroll >= hand.bet
    )
  },

  split: () => {
    const s = get()
    if (!s.canSplit()) return
    const shoe = [...s.shoe]
    const original = s.hands[0]
    const aces = original.cards[0].rank === 'A'
    const make = (card) => {
      const cards = [card, shoe.pop()]
      // Split aces get one card each; any 21 after a split is not a natural.
      return { cards, bet: original.bet, doubled: false, fromSplit: true, done: aces || handValue(cards).total === 21 }
    }
    const hands = [make(original.cards[0]), make(original.cards[1])]
    set({ shoe, hands, active: 0, bankroll: s.bankroll - original.bet })
    get().advance()
  },

  canSurrender: () => {
    const s = get()
    const hand = s.hands[0]
    return s.phase === 'player' && s.hands.length === 1 && !!hand && hand.cards.length === 2 && !hand.doubled
  },

  // Late surrender: after the dealer has checked for blackjack, give up the hand for half the bet.
  surrender: () => {
    if (!get().canSurrender()) return
    set({ hands: get().hands.map((h) => ({ ...h, surrendered: true, done: true })) })
    get().finish()
  },

  /** Move to the next unfinished hand, or hand over to the dealer. */
  advance: () => {
    const s = get()
    const next = s.hands.findIndex((h) => !h.done)
    if (next !== -1) {
      set({ active: next })
      get().persist()
      return
    }
    set({ phase: 'dealer' })
    get().persist()
  },

  /* ---------- Dealer ---------- */

  // Called on a timer by the UI so cards appear one at a time.
  dealerStep: () => {
    const s = get()
    if (s.phase !== 'dealer') return
    if (s.dealer.holeHidden) {
      set({ dealer: { ...s.dealer, holeHidden: false } })
      return
    }
    const alive = s.hands.some((h) => !isBust(h.cards))
    if (alive && handValue(s.dealer.cards).total < 17) {
      const shoe = [...s.shoe]
      set({ shoe, dealer: { ...s.dealer, cards: [...s.dealer.cards, shoe.pop()] } })
      return
    }
    get().finish()
  },

  /* ---------- Settlement and records ---------- */

  finish: () => {
    const s = get()
    const dealerCards = s.dealer.cards
    const settled = s.hands.map((h) => ({ hand: h, ...settleHand(h, dealerCards) }))
    const dealerNatural = isNatural(dealerCards)
    const insurancePayout = s.insurance > 0 && dealerNatural ? s.insurance * 3 : 0
    const stake = settled.reduce((sum, r) => sum + r.hand.bet, 0) + s.insurance
    const payout = settled.reduce((sum, r) => sum + r.payout, 0) + insurancePayout
    const net = payout - stake
    const outcomes = settled.map((r) => r.outcome)

    const bankroll = s.bankroll + payout
    const stats = { ...s.stats }
    stats.rounds += 1
    stats.hands += settled.length
    stats.net += net
    stats.peak = Math.max(stats.peak, bankroll)
    stats.splits += settled.length > 1 ? 1 : 0
    settled.forEach(({ outcome, hand }) => {
      if (outcome === 'win' || outcome === 'blackjack') stats.wins += 1
      if (outcome === 'lose' || outcome === 'bust' || outcome === 'surrender') stats.losses += 1
      if (outcome === 'surrender') stats.surrenders += 1
      if (outcome === 'push') stats.pushes += 1
      if (outcome === 'blackjack') stats.blackjacks += 1
      if (outcome === 'bust') stats.busts += 1
      if (hand.doubled) stats.doubles += 1
    })

    const entry = {
      id: `h_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      time: Date.now(),
      stake,
      net,
      result: summarise(outcomes),
      player: settled.map((r) => r.hand.cards.map(cardLabel).join(' ')),
      dealer: dealerCards.map(cardLabel).join(' '),
    }

    set({
      phase: 'settled',
      dealer: { cards: dealerCards, holeHidden: false },
      hands: s.hands.map((h) => ({ ...h, done: true })),
      bankroll,
      stats,
      log: [entry, ...s.log].slice(0, LOG_LIMIT),
      result: { net, outcomes, insurance: s.insurance > 0 ? { bet: s.insurance, paid: dealerNatural } : null },
    })
    get().persist()
  },

  newRound: () => {
    const { bankroll, lastBet } = get()
    set({
      phase: 'betting',
      bet: clampBet(lastBet, bankroll),
      hands: [],
      active: 0,
      insurance: 0,
      dealer: { cards: [], holeHidden: true },
      result: null,
      reshuffled: false,
    })
  },

  /* ---------- Account ---------- */

  rebuy: () => {
    const s = get()
    set({
      bankroll: START_BANKROLL,
      stats: { ...s.stats, rebuys: s.stats.rebuys + 1 },
      bet: Math.min(s.lastBet, START_BANKROLL),
    })
    get().persist()
  },

  resetAll: () => {
    set({
      bankroll: START_BANKROLL,
      lastBet: 50,
      bet: 50,
      stats: blankStats(),
      log: [],
      phase: 'betting',
      hands: [],
      active: 0,
      dealer: { cards: [], holeHidden: true },
      result: null,
      shoe: createShoe(DECKS),
    })
    get().persist()
  },
}))

export { CHIPS, MIN_BET }
