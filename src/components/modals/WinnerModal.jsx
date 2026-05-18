import { useGameStore } from '../../store'
import { useToastStore } from '../../hooks/useToast'
import { motion } from 'framer-motion'
import { FiRotateCw } from 'react-icons/fi'
import { formatScore } from '../../utils/helpers'

export default function WinnerModal() {
  const { players, getTotals, resetGame } = useGameStore()
  const { success } = useToastStore()

  const totals = getTotals()
  const maxScore = Math.max(...totals)
  const winners = players.filter((_, i) => totals[i] === maxScore)
  const winnerStr = winners.length > 1 ? `Tie: ${winners.join(' & ')}` : winners[0]

  const handleNewGame = () => {
    resetGame()
    success('New game started!')
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  }

  const contentVariants = {
    hidden: { scale: 0.8, opacity: 0, y: 20 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200 } },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-2xl dark:border-gray-700 dark:bg-slate-900 sm:p-12"
      >
        {/* Trophy Animation */}
        <motion.div
          variants={contentVariants}
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="text-6xl mb-4"
        >
          🏆
        </motion.div>

        {/* Title */}
        <motion.h2
          variants={contentVariants}
          className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2"
        >
          Game Complete!
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          variants={contentVariants}
          className="mb-4 text-gray-700 dark:text-gray-200"
        >
          The winner is
        </motion.p>

        {/* Winner Name */}
        <motion.div
          variants={contentVariants}
          className="text-2xl sm:text-3xl font-bold text-accent-600 dark:text-accent-400 mb-3 min-h-12 flex items-center justify-center"
        >
          {winnerStr}
        </motion.div>

        {/* Final Score */}
        <motion.p
          variants={contentVariants}
          className="mb-8 text-sm text-gray-600 dark:text-gray-300"
        >
          Final Score: <span className="font-semibold text-lg text-accent-600 dark:text-accent-400">{formatScore(maxScore)}</span>
        </motion.p>

        {/* All Scores */}
        <motion.div
          variants={contentVariants}
          className="mb-8 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-slate-800"
        >
          {players.map((name, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-gray-700 dark:text-gray-300">{name}</span>
              <span className={`font-semibold ${totals[i] >= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-danger-500 dark:text-danger-400'}`}>
                {formatScore(totals[i])}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          variants={contentVariants}
          className="flex gap-3 flex-col sm:flex-row"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNewGame}
            className="btn btn-primary flex-1"
          >
            <FiRotateCw className="w-5 h-5" />
            Start New Game
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
