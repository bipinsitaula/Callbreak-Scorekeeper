import { FaCrown } from 'react-icons/fa'
import { calculateScore, formatScore } from '../utils/helpers'
import Avatar from './Avatar'
import NumberPicker from './NumberPicker'

/**
 * One player's entry card.
 * mode: 'bid' (bidding phase), 'tricks' (bid shown read-only) or 'both' (editing a round).
 */
export default function BidCard({
  playerName,
  seat,
  mode,
  bid,
  tricks,
  maxBid,
  maxTricks,
  onBidChange,
  onTricksChange,
  isDealer = false,
  bidOrder = null,
  chips = true,
}) {
  const hasResult = mode !== 'bid' && bid !== null && tricks !== null
  const missed = hasResult && tricks < bid
  const score = hasResult ? calculateScore(bid, tricks) : null

  const tone = hasResult
    ? missed
      ? 'border-danger/60 bg-danger/10'
      : 'border-accent/50 bg-accent/5'
    : 'border-line bg-raised/40'

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${tone}`}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={playerName} seat={seat} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-ink" title={playerName}>
            {playerName}
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
            {isDealer && (
              <span className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-1.5 py-0.5 text-gold">
                <FaCrown className="h-2.5 w-2.5" aria-hidden="true" /> Dealer
              </span>
            )}
            {bidOrder === 1 && mode === 'bid' && (
              <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-accent">Bids first</span>
            )}
          </div>
        </div>
        {score !== null && (
          <div
            aria-label={`Round score ${formatScore(score)}`}
            className={`text-lg font-extrabold tabular-nums ${missed ? 'text-danger' : 'text-accent'}`}
          >
            {formatScore(score)}
          </div>
        )}
      </div>

      {mode === 'bid' && (
        <NumberPicker label="Bid" value={bid} min={1} max={maxBid} onChange={onBidChange} chips={chips} />
      )}

      {mode === 'tricks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-base/60 px-3 py-2 text-sm">
            <span className="text-mute">Bid</span>
            <span className="text-lg font-extrabold tabular-nums text-ink">{bid}</span>
          </div>
          <NumberPicker label="Tricks won" value={tricks} min={0} max={maxTricks} onChange={onTricksChange} chips={chips} />
        </div>
      )}

      {mode === 'both' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberPicker label="Bid" value={bid} min={1} max={maxBid} onChange={onBidChange} chips={chips} />
          <NumberPicker label="Tricks won" value={tricks} min={0} max={maxTricks} onChange={onTricksChange} chips={chips} />
        </div>
      )}

      {missed && <p className="mt-3 text-xs font-semibold text-danger">Short by {bid - tricks}. Loses the full bid.</p>}
    </div>
  )
}
