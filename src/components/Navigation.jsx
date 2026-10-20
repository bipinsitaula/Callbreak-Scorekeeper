import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaGamepad, FaTrophy } from 'react-icons/fa'
import { FiBarChart2, FiChevronDown, FiClock, FiGlobe, FiGrid, FiHome, FiPlay, FiSettings, FiUsers } from 'react-icons/fi'
import { GiCardAceSpades, GiCardKingHearts } from 'react-icons/gi'
import { useGameStore } from '../store'

const HOME = { id: 'hub', label: 'Home', icon: FiHome }
const SETTINGS = { id: 'settings', label: 'Settings', icon: FiSettings }

// Drop-downs: Online games > each online game > its pages. `id` is the page a label opens;
// `group` names the drop-down (two levels can open the same page, e.g. Call Break and Play).
const ONLINE = {
  id: 'onlineGames',
  group: 'online-games',
  label: 'Online games',
  icon: FiGlobe,
  children: [
    {
      id: 'online',
      group: 'online-callbreak',
      label: 'Call Break',
      icon: FiUsers,
      children: [
        { id: 'online', label: 'Play', icon: FiPlay },
        { id: 'onlineHistory', label: 'History', icon: FiClock },
      ],
    },
    {
      id: 'teenpatti',
      group: 'online-teenpatti',
      label: 'Teen Patti',
      icon: GiCardKingHearts,
      children: [
        { id: 'teenpatti', label: 'Play', icon: FiPlay },
        { id: 'teenpattiHistory', label: 'History', icon: FiClock },
      ],
    },
  ],
}

// The rail follows the game you're in, so each game gets its own short list.
const NAV = {
  hub: [HOME, { id: 'setup', label: 'Call Break', icon: FaGamepad }, { ...ONLINE, short: 'Online' }, { id: 'blackjack', label: 'Blackjack', icon: GiCardAceSpades }, SETTINGS],
  online: [HOME, ONLINE, SETTINGS],
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

/** Is `view` this item's page or one of the pages under it? */
const inGroup = (item, view) => item.id === view || Boolean(item.children?.some((c) => inGroup(c, view)))

function useNav() {
  const view = useGameStore((s) => s.view)
  const section = useGameStore((s) => s.section)
  const setView = useGameStore((s) => s.setView)
  return { view, items: NAV[section] ?? NAV.hub, setView }
}

const railBtn = (active) =>
  `group/rail relative flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
    active ? 'text-accent' : 'text-mute hover:bg-raised hover:text-ink'
  }`

// The active highlight is one shared shape that glides to whichever item you pick.
const GLIDE = { type: 'spring', stiffness: 500, damping: 38 }

function RailLink({ item, active, onClick, nested = false }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`${railBtn(active)} ${nested ? '!py-2.5' : ''}`}
    >
      {active && (
        <>
          <motion.span layoutId="rail-active-bg" transition={GLIDE} aria-hidden="true" className="absolute inset-0 rounded-xl bg-accent/10" />
          <motion.span layoutId="rail-active-bar" transition={GLIDE} aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r bg-accent" />
        </>
      )}
      <span className="relative flex items-center gap-3.5 transition-transform duration-200 group-hover/rail:translate-x-0.5">
        <Icon className={`${nested ? 'h-4 w-4' : 'h-5 w-5'} flex-shrink-0`} aria-hidden="true" />
        {item.label}
      </span>
    </button>
  )
}

// Which drop-downs are open, kept while you move around (the rail re-renders per section).
const openGroups = new Set()

/**
 * A rail entry with a drop-down. It starts closed and only opens or closes from its arrow;
 * clicking the label just opens that page. The highlight sits on the item you're on, or on
 * the nearest drop-down above it that is closed.
 */
function RailGroup({ item, view, setView, nested = false }) {
  const [open, setOpenState] = useState(() => openGroups.has(item.group))
  const setOpen = (next) => {
    if (next) openGroups.add(item.group)
    else openGroups.delete(item.group)
    setOpenState(next)
  }
  const here = inGroup(item, view)
  const shownBelow = open && item.children.some((c) => inGroup(c, view))
  const active = here && !shownBelow
  const listId = `nav-${item.group}`

  return (
    <>
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <RailLink item={item} active={active} onClick={() => setView(item.id)} nested={nested} />
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${open ? 'Hide' : 'Show'} ${item.label} pages`}
          className={`flex ${nested ? 'h-10' : 'h-11'} w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-raised hover:text-ink ${
            here ? 'text-accent' : 'text-mute'
          }`}
        >
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex">
            <FiChevronDown className="h-4 w-4" aria-hidden="true" />
          </motion.span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={listId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="ml-6 mt-1 space-y-1 overflow-hidden border-l border-line pl-2"
          >
            {item.children.map((child) => (
              <li key={child.group ?? child.id}>
                {child.children ? (
                  <RailGroup item={child} view={view} setView={setView} nested />
                ) : (
                  <RailLink item={child} active={view === child.id} onClick={() => setView(child.id)} nested />
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  )
}

/** Left rail on tablet/desktop. */
export function Sidebar() {
  const { view, items, setView } = useNav()
  return (
    <nav aria-label="Main" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 flex-shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
      {/* When the list changes (moving between sections) its items slide in one by one. */}
      <ul className="space-y-1.5" key={items.map((i) => i.id).join()}>
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: 'easeOut' }}
          >
            {item.children ? (
              <RailGroup item={item} view={view} setView={setView} />
            ) : (
              <RailLink item={item} active={view === item.id} onClick={() => setView(item.id)} />
            )}
          </motion.li>
        ))}
      </ul>
      <p className="mt-auto px-4 text-xs text-faint">Made by Bipin Sitaula</p>
    </nav>
  )
}

/** Tab bar on phones. A group shows as one tab (its page lists the games), lit while you're in any of them. */
export function BottomNav() {
  const { view, items, setView } = useNav()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const { id, label, short, icon: Icon } = item
          const active = inGroup(item, view)
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setView(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? 'text-accent' : 'text-mute'
                }`}
              >
                {active && (
                  <motion.span layoutId="tab-active" transition={GLIDE} aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-accent" />
                )}
                <motion.span animate={{ y: active ? -2 : 0, scale: active ? 1.12 : 1 }} transition={GLIDE} className="flex">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </motion.span>
                {short ?? label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
