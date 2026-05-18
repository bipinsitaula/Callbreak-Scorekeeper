import { useEffect } from 'react'
import { useGameStore } from './store'
import Navbar from './components/Navbar'
import PlayerSetup from './components/PlayerSetup'
import GameArea from './components/GameArea'
import ToastContainer from './components/ToastContainer'

export default function App() {
  const { started, theme, loadState, loadTheme } = useGameStore()

  // Initialize theme and load saved game on mount
  useEffect(() => {
    loadTheme()
    loadState()
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gray-50 dark:bg-slate-950 transition-colors duration-400">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
      >
        <span className="select-none whitespace-nowrap text-5xl font-bold uppercase tracking-widest text-accent-500/5 dark:text-accent-300/10 sm:text-7xl lg:text-8xl -rotate-12">
          Made by Bipin Sitaula
        </span>
      </div>
      <Navbar />
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className={started ? 'mx-auto max-w-5xl' : 'mx-auto max-w-7xl'}>
          {started ? <GameArea /> : <PlayerSetup />}
        </div>
      </main>
      <footer className="relative z-10 border-t border-gray-200/70 bg-white/70 px-4 py-4 text-center text-sm font-medium text-gray-600 backdrop-blur dark:border-gray-800/70 dark:bg-slate-950/70 dark:text-gray-400">
        Made by Bipin Sitaula
      </footer>
      <ToastContainer />
    </div>
  )
}
