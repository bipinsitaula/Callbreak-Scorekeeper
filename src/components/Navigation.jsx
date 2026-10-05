import { FaGamepad, FaTrophy } from 'react-icons/fa'
import { FiBarChart2, FiGrid, FiHome, FiSettings } from 'react-icons/fi'
import { GiCardAceSpades } from 'react-icons/gi'
import { useGameStore } from '../store'

const HOME = { id: 'hub', label: 'Home', icon: FiHome }
const SETTINGS = { id: 'settings', label: 'Settings', icon: FiSettings }

// The rail follows the game you're in, so each game gets its own short list.
const NAV = {
  hub: [
    HOME,
    { id: 'setup', label: 'Call Break', icon: FaGamepad },
    { id: 'blackjack', label: 'Blackjack', icon: GiCardAceSpades },
    SETTINGS,
  ],
  callbreak: [
    HOME,
    { id: 'setup', label: 'New game', icon: FiGrid },
    { id: 'play', label: 'Play', icon: FaGamepad },
    { id: 'leaderboard', label: 'Leaderboard', icon: FaTrophy },
    SETTINGS,
  ],
  blackjack: [
    HOME,
    { id: 'blackjack', label: 'Table', icon: GiCardAceSpades },
    { id: 'record', label: 'Record', icon: FiBarChart2 },
    SETTINGS,
  ],
}

function useNav() {
  const view = useGameStore((s) => s.view)
  const section = useGameStore((s) => s.section)
  const setView = useGameStore((s) => s.setView)
  return { view, items: NAV[section] ?? NAV.hub, setView }
}

/** Left rail on tablet/desktop. */
export function Sidebar() {
  const { view, items, setView } = useNav()
  return (
    <nav aria-label="Main" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 flex-shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
      <ul className="space-y-1.5">
        {items.map(({ id, label, icon: Icon }) => {
          const active = view === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setView(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  active ? 'bg-accent/10 text-accent' : 'text-mute hover:bg-raised hover:text-ink'
                }`}
              >
                {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r bg-accent" />}
                <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-auto px-4 text-xs text-faint">Made by Bipin Sitaula</p>
    </nav>
  )
}

/** Tab bar on phones. */
export function BottomNav() {
  const { view, items, setView } = useNav()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ id, label, icon: Icon }) => {
          const active = view === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setView(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? 'text-accent' : 'text-mute'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
