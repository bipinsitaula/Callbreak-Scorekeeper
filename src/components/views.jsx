import { useState } from 'react'
import { FaGamepad, FaTrophy } from 'react-icons/fa'
import { FiMoon, FiPlay, FiSun, FiTrash2, FiWifiOff } from 'react-icons/fi'
import { useGameStore } from '../store'
import { isGameComplete } from '../utils/helpers'
import { useToastStore } from '../hooks/useToast'
import BackHome from './BackHome'
import ConfirmDialog from './ConfirmDialog'
import EmptyState from './EmptyState'
import HistoryPanel from './HistoryPanel'
import InsightsPanel from './InsightsPanel'
import PlayerSetup from './PlayerSetup'
import RoundTracker from './RoundTracker'
import ScoreBoard from './ScoreBoard'
import ScoreHistory from './ScoreHistory'
import { ResultsBanner } from './GameOver'

/** Call Break setup: a way back into a game in progress, and past games. */
export function SetupView() {
  const started = useGameStore((s) => s.started)
  const currentRound = useGameStore((s) => s.currentRound)
  const totalRounds = useGameStore((s) => s.totalRounds)
  const setView = useGameStore((s) => s.setView)
  const inProgress = started && !isGameComplete(currentRound, totalRounds)

  return (
    <div className="space-y-6">
      <BackHome />
      {inProgress && (
        <div className="panel flex flex-col items-center justify-between gap-3 !border-accent/40 !py-4 sm:flex-row">
          <p className="font-bold text-ink">
            Game in progress{' '}
            <span className="font-medium text-mute">(round {Math.min(currentRound, totalRounds)} of {totalRounds})</span>
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setView('play')}>
            <FiPlay className="h-4 w-4" fill="currentColor" aria-hidden="true" />
            Resume game
          </button>
        </div>
      )}
      <PlayerSetup />
      <HistoryPanel />
    </div>
  )
}

function NoGame({ icon, message }) {
  const setView = useGameStore((s) => s.setView)
  return (
    <EmptyState
      icon={icon}
      title="No game in progress"
      message={message}
      action={
        <button type="button" className="btn btn-primary" onClick={() => setView('setup')}>
          Set up a game
        </button>
      }
    />
  )
}

export function PlayView() {
  const started = useGameStore((s) => s.started)
  return (
    <div className="space-y-6">
      <BackHome />
      {!started ? (
        <NoGame icon={FaGamepad} message="Set up your players first, then come back here to enter bids and tricks." />
      ) : (
        <>
          <ResultsBanner />
          <RoundTracker />
        </>
      )}
    </div>
  )
}

export function LeaderboardView() {
  const started = useGameStore((s) => s.started)
  const historyCount = useGameStore((s) => s.history.length)

  return (
    <div className="space-y-6">
      <BackHome />
      {started ? (
        <>
          <ResultsBanner />
          <ScoreBoard />
          <InsightsPanel />
          <ScoreHistory />
        </>
      ) : (
        historyCount === 0 && (
          <NoGame icon={FaTrophy} message="Standings, the score chart and round-by-round scores show up here once a game starts." />
        )
      )}
      <HistoryPanel />
    </div>
  )
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-base text-ink">{title}</h3>
        <p className="text-sm text-mute">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export function SettingsView() {
  const theme = useGameStore((s) => s.theme)
  const setTheme = useGameStore((s) => s.setTheme)
  const started = useGameStore((s) => s.started)
  const resetGame = useGameStore((s) => s.resetGame)
  const historyCount = useGameStore((s) => s.history.length)
  const clearHistory = useGameStore((s) => s.clearHistory)
  const { warning, success } = useToastStore()
  const [confirm, setConfirm] = useState(null)

  const themes = [
    { id: 'dark', label: 'Dark', icon: FiMoon },
    { id: 'light', label: 'Light', icon: FiSun },
  ]

  return (
    <div className="space-y-6">
      <BackHome />
      <section className="panel" aria-labelledby="settings-title">
        <h2 id="settings-title" className="mb-6 text-2xl text-ink">Settings</h2>
        <div className="divide-y divide-line">
          <SettingRow title="Theme" description="Dark is easier on the eyes at a card table.">
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2">
              {themes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={theme === id}
                  onClick={() => setTheme(id)}
                  className="seg flex items-center justify-center gap-2 !px-5"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            title="Current game"
            description={started ? 'Discard the scores and return to setup.' : 'No game is running.'}
          >
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!started}
              onClick={() =>
                setConfirm({
                  title: 'Discard this game?',
                  message: 'The current scores are removed and you return to setup. A finished game is already kept in Past games.',
                  confirmLabel: 'Discard game',
                  onConfirm: () => {
                    resetGame()
                    warning('Game discarded.')
                  },
                })
              }
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              Discard game
            </button>
          </SettingRow>

          <SettingRow title="Past games" description={`${historyCount} saved on this device.`}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={historyCount === 0}
              onClick={() =>
                setConfirm({
                  title: 'Clear past games?',
                  message: "All saved game history is removed from this device. This can't be undone.",
                  confirmLabel: 'Clear history',
                  onConfirm: () => {
                    clearHistory()
                    success('Past games cleared.')
                  },
                })
              }
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              Clear history
            </button>
          </SettingRow>
        </div>
      </section>

      <section className="panel flex items-start gap-4" aria-labelledby="offline-title">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-raised text-accent">
          <FiWifiOff className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 id="offline-title" className="text-base text-ink">Works offline</h3>
          <p className="text-sm text-mute">
            Everything is stored on this device. Install the app from your browser menu to use it without a connection.
          </p>
        </div>
      </section>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={() => {
            confirm.onConfirm()
            setConfirm(null)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
