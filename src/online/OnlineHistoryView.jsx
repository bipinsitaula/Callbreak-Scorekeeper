import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaTrophy } from 'react-icons/fa'
import { FiChevronDown, FiClock, FiRefreshCw } from 'react-icons/fi'
import Avatar from '../components/Avatar'
import BackHome from '../components/BackHome'
import { formatScore, rankPlayers, sumScores } from '../utils/helpers'
import { AccountBar } from './AccountGate'
import GameTabs from './GameTabs'
import { GAMES } from './games'
import { ScoreTable } from './ResultsDialogs'
import { START_CHIPS } from './teenpatti'
import { formatPoints } from './juttpatti'
import { useOnlineStore } from './store'

const when = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const REASON = { fold: 'everyone else packed', show: 'show', allin: 'all-in showdown' }

/** Per-game scoring for the history list. */
const SCORING = {
  callbreak: {
    totals: (g) => sumScores(g.rounds, g.players.length),
    format: formatScore,
    best: 'Best score',
    Detail: ({ game, mySeat }) => <ScoreTable state={{ players: game.players, rounds: game.rounds, totalRounds: game.total_rounds }} mySeat={mySeat} />,
  },
  teenpatti: {
    totals: (g) => g.rounds[g.rounds.length - 1]?.chips ?? g.players.map(() => START_CHIPS),
    format: (n) => `${n.toLocaleString()} chips`,
    best: 'Most chips',
    Detail: ({ game, mySeat }) => (
      <ol className="space-y-1 text-sm">
        {game.rounds.map((r) => (
          <li key={r.hand} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line py-1.5 first:border-t-0">
            <span className="font-bold text-mute">Hand {r.hand}</span>
            <span className="text-ink">
              {r.winners.map((w) => (w === mySeat ? 'You' : game.players[w]?.name)).join(' & ')} won {r.pot.toLocaleString()}
              <span className="text-mute"> ({REASON[r.reason] ?? r.reason})</span>
            </span>
          </li>
        ))}
      </ol>
    ),
  },
}

const SCORING_JUTPATTI = {
  totals: (g) => sumScores(g.rounds, g.players.length),
  format: formatPoints,
  best: 'Best score',
  Detail: ({ game, mySeat }) => (
    <ol className="space-y-1 text-sm">
      {game.rounds.map((r) => (
        <li key={r.round} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line py-1.5 first:border-t-0">
          <span className="font-bold text-mute">Round {r.round}</span>
          <span className="text-ink">{r.winner === mySeat ? 'You' : game.players[r.winner]?.name} declared three pairs</span>
        </li>
      ))}
    </ol>
  ),
}
SCORING.jutpatti = SCORING_JUTPATTI

/** Your result in one saved game: { rank, total, ranked, mySeat }. */
const summarise = (scoring, game, meId) => {
  const names = game.players.map((p) => p.name)
  const ranked = rankPlayers(names, scoring.totals(game))
  const mySeat = game.players.findIndex((p) => p.id === meId)
  const mine = ranked.find((r) => r.index === mySeat)
  return { ranked, mySeat, rank: mine?.rank ?? null, total: mine?.score ?? 0 }
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-base/60 px-3 py-3 text-center">
      <div className="text-xs font-bold text-mute">{label}</div>
      <div className="truncate text-xl font-extrabold tabular-nums text-ink">{value}</div>
    </div>
  )
}

