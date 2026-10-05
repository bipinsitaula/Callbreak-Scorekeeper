import { useId } from 'react'
import { FiMinus, FiPlus } from 'react-icons/fi'

/**
 * Touch-friendly number entry: big −/+ stepper, a numeric-keypad input and
 * optional quick-pick chips. `value` is a number or null (not entered yet).
 */
export default function NumberPicker({ label, value, min, max, onChange, chips = true, disabled = false }) {
  const id = useId()
  const hasChips = chips && max - min <= 13

  const clamp = (n) => Math.min(max, Math.max(min, n))

  const handleInput = (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(digits === '' ? null : clamp(parseInt(digits, 10)))
  }

  const stepBtn =
    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-raised text-ink transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-wider text-mute">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={stepBtn}
          aria-label={`Decrease ${label}`}
          disabled={disabled || value === null || value <= min}
          onClick={() => onChange(clamp((value ?? min) - 1))}
        >
          <FiMinus className="h-5 w-5" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={value ?? ''}
          placeholder={`${min}–${max}`}
          disabled={disabled}
          onChange={handleInput}
          onFocus={(e) => e.target.select()}
          className="field h-11 w-full min-w-0 px-1 py-0 text-center text-lg font-extrabold tabular-nums"
        />
        <button
          type="button"
          className={stepBtn}
          aria-label={`Increase ${label}`}
          disabled={disabled || (value !== null && value >= max)}
          onClick={() => onChange(value === null ? min : clamp(value + 1))}
        >
          <FiPlus className="h-5 w-5" />
        </button>
      </div>

      {hasChips && !disabled && (
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label={`${label} quick pick`}>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={value === n}
              onClick={() => onChange(n)}
              className={`h-8 min-w-[2rem] rounded-lg px-2 text-sm font-bold tabular-nums transition-colors ${
                value === n ? 'bg-accent text-accent-ink' : 'bg-raised text-mute hover:text-ink'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
