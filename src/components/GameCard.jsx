import { FiArrowRight } from 'react-icons/fi'

/** A game tile: artwork on top, then kind, title, description, bullet points and one action. */
export default function GameCard({ title, kind, description, points, action, onClick, art, status }) {
  return (
    <article className="panel game-card group relative flex flex-col overflow-hidden !p-0">
      <div className="game-card-art relative flex h-44 items-center justify-center overflow-hidden border-b border-line bg-gradient-to-br from-accent/20 via-accent/5 to-transparent">
        {art}
        {status && (
          <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-extrabold text-accent-ink">
            {status}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-1 text-xs font-bold text-accent">{kind}</p>
        <h2 className="mb-2 text-2xl text-ink">{title}</h2>
        <p className="mb-4 text-mute">{description}</p>
        <ul className="mb-6 space-y-1.5 text-sm text-mute">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              {p}
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClick} className="btn btn-primary mt-auto w-full">
          {action}
          <FiArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