function GameRow({ game, meId, scoring, unit }) {
  const [open, setOpen] = useState(false)
  const { ranked, mySeat, rank, total } = summarise(scoring, game, meId)
  const winners = ranked.filter((r) => r.rank === 1)
  const won = rank === 1
  const bodyId = `history-${game.id}`
  const Detail = scoring.Detail

  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-surface/80">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={bodyId} className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5">
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
            won ? 'bg-gold text-slate-900' : 'bg-raised text-mute'
          }`}
          title={rank ? `You finished #${rank}` : undefined}
        >
          {won ? <FaTrophy className="h-4 w-4" aria-hidden="true" /> : rank ? `#${rank}` : '–'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">
            {won ? (winners.length > 1 ? 'Shared win' : 'You won') : `${winners.map((w) => w.name).join(' & ')} won`}
            <span className="font-semibold text-mute"> · you {scoring.format(total)}</span>
          </span>
          <span className="block truncate text-xs text-mute">
            {when(game.finished_at)} · {game.rounds.length} of {game.total_rounds} {unit}s{game.ended_early ? ' (ended early)' : ''} · Room {game.room_code}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex-shrink-0 text-mute">
          <FiChevronDown className="h-5 w-5" aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-line px-4 pb-4 pt-3 sm:px-5">
              <ol className="flex flex-wrap gap-2">
                {ranked.map(({ index, name, score, rank: r }) => (
                  <li key={index} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${index === mySeat ? 'bg-accent/10 ring-1 ring-accent/40' : 'bg-raised/70'}`}>
                    <span className="text-xs font-extrabold text-mute">#{r}</span>
                    <Avatar name={name} seat={index} size="sm" />
                    <span className="font-bold text-ink">{index === mySeat ? 'You' : name}</span>
                    {game.players[index]?.bot && <span className="text-xs text-faint">(bot)</span>}
                    <span className={`font-extrabold tabular-nums ${score < 0 ? 'text-danger' : 'text-ink'}`}>{scoring.format(score)}</span>
                  </li>
                ))}
              </ol>
              <Detail game={game} mySeat={mySeat} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/** An online game > History: the games your account finished, newest first. */
export default function OnlineHistoryView({ gameId = 'callbreak' }) {
  const game = GAMES[gameId]
  const scoring = SCORING[gameId]
  const me = useOnlineStore((s) => s.me)
  const history = useOnlineStore((s) => s.history[gameId] ?? null)
  const error = useOnlineStore((s) => s.historyError)
  const load = useOnlineStore((s) => s.loadHistory)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (history === null) load(gameId)
  }, [history, load, gameId])

  const refresh = async () => {
    setRefreshing(true)
    await load(gameId)
    setRefreshing(false)
  }

  const results = (history ?? []).map((g) => summarise(scoring, g, me.id))
  const wins = results.filter((r) => r.rank === 1).length
  const best = results.length ? Math.max(...results.map((r) => r.total)) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackHome to="onlineGames" label="Back to online games" />
        <GameTabs gameId={gameId} />
      </div>
      <AccountBar />

      <section className="hero">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-3xl text-ink">
              <FiClock className="h-8 w-8 flex-shrink-0 text-accent" aria-hidden="true" />
              {game.name} history
            </h1>
            <p className="mt-2 text-mute">Every online game you finished, saved to your account.</p>
          </div>
          <button type="button" onClick={refresh} disabled={refreshing} className="btn btn-secondary !min-h-0 !px-3 !py-2">
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
          </button>
        </div>
        {results.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Stat label="Games" value={results.length} />
            <Stat label="Wins" value={wins} />
            <Stat label="Win rate" value={`${Math.round((wins / results.length) * 100)}%`} />
            <Stat label={scoring.best} value={scoring.format(best)} />
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          Couldn’t load your history: {error}
        </p>
      )}

      {history === null ? (
        <p className="panel text-mute">Loading your games…</p>
      ) : history.length === 0 ? (
        <div className="panel text-center">
          <FiClock className="mx-auto mb-2 h-8 w-8 text-faint" aria-hidden="true" />
          <p className="font-bold text-ink">No finished games yet</p>
          <p className="mt-1 text-sm text-mute">Play a game to the end (or have the host end it) and it will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {history.map((g) => (
            <GameRow key={g.id} game={g} meId={me.id} scoring={scoring} unit={game.unit} />
          ))}
        </ul>
      )}
    </div>
  )
}
