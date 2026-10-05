import { useState } from 'react'
import { FiTrash2 } from 'react-icons/fi'
import BackHome from '../components/BackHome'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToastStore } from '../hooks/useToast'
import { useBlackjackStore } from './store'

const fmt = (n) => n.toLocaleString()
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`

const RESULT_TEXT = { blackjack: 'Blackjack', win: 'Win', lose: 'Loss', bust: 'Bust', push: 'Push', surrender: 'Surrender', split: 'Split' }

function Tile({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-line bg-raised/40 p-4">
      <div className="text-xs font-bold text-mute">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold tabular-nums ${tone ?? 'text-ink'}`}>{value}</div>
    </div>
  )
}

export default function BlackjackRecord() {
  const bankroll = useBlackjackStore((s) => s.bankroll)
  const stats = useBlackjackStore((s) => s.stats)
  const log = useBlackjackStore((s) => s.log)
  const resetAll = useBlackjackStore((s) => s.resetAll)
  const { success } = useToastStore()
  const [confirmReset, setConfirmReset] = useState(false)

  const decided = stats.wins + stats.losses
  const winRate = stats.hands ? Math.round((stats.wins / stats.hands) * 100) : 0

  return (
    <div className="space-y-6">
      <BackHome />

      <section className="panel" aria-labelledby="bj-record-title">
        <h2 id="bj-record-title" className="mb-1 text-2xl text-ink">Your record</h2>
        <p className="mb-6 text-mute">Everything is saved on this device.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="Chips" value={fmt(bankroll)} />
          <Tile
            label="Total profit"
            value={signed(stats.net)}
            tone={stats.net > 0 ? 'text-accent' : stats.net < 0 ? 'text-danger' : undefined}
          />
          <Tile label="Highest chips" value={fmt(stats.peak)} />
          <Tile label="Hands played" value={fmt(stats.hands)} />
          <Tile label="Win rate" value={`${winRate}%`} />
          <Tile label="Blackjacks" value={fmt(stats.blackjacks)} />
        </div>

        <p className="mt-4 text-sm text-mute">
          {fmt(stats.wins)} won, {fmt(stats.losses)} lost, {fmt(stats.pushes)} pushed
          {decided > 0 && `, ${fmt(stats.busts)} busts`}. Doubled {fmt(stats.doubles)} times, split {fmt(stats.splits)} times, surrendered {fmt(stats.surrenders)} times.
          {stats.rebuys > 0 && ` Topped up chips ${fmt(stats.rebuys)} time${stats.rebuys > 1 ? 's' : ''}.`}
        </p>
      </section>

      <section className="panel" aria-labelledby="bj-log-title">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="bj-log-title" className="text-2xl text-ink">Recent hands</h2>
          <button type="button" className="btn btn-ghost !min-h-0 !px-2 !py-1.5" onClick={() => setConfirmReset(true)}>
            <FiTrash2 className="h-4 w-4" aria-hidden="true" />
            Reset everything
          </button>
        </div>

        {log.length === 0 ? (
          <p className="py-6 text-center text-mute">No hands yet. Play one at the table and it shows up here.</p>
        ) : (
          <ul className="space-y-2">
            {log.map((e) => (
              <li key={e.id} className="rounded-xl border border-line bg-raised/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-ink">{RESULT_TEXT[e.result] ?? e.result}</span>
                  <span className={`font-extrabold tabular-nums ${e.net > 0 ? 'text-accent' : e.net < 0 ? 'text-danger' : 'text-mute'}`}>
                    {signed(e.net)}
                  </span>
                </div>
                <p className="mt-1 text-sm tabular-nums text-mute">
                  You: {e.player?.join(' | ')}. Dealer: {e.dealer}. Bet {fmt(e.stake)}.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="Reset your blackjack record?"
          message="Your chips go back to 1,000 and all stats and recent hands are cleared. This can't be undone."
          confirmLabel="Reset everything"
          onConfirm={() => {
            resetAll()
            setConfirmReset(false)
            success('Blackjack record reset.')
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}
