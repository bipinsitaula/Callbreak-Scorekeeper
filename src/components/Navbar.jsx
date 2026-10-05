import { FiHelpCircle, FiMoon, FiSun, FiUser } from 'react-icons/fi'
import { GiSpades } from 'react-icons/gi'
import { useGameStore } from '../store'

const iconBtn =
  'flex h-10 w-10 items-center justify-center rounded-full border border-line text-mute transition-colors hover:border-accent/60 hover:text-ink'

/** Top bar: brand, rules, theme, settings. */
export default function Navbar({ onOpenRules }) {
  const theme = useGameStore((s) => s.theme)
  const toggleTheme = useGameStore((s) => s.toggleTheme)
  const setView = useGameStore((s) => s.setView)

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-base/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <button type="button" onClick={() => setView('hub')} className="flex items-center gap-2.5 rounded-lg" aria-label="Card Table home">
          <GiSpades className="h-8 w-8 text-accent" aria-hidden="true" />
          <span className="text-xl font-extrabold text-ink">Card Table</span>
        </button>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenRules} title="Rules & guide (?)" aria-label="Open rules and guide" className={iconBtn}>
            <FiHelpCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className={iconBtn}
          >
            {theme === 'dark' ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => setView('settings')} title="Settings" aria-label="Open settings" className={iconBtn}>
            <FiUser className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
