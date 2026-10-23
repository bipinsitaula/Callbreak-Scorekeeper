import { FiGlobe } from 'react-icons/fi'
import BackHome from '../components/BackHome'
import GameCard from '../components/GameCard'
import PlayingCard from '../blackjack/PlayingCard'
import { useGameStore } from '../store'
import { GAMES, gameOf } from './games'
import { BOOT, START_CHIPS } from './teenpatti'
import { HAND_SIZE } from './juttpatti'
import { useOnlineStore } from './store'
import { AccountBar } from './AccountGate'

const hand = (prefix, cards) => cards.map(([rank, suit]) => ({ id: `${prefix}-${suit}-${rank}`, rank, suit }))
const CALL_BREAK_HAND = hand('og-cb', [['A', 'spades'], ['K', 'spades'], ['Q', 'hearts']])
const TEEN_PATTI_HAND = hand('og-tp', [['A', 'hearts'], ['A', 'clubs'], ['A', 'diamonds']])
const JUT_PATTI_HAND = hand('og-jp', [['8', 'spades'], ['8', 'diamonds'], ['Q', 'hearts']])

const Fan = ({ cards }) => (
  <div className="flex">
    {cards.map((card, i) => (
      <PlayingCard key={card.id} card={card} index={i} />
    ))}
  </div>
)

/** The online section's landing page: one card per online game. */
export default function OnlineGamesView() {
  const setView = useGameStore((s) => s.setView)
  const code = useOnlineStore((s) => s.code)
  const roomGame = useOnlineStore((s) => (s.row ? gameOf(s.row.state).id : null))

  // "Back to the table" only on the game you're seated at.
  const atTable = (id) => (code && roomGame === id ? { action: 'Back to the table', status: `At table ${code}` } : { action: 'Play' })

  // Add new online games here; each opens its own view (see games.js).
  const games = [
    {
      id: 'callbreak',
      kind: `${GAMES.callbreak.minSeats} to ${GAMES.callbreak.maxSeats} players · Spades are trump`,
      title: 'Call Break',
      description: 'Bid how many tricks you’ll take, then play them out. Spades always win, and missing your bid costs you.',
      points: ['Join with your name and a room code', 'Bots can fill empty seats', 'Table chat and live scores'],
      ...atTable('callbreak'),
      view: GAMES.callbreak.view,
      art: <Fan cards={CALL_BREAK_HAND} />,
    },
    {
      id: 'teenpatti',
      kind: `${GAMES.teenpatti.minSeats} to ${GAMES.teenpatti.maxSeats} players · Play chips`,
      title: 'Teen Patti',
      description: 'Three cards each. Bet blind or look first, raise the stakes or pack, and call for a show when two are left.',
      points: [`${START_CHIPS.toLocaleString()} chips each, boot ${BOOT}`, 'Trail beats pure sequence beats sequence…', 'Bots, chat and hand-by-hand history'],
      ...atTable('teenpatti'),
      view: GAMES.teenpatti.view,
      art: <Fan cards={TEEN_PATTI_HAND} />,
    },
    {
      id: 'jutpatti',
      kind: `${GAMES.jutpatti.minSeats} to ${GAMES.jutpatti.maxSeats} players · Pairs and jokers`,
      title: 'Jut Patti',
      description: 'Draw one, discard one, and turn your seven cards into three pairs before anyone else. The card above the turned-up one is wild.',
      points: [`${HAND_SIZE} cards each, 3 pairs plus a spare wins`, 'Jokers pair with anything', 'Bots, chat and round-by-round history'],
      ...atTable('jutpatti'),
      view: GAMES.jutpatti.view,
      art: <Fan cards={JUT_PATTI_HAND} />,
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
