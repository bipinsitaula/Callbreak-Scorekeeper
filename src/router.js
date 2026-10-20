/**
 * Keeps the address bar and the app in sync, so reloads, bookmarks and the browser's
 * back/forward buttons all work:
 *  - changing screen pushes a history entry (e.g. /online/callbreak),
 *  - joining or leaving a table updates the URL in place (/online/callbreak/ABCDE),
 *  - opening a URL (first load or back/forward) shows that screen, and a table URL
 *    rejoins your seat or fills in the code on the join screen.
 */
import { useGameStore } from './store'
import { useOnlineStore } from './online/store'
import { isSupabaseConfigured } from './online/supabase'
import { parsePath, pathFor } from './routes'

const BASE = import.meta.env.BASE_URL

/** The room the online screen is about: the one you're at, the one you're rejoining, or an invite. */
const roomInView = (online) => online.code ?? (online.resuming ? online.savedCode : null) ?? online.inviteCode

const currentPath = () => {
  const { view } = useGameStore.getState()
  return pathFor(view, view === 'online' ? roomInView(useOnlineStore.getState()) : null, BASE)
}

/** Shows the screen a URL points at. */
const apply = ({ view, room }) => {
  useGameStore.getState().setView(view)
  if (view !== 'online' || !room) return
  const online = useOnlineStore.getState()
  if (online.code) return // already at a table; the URL is corrected to it below
  // resume() waits for the saved sign-in to load, then takes your seat back.
  if (isSupabaseConfigured && online.savedCode === room) online.resume()
  else online.setInviteCode(room)
}

export function initRouter() {
  // Always open at the top. Otherwise the browser restores the old scroll position on what
  // may be a different screen, and a tap meant for your cards could land on something else.
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

  let applying = false
  const sync = (mode) => {
    if (applying) return
    const target = currentPath()
    if (target === window.location.pathname && !window.location.search) return
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', target)
  }

  applying = true
  apply(parsePath(window.location.pathname, window.location.search, BASE))
  applying = false
  sync('replace') // tidy the URL (drops ?room=, fixes unknown paths)

  window.addEventListener('popstate', () => {
    applying = true
    apply(parsePath(window.location.pathname, window.location.search, BASE))
    applying = false
    sync('replace')
  })

  // A new screen is a new history entry; table changes just rewrite the current one.
  useGameStore.subscribe((s, prev) => {
    if (s.view !== prev.view) sync('push')
  })
  useOnlineStore.subscribe((s, prev) => {
    if (roomInView(s) !== roomInView(prev)) sync('replace')
  })
}
