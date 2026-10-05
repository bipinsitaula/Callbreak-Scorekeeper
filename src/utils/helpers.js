/**
 * Pure game logic and helpers (no React, no storage) so everything here is unit-testable.
 *
 * Scores are stored as integer TENTHS of a point (3.1 pts => 31) to avoid
 * floating-point drift when summing 0.1 overtrick increments.
 */

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 5
export const MAX_BID_CAP = 13
export const MAX_ROUNDS = 50

export const getCardsPerPlayer = (playerCount) => Math.floor(52 / playerCount)

export const getRemainingCards = (playerCount) =>
  52 - getCardsPerPlayer(playerCount) * playerCount

/** Highest allowed bid: bids never exceed 13, even when more cards are dealt. */
export const getMaxBid = (playerCount) =>
  Math.min(MAX_BID_CAP, getCardsPerPlayer(playerCount))

/** Score for one player in one round, in tenths of a point. */
export const calculateScore = (bid, tricks) => {
  if (tricks >= bid) return bid * 10 + (tricks - bid)
  return -bid * 10
}

export const computeScores = (bids, tricks) =>
  bids.map((bid, i) => calculateScore(bid, tricks[i]))

/** Total score per player, in tenths. */
export const sumScores = (rounds, playerCount) => {
  const totals = Array(playerCount).fill(0)
  rounds.forEach((round) => {
    round.scores.forEach((score, i) => {
      totals[i] += score
    })
  })
  return totals
}

/** Format tenths as "+3.1" / "−3.0". */
export const formatScore = (tenths) => {
  const value = Math.abs(tenths) / 10
  return `${tenths < 0 ? '−' : '+'}${value.toFixed(1)}`
}

/**
 * Competition ranking ("1, 1, 3"): players on equal scores share a rank.
 * Returns entries sorted by score (ties keep seating order).
 */
export const rankPlayers = (players, totals) =>
  players
    .map((name, index) => ({ name, index, score: totals[index] }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry, _i, all) => ({
      ...entry,
      rank: 1 + all.filter((other) => other.score > entry.score).length,
    }))

/** Indices of every player sharing the top score (empty if there are no players). */
export const getLeaders = (totals) => {
  if (totals.length === 0) return []
  const max = Math.max(...totals)
  return totals.reduce((acc, t, i) => (t === max ? [...acc, i] : acc), [])
}

export const isGameComplete = (currentRound, totalRounds) => currentRound > totalRounds

/* ---------- Dealer rotation ---------- */

export const getDealerIndex = (dealerStart, round, playerCount) =>
  (dealerStart + round - 1) % playerCount

/** Player indices in bidding order: starts left of the dealer, ends with the dealer. */
export const getBidOrder = (dealerIndex, playerCount) =>
  Array.from({ length: playerCount }, (_, i) => (dealerIndex + 1 + i) % playerCount)

/* ---------- Validation (return an error message, or null when valid) ---------- */

/** House rule: all bids together may not exceed the tricks available (`maxTotal`). */
export const validateBids = (bids, { players, maxBid, maxTotal }) => {
  for (let i = 0; i < players.length; i++) {
    const bid = bids[i]
    if (!Number.isInteger(bid)) return `Enter a bid for ${players[i]}.`
    if (bid < 1 || bid > maxBid) return `Invalid bid for ${players[i]} (must be 1–${maxBid}).`
  }
  const total = bids.reduce((sum, b) => sum + b, 0)
  if (maxTotal !== undefined && total > maxTotal) {
    return `Total bids (${total}) cannot exceed the ${maxTotal} tricks available.`
  }
  return null
}

export const sumTricks = (tricks) =>
  tricks.reduce((sum, t) => sum + (Number.isInteger(t) ? t : 0), 0)

export const validateTricks = (tricks, { players, cards }) => {
  for (let i = 0; i < players.length; i++) {
    const trick = tricks[i]
    if (!Number.isInteger(trick)) return `Enter tricks won for ${players[i]}.`
    if (trick < 0 || trick > cards) return `Invalid tricks for ${players[i]} (must be 0–${cards}).`
  }
  const total = sumTricks(tricks)
  if (total !== cards) return `Total tricks must equal ${cards} (currently ${total}).`
  return null
}

/* ---------- Stats ---------- */

export const getPlayerStats = (players, rounds) =>
  players.map((name, index) => {
    const played = rounds.length
    let made = 0
    let exact = 0
    let overtricks = 0
    let bidSum = 0
    let best = null
    let worst = null
    let total = 0
    rounds.forEach((round) => {
      const bid = round.bids[index]
      const tricks = round.tricks[index]
      const score = round.scores[index]
      bidSum += bid
      total += score
      if (tricks >= bid) {
        made++
        overtricks += tricks - bid
      }
      if (tricks === bid) exact++
      if (best === null || score > best) best = score
      if (worst === null || score < worst) worst = score
    })
    return {
      name,
      index,
      played,
      made,
      exact,
      overtricks,
      total,
      best,
      worst,
      avgBid: played ? bidSum / played : 0,
      successRate: played ? Math.round((made / played) * 100) : 0,
    }
  })

/* ---------- Display ---------- */

export const getPlayerInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const VARIANT_INTROS = {
  2: '2-Player variant',
  3: '3-Player variant',
  4: '4-Player Standard',
  5: '5-Player variant',
}

const VARIANT_OUTROS = {
  2: 'A good practice mode; not the traditional format.',
  3: 'Faster paced and more strategic.',
  4: 'This is the official Call Break format.',
  5: 'Less common but popular in casual play.',
}

export const getVariantNotes = (playerCount) => {
  const count = VARIANT_INTROS[playerCount] ? playerCount : 4
  const cards = getCardsPerPlayer(count)
  const left = getRemainingCards(count)
  return `${VARIANT_INTROS[count]}: each player receives ${cards} cards${
    left > 0 ? ` (${left} set aside)` : ''
  }. Bids range from 1 to ${getMaxBid(count)}. ${VARIANT_OUTROS[count]}`
}
