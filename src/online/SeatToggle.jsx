import { FaRobot, FaUser } from 'react-icons/fa'

const OPTIONS = [
  { value: 'player', label: 'Player', icon: FaUser },
  { value: 'bot', label: 'Bot', icon: FaRobot },
]

/** Two-icon switch for a seat: wait for a person, or fill it with a bot. */
export default function SeatToggle({ value, onChange, disabled = false, seatLabel }) {
  return (
    <div role="radiogroup" aria-label={`${seatLabel}: player or bot`} className="flex flex-shrink-0 rounded-full border border-line bg-base/60 p-0.5">
      {OPTIONS.map(({ value: v, label, icon: Icon }) => {
        const on = value === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            title={v === 'bot' ? 'Fill this seat with a bot' : 'Keep this seat for a person'}
            disabled={disabled}
            onClick={() => !on && onChange(v)}
            className={`flex h-8 w-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              on ? 'bg-accent text-accent-ink shadow-glow' : 'text-mute hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
