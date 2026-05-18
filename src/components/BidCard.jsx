import { motion } from 'framer-motion'
import { getPlayerInitials } from '../utils/helpers'

export default function BidCard({
  playerName,
  bid,
  tricks,
  cardsPerPlayer,
  onBidChange,
  onTricksChange,
}) {
  const initials = getPlayerInitials(playerName)

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="card hover:border-accent-300 dark:hover:border-accent-600"
    >
      {/* Player Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 dark:from-accent-400 dark:to-accent-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate" title={playerName}>
          {playerName}
        </div>
      </div>

      {/* Bid and Tricks Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Bid
          </label>
          <input
            type="number"
            min="1"
            max={cardsPerPlayer}
            value={bid}
            onChange={(e) => onBidChange(e.target.value)}
            placeholder={`1-${cardsPerPlayer}`}
            className="form-control text-center font-semibold text-base w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Tricks
          </label>
          <input
            type="number"
            min="0"
            max={cardsPerPlayer}
            value={tricks}
            onChange={(e) => onTricksChange(e.target.value)}
            placeholder={`0-${cardsPerPlayer}`}
            className="form-control text-center font-semibold text-base w-full"
          />
        </div>
      </div>
    </motion.div>
  )
}
