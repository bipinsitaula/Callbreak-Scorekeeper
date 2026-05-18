import { useGameStore } from '../store'
import { motion } from 'framer-motion'
import { formatScore, getPlayerInitials } from '../utils/helpers'

export default function ScoreBoard() {
  const { players, rounds, getTotals } = useGameStore()

  const totals = getTotals()
  const ranked = players
    .map((name, i) => ({ name, score: totals[i], index: i }))
    .sort((a, b) => b.score - a.score)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="panel"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          🏆 Current Ranking
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Live leaderboard after each round
        </p>
      </div>

      {rounds.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-8 text-center text-gray-500 dark:text-gray-400"
        >
          <div className="text-3xl mb-2">📊</div>
          <p>Start playing to see rankings</p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-3">
          {ranked.map((player, rank) => (
            <motion.div
              key={player.index}
              variants={itemVariants}
              whileHover={{ x: 4 }}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                rank === 0
                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700'
                  : rank === 1
                    ? 'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-300 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Rank Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 * rank, type: 'spring', stiffness: 200 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  rank === 0
                    ? 'bg-yellow-400 dark:bg-yellow-500 text-yellow-900 dark:text-yellow-100'
                    : rank === 1
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                      : 'bg-orange-300 dark:bg-orange-600 text-orange-900 dark:text-orange-100'
                }`}
              >
                {rank === 0 ? '👑' : rank + 1}
              </motion.div>

              {/* Player Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 dark:from-accent-400 dark:to-accent-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {getPlayerInitials(player.name)}
              </div>

              {/* Player Name */}
              <div className="flex-1 font-semibold text-gray-900 dark:text-gray-100 truncate">
                {player.name}
              </div>

              {/* Score */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`text-lg font-bold ${
                  player.score >= 0
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-danger-500 dark:text-danger-400'
                }`}
              >
                {formatScore(player.score)}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
