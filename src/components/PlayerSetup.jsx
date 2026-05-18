import { useState } from 'react'
import { useGameStore } from '../store'
import { useToastStore } from '../hooks/useToast'
import { motion } from 'framer-motion'
import { FiPlay } from 'react-icons/fi'
import { getCardsPerPlayer, getRemainingCards, getVariantNotes } from '../utils/helpers'

export default function PlayerSetup() {
  const { initializeGame } = useGameStore()
  const { error } = useToastStore()
  const [playerCount, setPlayerCount] = useState(4)
  const [totalRounds, setTotalRounds] = useState(13)
  const [playerNames, setPlayerNames] = useState(
    Array(4)
      .fill(null)
      .map((_, i) => `Player ${i + 1}`)
  )

  const cardsPerPlayer = getCardsPerPlayer(playerCount)
  const remainingCards = getRemainingCards(playerCount)

  const handlePlayerCountChange = (count) => {
    setPlayerCount(count)
    setPlayerNames(
      Array(count)
        .fill(null)
        .map((_, i) => `Player ${i + 1}`)
    )
  }

  const handleNameChange = (index, value) => {
    const newNames = [...playerNames]
    newNames[index] = value
    setPlayerNames(newNames)
  }

  const handleStartGame = () => {
    const names = playerNames.map((n) => n.trim())

    // Validation
    for (let i = 0; i < names.length; i++) {
      if (!names[i]) {
        error(`Please enter a name for Player ${i + 1}`)
        return
      }
    }

    // Check for duplicates
    if (new Set(names).size !== names.length) {
      error('Duplicate name found. Names must be unique.')
      return
    }

    initializeGame(playerCount, names, totalRounds)
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Hero Panel */}
      <motion.div
        variants={itemVariants}
        className="panel table-felt relative overflow-hidden"
      >
        <div className="absolute top-2 right-4 text-3xl opacity-10 tracking-widest">
          ♠ ♥ ♦ ♣
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-50 mb-2">
          ♠ Call Break Scorekeeper
        </h1>
        <p className="text-gray-100 text-base md:text-lg">
          A premium companion for your physical card game. Track bids, tricks, and victories with elegance.
        </p>
      </motion.div>

      {/* Setup Form */}
      <motion.div variants={itemVariants} className="panel">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            🎴 Game Setup
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your players and begin the round
          </p>
        </div>

        <div className="space-y-6">
          {/* Player Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              Number of Players
            </label>
            <select
              value={playerCount}
              onChange={(e) => handlePlayerCountChange(parseInt(e.target.value))}
              className="form-control w-full"
            >
              <option value="2">2 Players</option>
              <option value="3">3 Players</option>
              <option value="4">4 Players (Standard)</option>
              <option value="5">5 Players</option>
            </select>
          </div>

          {/* Variant Info */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 rounded-lg bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800"
          >
            <p className="text-sm text-accent-900 dark:text-accent-100">
              <strong>Setup:</strong> {getVariantNotes(playerCount)} Cards per player:{' '}
              <span className="font-semibold">{cardsPerPlayer}</span>
              {remainingCards > 0 && ` (${remainingCards} card${remainingCards > 1 ? 's' : ''} set aside)`}
            </p>
          </motion.div>

          {/* Player Names */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              Player Names
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playerNames.map((name, idx) => (
                <motion.input
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  placeholder={`Player ${idx + 1}`}
                  maxLength={20}
                  className="form-control"
                />
              ))}
            </div>
          </div>

          {/* Total Rounds */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              Total Rounds
            </label>
            <select
              value={totalRounds}
              onChange={(e) => setTotalRounds(parseInt(e.target.value))}
              className="form-control w-full"
            >
              <option value="5">5 Rounds (Quick)</option>
              <option value="7">7 Rounds</option>
              <option value="10">10 Rounds</option>
              <option value="13">13 Rounds (Traditional)</option>
            </select>
          </div>

          {/* Start Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartGame}
            className="btn btn-primary btn-block mt-8"
          >
            <FiPlay className="w-5 h-5" />
            Start Game
          </motion.button>
        </div>
      </motion.div>

      {/* Rules Preview */}
      <motion.div variants={itemVariants} className="panel">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">📖 Quick Rules</h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <strong>Spades are Trump:</strong> A spade beats any card of another suit. Follow suit if you can; play a trump if you can't follow.
          </div>
          <div>
            <strong>Bidding:</strong> Each player calls how many tricks they'll win before each round.
          </div>
          <div>
            <strong>Scoring:</strong> Meet or exceed your bid? Earn 1 point per trick bid + 0.1 per overtrick. Fall short? Lose the full bid amount.
          </div>
          <div>
            <strong>Winner:</strong> Highest total score after all rounds wins!
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
