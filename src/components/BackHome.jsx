import { FiArrowLeft } from 'react-icons/fi'
import { useGameStore } from '../store'

/** Back link shown at the top of every screen except the Home hub. `to` / `label` point it elsewhere. */
export default function BackHome({ to = 'hub', label = 'Back to home' }) {
  const setView = useGameStore((s) => s.setView)
  return (
    <button type="button" onClick={() => setView(to)} className="btn btn-ghost !min-h-0 !px-3 !py-2">
      <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  )
}
