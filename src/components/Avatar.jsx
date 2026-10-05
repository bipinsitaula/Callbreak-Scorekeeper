import { getPlayerInitials } from '../utils/helpers'

// One colour per seat so a player is recognisable across every screen.
export const SEAT_COLORS = ['#3b6cf6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6']

/** Round coloured badge. `label` overrides the initials (setup shows seat numbers: P1, P2…). */
export default function Avatar({ name, seat, label, size = 'md' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: SEAT_COLORS[seat % SEAT_COLORS.length] }}
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-extrabold text-white ${sizes[size]}`}
    >
      {label ?? getPlayerInitials(name)}
    </span>
  )
}
