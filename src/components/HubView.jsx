import { FiArrowRight } from 'react-icons/fi'
import { RiCoinsLine } from 'react-icons/ri'
import { GiSpades } from 'react-icons/gi'
import { useGameStore } from '../store'
import { useBlackjackStore } from '../blackjack/store'
import { isGameComplete } from '../utils/helpers'
import CardArt from './CardArt'
import PlayingCard from '../blackjack/PlayingCard'

const ACE = { id: 'hub-a', rank: 'A', suit: 'spades' }
const KING = { id: 'hub-k', rank: 'K', suit: 'hearts' }

function GameCard({ title, kind, description, points, action, onClick, art, status }) {
  return (
    <article className="panel group relative flex flex-col overflow-hidden !p-0">
      <div className="relative flex h-44 items-center justify-center overflow-hidden border-b border-line bg-gradient-to-br from-accent/20 via-accent/5 to-transparent">
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

/** Landing page: pick a game. */
export default function HubView() {
  const setView = useGameStore((s) => s.setView)
  const inProgress = useGameStore((s) => s.started && !isGameComplete(s.currentRound, s.totalRounds))
  const chips = useBlackjackStore((s) => s.bankroll)

  return (
    <div className="space-y-6">
      <section className="hero">
        <CardArt className="absolute -right-6 -top-2 hidden h-52 w-80 sm:block" />
        <div className="relative max-w-xl">
          <h1 className="flex items-center gap-3 text-3xl text-ink sm:text-4xl">
            <GiSpades className="h-10 w-10 flex-shrink-0 text-accent sm:h-12 sm:w-12" aria-hidden="true" />
            <span>
              Welcome to <span className="text-accent">Card Table</span>
            </span>
          </h1>
          <p className="mt-3 text-base text-mute sm:text-lg">
            Keep score for a real game of Call Break, or play blackjack against the dealer. Both work offline.
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <GameCard
          kind="Scorekeeper for physical cards"
          title="Call Break"
          description="Deal with a real deck and let the app do the maths. Track bids, tricks and scores for 2 to 5 players."
          points={['Bids, tricks and live standings', 'Dealer rotation and rules guide', 'Score chart, stats and past games']}
          action={inProgress ? 'Resume game' : 'Set up a game'}
          status={inProgress ? 'Game in progress' : undefined}
          onClick={() => setView(inProgress ? 'play' : 'setup')}
          art={<CardArt className="h-40 w-64" />}
        />
        <GameCard
          kind="Play on screen"
          title="Blackjack"
          description="A full table against the dealer with a fresh, randomly shuffled shoe. Chips are free, the hints are honest."
          points={[
            'Hit, stand, double and split',
            'Strategy hints when you are unsure',
            `${chips.toLocaleString()} chips in your stack`,
          ]}
          action="Play blackjack"
          onClick={() => setView('blackjack')}
          art={
            <div className="flex items-center gap-6">
              <div className="flex">
                <PlayingCard card={ACE} />
                <PlayingCard card={KING} index={1} />
              </div>
              <RiCoinsLine className="hidden h-14 w-14 text-gold sm:block" aria-hidden="true" />
            </div>
          }
        />
      </div>
    </div>
  )
}
