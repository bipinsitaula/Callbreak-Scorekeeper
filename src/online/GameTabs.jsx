import { FiClock, FiPlay } from 'react-icons/fi'
import { useGameStore } from '../store'

const TABS = [
  { view: 'online', label: 'Play', icon: FiPlay },
  { view: 'onlineHistory', label: 'History', icon: FiClock },
]

/** Play / History tabs at the top of an online game's screens. */
export default function GameTabs() {
  const view = useGameStore((s) => s.view)
  const setView = useGameStore((s) => s.setView)
  return (
    <nav aria-label="Call Break online" className="inline-grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface/80 p-1">
      {TABS.map(({ view: v, label, icon: Icon }) => {
        const active = view === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              active ? 'bg-accent text-accent-ink shadow-glow' : 'text-mute hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        )
      })}
    </nav>
  )
}
