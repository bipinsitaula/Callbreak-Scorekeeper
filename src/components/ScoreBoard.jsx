import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FaCrown } from 'react-icons/fa'
import { FiBarChart2 } from 'react-icons/fi'
import { useGameStore } from '../store'
import { formatScore, rankPlayers, sumScores } from '../utils/helpers'
import Avatar from './Avatar'
import ExportButtons from './ExportButtons'

const ROW_STYLES = {
  1: 'border-gold/50 bg-gold/10',
  2: 'border-mute/40 bg-raised/60',
  3: 'border-[#c2763f]/40 bg-[#c2763f]/5',
}

const BADGE_STYLES = {
  1: 'bg-gold text-base',
  2: 'bg-mute text-base',
  3: 'bg-[#c2763f] text-white',
}

export default function ScoreBoard() {
  const players = useGameStore((s) => s.players)
  const rounds = useGameStore((s) => s.rounds)
  const totalRounds = useGameStore((s) => s.totalRounds)

  const totals = useMemo(() => sumScores(rounds, players.length), [rounds, players.length])
  const ranked = rankPlayers(players, totals)
  const leadScore = ranked[0]?.score ?? 0
  const tiedLead = ranked.filter((p) => p.rank === 1).length > 1

  return (
    <section className="panel" aria-labelledby="ranking-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="ranking-heading" className="mb-1 text-2xl text-ink">Standings</h2>
          <p className="text-mute">Updates after every round.</p>
        </div>
        {rounds.length > 0 && <ExportButtons players={players} rounds={rounds} totalRounds={totalRounds} />}
      </div>

      {rounds.length === 0 ? (
        <div className="py-8 text-center text-mute">
          <FiBarChart2 className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
          <p>Save a round to see the standings.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {ranked.map((player) => (
            <motion.li
              key={player.index}
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`flex items-center gap-3 rounded-2xl border p-3 sm:gap-4 sm:p-4 ${
                ROW_STYLES[player.rank] ?? 'border-line bg-raised/40'
              }`}
            >
              <div
                aria-label={`Rank ${player.rank}`}
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                  BADGE_STYLES[player.rank] ?? 'bg-raised text-mute'
                }`}
              >
                {player.rank === 1 ? <FaCrown className="h-3.5 w-3.5" aria-label="Rank 1" /> : player.rank}
              </div>

              <Avatar name={player.name} seat={player.index} />

              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-ink">{player.name}</div>
                <div className="text-xs tabular-nums text-mute">
                  {player.rank === 1
                    ? tiedLead
                      ? 'Tied for the lead'
                      : 'Leading'
                    : `${formatScore(leadScore - player.score).replace('+', '')} behind`}
                </div>
              </div>

              <div className={`text-xl font-extrabold tabular-nums ${player.score >= 0 ? 'text-accent' : 'text-danger'}`}>
                {formatScore(player.score)}
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  )
}
