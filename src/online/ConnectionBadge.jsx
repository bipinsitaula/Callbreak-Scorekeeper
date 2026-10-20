import { FiWifi, FiWifiOff } from 'react-icons/fi'
import { useOnlineStore } from './store'

/** "Live" when realtime updates are flowing, otherwise "Reconnecting". */
export default function ConnectionBadge() {
  const connection = useOnlineStore((s) => s.connection)
  const live = connection === 'live'
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        live ? 'bg-accent/15 text-accent' : 'bg-gold/15 text-gold'
      }`}
    >
      {live ? <FiWifi className="h-3.5 w-3.5" aria-hidden="true" /> : <FiWifiOff className="h-3.5 w-3.5" aria-hidden="true" />}
      {live ? 'Live' : 'Reconnecting…'}
    </span>
  )
}
