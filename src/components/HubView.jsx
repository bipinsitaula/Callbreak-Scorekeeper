import { RiCoinsLine } from 'react-icons/ri'
import { GiSpades } from 'react-icons/gi'
import { useGameStore } from '../store'
import { useBlackjackStore } from '../blackjack/store'
import { useOnlineStore } from '../online/store'
import { isGameComplete } from '../utils/helpers'
import CardArt from './CardArt'
import GameCard from './GameCard'
import PlayingCard from '../blackjack/PlayingCard'

const ACE = { id: 'hub-a', rank: 'A', suit: 'spades' }
const KING = { id: 'hub-k', rank: 'K', suit: 'hearts' }
const ONLINE_HAND = [
  { id: 'hub-os-a', rank: 'A', suit: 'spades' },
  { id: 'hub-os-k', rank: 'K', suit: 'spades' },
  { id: 'hub-oh-q', rank: 'Q', suit: 'hearts' },
]

/** Landing page: pick a game. */
export default function HubView() {
  const setView = useGameStore((s) => s.setView)
  const inProgress = useGameStore((s) => s.started && !isGameComplete(s.currentRound, s.totalRounds))
  const chips = useBlackjackStore((s) => s.bankroll)
  const onlineCode = useOnlineStore((s) => s.code)

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
            Keep score for a real game of Call Break, play card games online with friends, or play blackjack against the dealer.
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
          kind="Play on screen with friends"
          title="Online games"
          description="Everyone plays on their own phone. Pick a game, type your name and a room code to sit down; the app shuffles, deals, checks the rules and keeps score."
          points={['Join with a name and a room code', 'Shuffled and dealt on screen', 'Call Break now, more games on the way']}
          action={onlineCode ? 'Back to the table' : 'Browse online games'}
          status={onlineCode ? `At table ${onlineCode}` : undefined}
          onClick={() => setView(onlineCode ? 'online' : 'onlineGames')}
          art={
            <div className="flex">
              {ONLINE_HAND.map((card, i) => (
                <PlayingCard key={card.id} card={card} index={i} />
              ))}
            </div>
          }
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
