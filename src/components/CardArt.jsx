/** Decorative fanned playing cards (aria-hidden). Colour comes from the current text colour. */
function Card({ suit, x, y, rotate, opacity }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity={opacity}>
      <rect width="120" height="168" rx="14" fill="rgb(var(--surface))" stroke="currentColor" strokeWidth="2" />
      <text x="14" y="34" fontSize="26" fill="currentColor" fontWeight="800">A</text>
      <text x="14" y="62" fontSize="26" fill="currentColor">{suit}</text>
      <text x="60" y="108" fontSize="64" textAnchor="middle" fill="currentColor">{suit}</text>
    </g>
  )
}

export default function CardArt({ className = '' }) {
  return (
    <svg viewBox="0 0 320 240" aria-hidden="true" className={`pointer-events-none select-none text-accent ${className}`}>
      <Card suit="♣" x={30} y={50} rotate={-14} opacity={0.35} />
      <Card suit="♦" x={110} y={36} rotate={-2} opacity={0.55} />
      <Card suit="♠" x={186} y={52} rotate={12} opacity={0.95} />
    </svg>
  )
}
