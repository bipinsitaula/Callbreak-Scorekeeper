import { useState } from 'react'
import { useGameStore } from '../../store'
import { useToastStore } from '../../hooks/useToast'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheck, FiX } from 'react-icons/fi'
import BidCard from '../BidCard'
import { getCardsPerPlayer } from '../../utils/helpers'

export default function EditRoundModal({ roundIndex, onClose }) {
  const { players, playerCount, rounds, editRound } = useGameStore()
  const { error, success } = useToastStore()

  const round = rounds[roundIndex]
  const cardsPerPlayer = getCardsPerPlayer(playerCount)

  const [bids, setBids] = useState(round.bids.map(String))
  const [tricks, setTricks] = useState(round.tricks.map(String))

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

  const handleSave = () => {
    const bidValues = []
    const trickValues = []
    let totalTricks = 0

    // Validate and collect
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

    // Validate total
    if (totalTricks !== cardsPerPlayer) {
      error(`Total tricks must equal ${cardsPerPlayer}.`)
      return
    }

    // Save
    editRound(roundIndex, bidValues, trickValues)
    success(`Round ${roundIndex + 1} updated.`)
    onClose()
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="my-8 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-slate-900 sm:p-8"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ✏️ Edit Round <span className="text-accent-600 dark:text-accent-400">{roundIndex + 1}</span>
            </h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <FiX className="h-6 w-6 text-gray-600 dark:text-gray-200" />
            </motion.button>
          </motion.div>

          {/* Bid Cards Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
          >
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
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3 sm:flex-row flex-col"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="btn btn-primary flex-1"
            >
              <FiCheck className="w-5 h-5" />
              Save Changes
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
