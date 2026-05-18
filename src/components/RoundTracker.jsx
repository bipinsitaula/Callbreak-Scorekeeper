import { useState } from 'react'
import { useGameStore } from '../store'
import { useToastStore } from '../hooks/useToast'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheck, FiRotateCcw, FiFlag } from 'react-icons/fi'
import BidCard from './BidCard'
import ConfirmDialog from './ConfirmDialog'
import { getCardsPerPlayer } from '../utils/helpers'

export default function RoundTracker() {
  const { players, playerCount, currentRound, totalRounds, submitRound, undoRound, endGameEarly, rounds } =
    useGameStore()
  const { error, success } = useToastStore()
  const [bids, setBids] = useState(Array(playerCount).fill(''))
  const [tricks, setTricks] = useState(Array(playerCount).fill(''))
  const [confirmAction, setConfirmAction] = useState(null)

  const cardsPerPlayer = getCardsPerPlayer(playerCount)
  const isGameComplete = currentRound > totalRounds

  const handleBidChange = (index, value) => {
    const newBids = [...bids]
    newBids[index] = value
    setBids(newBids)
  }

  const handleTrickChange = (index, value) => {
    const newTricks = [...tricks]
    newTricks[index] = value
    setTricks(newTricks)
  }

  const handleSubmitRound = () => {
    const bidValues = []
    const trickValues = []
    let totalTricks = 0

    // Validate and collect inputs
    for (let i = 0; i < playerCount; i++) {
      const bid = parseInt(bids[i])
      const trick = parseInt(tricks[i])

      if (isNaN(bid) || bid < 1 || bid > cardsPerPlayer) {
        error(`Invalid bid for ${players[i]} (must be 1–${cardsPerPlayer})`)
        return
      }
      if (isNaN(trick) || trick < 0 || trick > cardsPerPlayer) {
        error(`Invalid tricks for ${players[i]} (must be 0–${cardsPerPlayer})`)
        return
      }

      bidValues.push(bid)
      trickValues.push(trick)
      totalTricks += trick
    }

    // Validate total tricks
    if (totalTricks !== cardsPerPlayer) {
      error(`Total tricks must equal ${cardsPerPlayer}, you entered ${totalTricks}.`)
      return
    }

    // Submit and reset
    submitRound(bidValues, trickValues)
    setBids(Array(playerCount).fill(''))
    setTricks(Array(playerCount).fill(''))
    success(`Round ${currentRound} recorded ✓`)
  }

  const handleUndo = () => {
    if (rounds.length === 0) {
      error('No rounds to undo.')
      return
    }

    setConfirmAction({
      title: 'Undo Last Round?',
      message: `Round ${rounds.length} entries will be removed.`,
      onConfirm: () => {
        undoRound()
        setConfirmAction(null)
        success('Last round undone.')
      },
    })
  }

  const handleEndGame = () => {
    if (rounds.length === 0) {
      error('Play at least one round before ending.')
      return
    }

    setConfirmAction({
      title: 'End Game Now?',
      message: 'The current standings will become the final result.',
      onConfirm: () => {
        endGameEarly()
        setConfirmAction(null)
      },
    })
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.05 },
    },
  }

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="panel"
      >
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              🎲 Round Manager
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter bids before the round, then tricks after.
            </p>
          </div>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-50 dark:bg-accent-900/30 text-accent-900 dark:text-accent-100 rounded-full font-semibold text-sm border border-accent-200 dark:border-accent-800"
          >
            Round {currentRound} / {totalRounds}
          </motion.div>
        </div>

        {isGameComplete ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <div className="text-4xl mb-3">🏁</div>
            <p className="text-gray-600 dark:text-gray-400">
              All rounds completed. View the final ranking above.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Bid Input Cards */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 uppercase tracking-wider">
                📣 Step 1: Enter Bids & Tricks Won
              </h3>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <AnimatePresence>
                  {players.map((name, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <BidCard
                        playerName={name}
                        playerIndex={idx}
                        bid={bids[idx]}
                        tricks={tricks[idx]}
                        cardsPerPlayer={cardsPerPlayer}
                        onBidChange={(val) => handleBidChange(idx, val)}
                        onTricksChange={(val) => handleTrickChange(idx, val)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitRound}
                className="btn btn-primary flex-1"
              >
                <FiCheck className="w-5 h-5" />
                Submit Round
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUndo}
                className="btn btn-secondary flex-1"
              >
                <FiRotateCcw className="w-5 h-5" />
                Undo Last
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEndGame}
                className="btn btn-ghost flex-1"
              >
                <FiFlag className="w-5 h-5" />
                End Game
              </motion.button>
            </motion.div>
          </>
        )}
      </motion.div>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  )
}
