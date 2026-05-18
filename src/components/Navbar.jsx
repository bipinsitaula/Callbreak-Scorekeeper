import { useGameStore } from '../store'
import { useToastStore } from '../hooks/useToast'
import { FiRotateCcw, FiTrash2, FiMoon, FiSun } from 'react-icons/fi'
import ConfirmDialog from './ConfirmDialog'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Navbar() {
  const { resetGame, clearStorage, theme, toggleTheme, started } = useGameStore()
  const { warning } = useToastStore()
  const [confirmAction, setConfirmAction] = useState(null)

  const handleReset = () => {
    setConfirmAction({
      title: 'Reset Game?',
      message: 'This will clear current scores and return to setup. Your saved game will be removed.',
      onConfirm: () => {
        resetGame()
        setConfirmAction(null)
        warning('Game reset. Ready for a new match.')
      },
    })
  }

  const handleClear = () => {
    setConfirmAction({
      title: 'Clear Saved Game?',
      message: 'This will permanently remove the saved game from your browser.',
      onConfirm: () => {
        clearStorage()
        setConfirmAction(null)
        warning('Saved game cleared.')
      },
    })
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80 transition-all duration-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 dark:from-accent-400 dark:to-accent-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                ♠
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Call Break
              </h1>
            </motion.div>

            {/* Actions */}
            {started && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  title="Reset Game"
                  className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiRotateCcw className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClear}
                  title="Clear Saved Game"
                  className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiTrash2 className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              title="Toggle theme"
              className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? (
                <FiSun className="w-5 h-5" />
              ) : (
                <FiMoon className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </nav>

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
