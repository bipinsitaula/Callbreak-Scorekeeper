import { FiGlobe } from 'react-icons/fi'
import BackHome from '../components/BackHome'
import GameCard from '../components/GameCard'
import PlayingCard from '../blackjack/PlayingCard'
import { useGameStore } from '../store'
import { MAX_SEATS, MIN_SEATS } from './engine'
import { useOnlineStore } from './store'
import { AccountBar } from './AccountGate'

const CALL_BREAK_HAND = [
  { id: 'og-cb-a', rank: 'A', suit: 'spades' },
  { id: 'og-cb-k', rank: 'K', suit: 'spades' },
  { id: 'og-cb-q', rank: 'Q', suit: 'hearts' },
]

/** The online section's landing page: one card per online game. */
export default function OnlineGamesView() {
  const setView = useGameStore((s) => s.setView)
  const code = useOnlineStore((s) => s.code)

  // Add new online games here; each opens its own view.
  const games = [
    {
      id: 'callbreak',
      kind: `${MIN_SEATS} to ${MAX_SEATS} players · Spades are trump`,
      title: 'Call Break',
      description: 'Bid how many tricks you’ll take, then play them out. Spades always win, and missing your bid costs you.',
      points: ['Join with your name and a room code', 'Bots can fill empty seats', 'Table chat and live scores'],
      action: code ? 'Back to the table' : 'Play',
      status: code ? `At table ${code}` : undefined,
      view: 'online',
      art: (
        <div className="flex">
          {CALL_BREAK_HAND.map((card, i) => (
            <PlayingCard key={card.id} card={card} index={i} />
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <BackHome />

      <section className="hero">
        <div className="relative max-w-xl">
          <h1 className="flex items-center gap-3 text-3xl text-ink sm:text-4xl">
            <FiGlobe className="h-9 w-9 flex-shrink-0 text-accent" aria-hidden="true" />
            Online games
          </h1>
          <p className="mt-3 text-base text-mute sm:text-lg">
            Play with friends, each on their own device. Pick a game, make a table and share the room code.
          </p>
        </div>
      </section>

      <AccountBar />

      <div className="grid gap-6 md:grid-cols-2">
        {games.map(({ id, view, ...card }) => (
          <GameCard key={id} {...card} onClick={() => setView(view)} />
        ))}
      </div>
    </div>
  )
}
