/**
 * Utility functions for game logic and helpers
 */

export const getCardsPerPlayer = (playerCount) => {
  return Math.floor(52 / playerCount)
}

export const getRemainingCards = (playerCount) => {
  return 52 - getCardsPerPlayer(playerCount) * playerCount
}

export const calculateScore = (bid, tricks) => {
  if (tricks >= bid) {
    const overtricks = tricks - bid
    return bid + overtricks * 0.1
  }
  return -bid
}

export const getPlayerInitials = (name) => {
  return name
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return String(text).replace(/[&<>"']/g, char => map[char])
}

export const formatScore = (score) => {
  if (score >= 0) {
    return `+${score.toFixed(1)}`
  }
  return score.toFixed(1)
}

export const getRankColor = (rank) => {
  const colors = [
    'from-yellow-400 to-yellow-600',
    'from-gray-300 to-gray-500',
    'from-orange-400 to-orange-600',
  ]
  return colors[Math.min(rank, 2)]
}

export const getVariantNotes = (playerCount) => {
  const notes = {
    2: `2-Player variant: Each player receives 26 cards. Bids range from 1 to 13. A great practice mode; not the traditional format.`,
    3: `3-Player variant: Each player gets 17 cards (1 card is removed or set aside). Bids range from 1 to 8. Faster paced and strategic.`,
    4: `4-Player Standard: Each player receives 13 cards. Bids range from 1 to 13. This is the official Call Break format.`,
    5: `5-Player variant: Each player gets 10 cards (2 cards are set aside). Bids range from 1 to 6. Less common but popular in casual play.`,
  }
  return notes[playerCount] || notes[4]
}
