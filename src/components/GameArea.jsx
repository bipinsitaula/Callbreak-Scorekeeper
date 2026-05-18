import { useGameStore } from '../store'
import RoundTracker from './RoundTracker'
import ScoreBoard from './ScoreBoard'
import ScoreHistory from './ScoreHistory'
import RulesPanel from './RulesPanel'
import WinnerModal from './modals/WinnerModal'
import { motion } from 'framer-motion'

export default function GameArea() {
  const { started, currentRound, totalRounds } = useGameStore()

  if (!started) return null

  const isGameComplete = currentRound > totalRounds

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Round Tracker */}
        <RoundTracker />

        {/* Score Board / Ranking */}
        <ScoreBoard />

        {/* Score History Table */}
        {!isGameComplete && <ScoreHistory />}
      </motion.div>

      {/* Sidebar for Rules */}
      <div className="hidden lg:block">
        <RulesPanel />
      </div>

      {/* Winner Modal */}
      {isGameComplete && <WinnerModal />}
    </>
  )
}
