/**
 * URL <-> screen mapping (pure, unit-tested). The app has no router library: the current
 * screen lives in the game store as `view`, and src/router.js keeps the address bar in sync.
 */

// [view, path relative to the app's base URL]
const ROUTES = [
  ['hub', ''],
  ['setup', 'callbreak/setup'],
  ['play', 'callbreak/play'],
  ['leaderboard', 'callbreak/leaderboard'],
  ['blackjack', 'blackjack'],
  ['record', 'blackjack/record'],
  ['onlineGames', 'online'],
  ['online', 'online/callbreak'],
  ['onlineHistory', 'online/callbreak/history'],
  ['settings', 'settings'],
]

const ROOM = /^online\/callbreak\/([a-z0-9]{4,8})$/i

const withSlash = (base) => (base.endsWith('/') ? base : `${base}/`)

/** Path for a screen. The online table adds its room code: /online/callbreak/ABCDE. */
export const pathFor = (view, roomCode = null, base = '/') => {
  const path = ROUTES.find(([v]) => v === view)?.[1] ?? ''
  return withSlash(base) + (view === 'online' && roomCode ? `${path}/${roomCode}` : path)
}

/**
 * Screen (and room code, if any) for a URL. Unknown paths fall back to the Home hub.
 * Old invite links (?room=CODE) still work.
 */
export const parsePath = (pathname, search = '', base = '/') => {
  const root = withSlash(base)
  let rest = pathname.startsWith(root) ? pathname.slice(root.length) : pathname.replace(/^\/+/, '')
  rest = decodeURIComponent(rest).replace(/\/+$/, '')

  const legacy = new URLSearchParams(search).get('room')
  if (legacy && /^[a-z0-9]{4,8}$/i.test(legacy)) return { view: 'online', room: legacy.toUpperCase() }

  // Fixed pages first, so /online/callbreak/history isn't read as a room code.
  const hit = ROUTES.find(([, p]) => p === rest)
  if (hit) return { view: hit[0], room: null }

  const room = rest.match(ROOM)
  if (room) return { view: 'online', room: room[1].toUpperCase() }
  return { view: 'hub', room: null }
}
