import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useGameStore } from './store'
import { useBlackjackStore } from './blackjack/store'
import { initRouter } from './router'
import { useOnlineStore } from './online/store'
import './index.css'

// Restore the saved game/theme before the first render so there is no flash of the setup screen.
useGameStore.getState().hydrate()
useBlackjackStore.getState().hydrate()

// Open the screen in the address bar (a reload, bookmark or invite link) and keep the URL in
// step with the app from here on.
useOnlineStore.getState().initAuth()
initRouter()

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
