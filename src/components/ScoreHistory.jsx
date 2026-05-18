import { useState } from 'react'
import { useGameStore } from '../store'
import { motion } from 'framer-motion'
import { formatScore } from '../utils/helpers'
import EditRoundModal from './modals/EditRoundModal'

export default function ScoreHistory() {
  const { players, rounds, getTotals } = useGameStore()
  const [editingRound, setEditingRound] = useState(null)

  const totals = getTotals()
  const leaderIndex = totals.length > 0 ? totals.indexOf(Math.max(...totals)) : -1

  if (rounds.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel text-center py-12"
      >
        <div className="text-3xl mb-2">📋</div>
        <p className="text-gray-600 dark:text-gray-400">
          No rounds played yet — submit your first round to see scores here.
        </p>
      </motion.div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel overflow-hidden"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            📊 Score History
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click any round to edit that round's entries
          </p>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">
                  Round
                </th>
                {players.map((name, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider ${
                      i === leaderIndex
                        ? 'text-accent-600 dark:text-accent-400'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {name} {i === leaderIndex ? '👑' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Round Rows */}
              {rounds.map((round, roundIdx) => (
                <motion.tr
                  key={roundIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: roundIdx * 0.05 }}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    <button
                      onClick={() => setEditingRound(roundIdx)}
                      className="text-accent-600 dark:text-accent-400 hover:underline cursor-pointer font-semibold"
                    >
                      Round {roundIdx + 1} ✎
                    </button>
                  </td>
                  {round.scores.map((score, playerIdx) => (
                    <td key={playerIdx} className="px-4 py-3 text-center">
                      <div
                        className={`font-semibold ${
                          score >= 0
                            ? 'text-accent-600 dark:text-accent-400'
                            : 'text-danger-500 dark:text-danger-400'
                        }`}
                      >
                        {formatScore(score)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {round.bids[playerIdx]}/{round.tricks[playerIdx]}
                      </div>
                    </td>
                  ))}
                </motion.tr>
              ))}

              {/* Totals Row */}
              <motion.tr
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-accent-50 dark:bg-accent-900/30 border-t-2 border-accent-300 dark:border-accent-700"
              >
                <td className="px-4 py-3 font-bold text-accent-900 dark:text-accent-100 uppercase text-sm">
                  Total
                </td>
                {totals.map((total, i) => (
                  <td key={i} className="px-4 py-3 text-center font-bold text-lg text-accent-600 dark:text-accent-400">
                    {formatScore(total)}
                  </td>
                ))}
              </motion.tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {editingRound !== null && (
        <EditRoundModal roundIndex={editingRound} onClose={() => setEditingRound(null)} />
      )}
    </>
  )
}
