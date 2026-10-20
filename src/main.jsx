import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useGameStore } from './store'
import { useBlackjackStore } from './blackjack/store'
import { useOnlineStore } from './online/store'
import { isSupabaseConfigured } from './online/supabase'
import './index.css'

// Restore the saved game/theme before the first render so there is no flash of the setup screen.
useGameStore.getState().hydrate()
useBlackjackStore.getState().hydrate()

// Always open at the top. Otherwise a reload restores the old scroll position on a different
// screen, and a tap meant for your cards could land on whatever is there now.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

// Invite links (?room=CODE) open the online table with the code filled in.
const invite = new URLSearchParams(window.location.search).get('room')
if (invite) {
  useOnlineStore.getState().setInviteCode(invite)
  useGameStore.getState().setView('online')
  window.history.replaceState(null, '', window.location.pathname)
} else if (isSupabaseConfigured && useOnlineStore.getState().savedCode && useOnlineStore.getState().me.name) {
  // You were at an online table when the page reloaded: go straight back to it.
  useGameStore.getState().setView('online')
  useOnlineStore.getState().resume()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Offline support (production builds only, so dev hot-reload isn't cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((e) => console.warn('Service worker registration failed', e))
  })
}
