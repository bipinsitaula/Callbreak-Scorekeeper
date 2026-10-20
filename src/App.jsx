import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useGameStore } from './store'
import Navbar from './components/Navbar'
import { BottomNav, Sidebar } from './components/Navigation'
import { LeaderboardView, PlayView, SettingsView, SetupView } from './components/views'
import HubView from './components/HubView'
import BlackjackTable from './blackjack/BlackjackTable'
import BlackjackRecord from './blackjack/BlackjackRecord'
import OnlineView from './online/OnlineView'
import OnlineGamesView from './online/OnlineGamesView'
import OnlineHistoryView from './online/OnlineHistoryView'
import AccountGate from './online/AccountGate'
import { GameOverModal } from './components/GameOver'
import CardArt from './components/CardArt'
import RulesPanel from './components/RulesPanel'
import ToastContainer from './components/ToastContainer'

const VIEWS = {
  hub: HubView,
  setup: SetupView,
  play: PlayView,
  leaderboard: LeaderboardView,
  blackjack: BlackjackTable,
  record: BlackjackRecord,
  onlineGames: OnlineGamesView,
  online: () => <OnlineView gameId="callbreak" />,
  onlineHistory: () => <OnlineHistoryView gameId="callbreak" />,
  teenpatti: () => <OnlineView gameId="teenpatti" />,
  teenpattiHistory: () => <OnlineHistoryView gameId="teenpatti" />,
  settings: SettingsView,
}

// Online screens need a signed-in account.
const NEEDS_ACCOUNT = new Set(['onlineGames', 'online', 'onlineHistory', 'teenpatti', 'teenpattiHistory'])

const isTyping = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export default function App() {
  const theme = useGameStore((s) => s.theme)
  const view = useGameStore((s) => s.view)
  const [rulesOpen, setRulesOpen] = useState(false)

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#070d1a' : '#eef4f8')
  }, [theme])

  // Start each screen at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  // "?" opens the rules guide
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(document.activeElement)) {
        e.preventDefault()
        setRulesOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const View = VIEWS[view] ?? HubView

  return (
    // Respect the OS "reduce motion" setting for every framer-motion animation.
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-clip">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <CardArt className="absolute -bottom-10 -left-16 hidden h-72 w-96 -rotate-12 opacity-[0.06] md:block" />
          <CardArt className="absolute -right-20 top-1/3 hidden h-80 w-[26rem] rotate-[20deg] opacity-[0.06] md:block" />
        </div>

        <Navbar onOpenRules={() => setRulesOpen(true)} />

        <div className="relative z-10 flex">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-10">
            <div className="mx-auto max-w-4xl">
              {/* Each screen fades and slides in; the old one fades out first. */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {NEEDS_ACCOUNT.has(view) ? (
                    <AccountGate>
                      <View />
                    </AccountGate>
                  ) : (
                    <View />
                  )}
                </motion.div>
              </AnimatePresence>
              <p className="mt-10 text-center text-xs text-faint md:hidden">Made by Bipin Sitaula</p>
            </div>
          </main>
        </div>

        <BottomNav />
        <GameOverModal />
        <ToastContainer />
        {rulesOpen && <RulesPanel onClose={() => setRulesOpen(false)} />}
      </div>
    </MotionConfig>
  )
}
