import { FiBookOpen, FiX } from 'react-icons/fi'
import { useGameStore } from '../store'
import { getCardsPerPlayer, getMaxBid, getRemainingCards, getVariantNotes } from '../utils/helpers'
import Modal from './Modal'
import { BOOT, MAX_STAKE, START_CHIPS } from '../online/teenpatti'
import { HAND_SIZE, WIN_POINTS } from '../online/juttpatti'

/** Rules & guide, shown as a slide-in drawer from the navbar "?" button on every screen size. */
export default function RulesPanel({ onClose }) {
  const playerCount = useGameStore((s) => s.playerCount)
  const section = useGameStore((s) => s.section)
  const view = useGameStore((s) => s.view)

  const cardsPerPlayer = getCardsPerPlayer(playerCount)
  const remainingCards = getRemainingCards(playerCount)
  const maxBid = getMaxBid(playerCount)

  const callBreakSections = [
    {
      title: 'About Call Break',
      content:
        'Call Break (also "Lakdi" or "Spades variant") is a popular trick-taking card game from South Asia. Players bid the number of tricks they expect to win and earn or lose points based on accuracy.',
    },
    {
      title: `Setup for ${playerCount} Players`,
      content: (
        <>
          <p>{getVariantNotes(playerCount)}</p>
          <p className="mt-2">
            Use a standard 52-card deck. <strong className="text-ink">Cards per player: {cardsPerPlayer}</strong>
            {remainingCards > 0 && ` (${remainingCards} card${remainingCards > 1 ? 's' : ''} set aside)`}.
          </p>
        </>
      ),
    },
    {
      title: 'Trump Rules',
      content: (
        <>
          <p className="mb-2 font-semibold">Spades are always trump.</p>
          <ul className="ml-4 space-y-1">
            <li>• Follow suit if you can.</li>
            <li>• If you cannot follow suit, you must play a spade (trump) if you have one.</li>
            <li>• If no spade and no matching suit, play any card.</li>
            <li>• Higher trump beats lower trump.</li>
            <li>• If you can beat the winning card with a card you are allowed to play, you must (the online table enforces this).</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Bidding',
      content: (
        <>
          <p>Before each round, every player declares how many tricks they intend to win.</p>
          <ul className="ml-4 mt-2 space-y-1">
            <li>• Minimum bid: <strong className="text-ink">1</strong></li>
            <li>• Maximum bid: <strong className="text-ink">{maxBid}</strong></li>
            <li>• Bids are made in turn order, starting left of the dealer.</li>
            {section === 'online' ? (
              <li>• At the online table any bid from 1 to {maxBid} is allowed, whatever the others bid.</li>
            ) : (
              <li>• Total bids may not exceed {cardsPerPlayer} (the tricks available).</li>
            )}
          </ul>
        </>
      ),
    },
    {
      title: 'Scoring',
      content: (
        <>
          <div className="mb-3">
            <p className="font-bold text-accent">If you meet or exceed your bid:</p>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Earn 1 point per trick bid.</li>
              <li>• Each extra trick (overtrick) adds 0.1 points.</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-danger">If you fall short of your bid:</p>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Lose the full bid amount as negative points.</li>
            </ul>
          </div>
          <p className="mt-3 text-xs italic text-mute">
            Example: Bid 3, won 4 → +3.1. Bid 3, won 2 → −3.
          </p>
        </>
      ),
    },
    {
      title: 'Turn Order',
      content:
        section === 'online'
          ? 'Play proceeds clockwise. In round 1 the player left of the dealer bids first and leads the first trick. After that, whoever scored best in the last round bids first and leads (on a tie, the one who bid earliest), and the deal passes to the seat on their right. The winner of each trick leads the next.'
          : 'Play proceeds clockwise. The player left of the dealer bids first and leads the first trick. The winner of each trick leads the next. After every round, the dealer rotates one seat clockwise.',
    },
    {
      title: 'Winning',
      content:
        'The game is traditionally played over 5 rounds. The player with the highest total score at the end wins; equal scores share the rank.',
    },
    {
      title: 'Strategy Tips',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• Count your sure tricks (Aces, high spades) before bidding.</li>
          <li>• Avoid overbidding — undertricks cost the full bid.</li>
          <li>• Lead with strong off-suit cards to flush out trumps.</li>
          <li>• Watch which cards have been played to track remaining trumps.</li>
        </ul>
      ),
    },
    {
      title: 'Keyboard shortcuts',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• <kbd className="rounded border border-line bg-raised px-1.5 text-ink">?</kbd> open this guide</li>
          <li>• <kbd className="rounded border border-line bg-raised px-1.5 text-ink">Esc</kbd> close dialogs</li>
          <li>• <kbd className="rounded border border-line bg-raised px-1.5 text-ink">Tab</kbd> move between fields</li>
        </ul>
      ),
    },
  ]

  const blackjackSections = [
    {
      title: 'The goal',
      content:
        'Beat the dealer by getting a hand closer to 21 than theirs without going over. If you go over 21 you bust and lose the bet straight away.',
    },
    {
      title: 'Card values',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• Number cards count their number.</li>
          <li>• Jack, queen and king count 10.</li>
          <li>• An ace counts 11, or 1 if 11 would bust you. A hand using an ace as 11 is "soft".</li>
        </ul>
      ),
    },
    {
      title: 'Your moves',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• <strong className="text-ink">Hit:</strong> take another card.</li>
          <li>• <strong className="text-ink">Stand:</strong> keep your hand.</li>
          <li>• <strong className="text-ink">Double:</strong> on your first two cards, double the bet and take exactly one more card.</li>
          <li>• <strong className="text-ink">Split:</strong> with two cards of equal value, play them as two hands, each with its own bet. One split per round, and split aces get one card each.</li>
          <li>• <strong className="text-ink">Surrender:</strong> on your first two cards, give up the hand and get half your bet back. It is only offered before you hit, split or double.</li>
          <li>• <strong className="text-ink">Insurance:</strong> when the dealer shows an ace, you may bet half your stake that the dealer has blackjack. It pays 2 to 1.</li>
        </ul>
      ),
    },
    {
      title: 'The dealer',
      content:
        'The dealer turns over the hidden card after you finish, then must keep drawing until reaching 17 or more. The dealer stands on every 17, including soft 17 (some casinos make the dealer hit a soft 17; this table does not). With an ace showing, the dealer checks for blackjack once you have decided on insurance.',
    },
    {
      title: 'Payouts',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• Win: you get your bet back plus the same again.</li>
          <li>• Blackjack (an ace and a ten-value card on the first two cards): pays 3 to 2.</li>
          <li>• Push (same total as the dealer): your bet is returned.</li>
          <li>• 21 after a split pays 1 to 1 and doesn't count as blackjack.</li>
          <li>• Insurance pays 2 to 1. Surrender returns half your bet.</li>
        </ul>
      ),
    },
    {
      title: 'Hints',
      content:
        'Press "Get a hint" for the move that basic strategy recommends in this spot. It gives the best long-run odds, but not a guaranteed win on any single hand.',
    },
    {
      title: 'Fair shuffling',
      content:
        'Six decks are shuffled with your browser’s secure random number generator (Fisher–Yates), so no card order repeats or can be predicted. The shoe is reshuffled once about three quarters of it has been dealt. Chips are play money only.',
    },
    {
      title: 'Keyboard shortcuts',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• <kbd className="rounded border border-line bg-raised px-1.5 text-ink">H</kbd> hit, <kbd className="rounded border border-line bg-raised px-1.5 text-ink">S</kbd> stand</li>
          <li>• <kbd className="rounded border border-line bg-raised px-1.5 text-ink">D</kbd> double, <kbd className="rounded border border-line bg-raised px-1.5 text-ink">P</kbd> split, <kbd className="rounded border border-line bg-raised px-1.5 text-ink">R</kbd> surrender</li>
          <li>• <kbd className="rounded border border-line bg-raised px-1.5 text-ink">Enter</kbd> deal or next hand</li>
        </ul>
      ),
    },
  ]

  const teenPattiSections = [
    {
      title: 'About Teen Patti',
      content:
        'Teen Patti ("three cards") is a betting game from South Asia, close to three-card poker. Each player gets three cards and bets chips on having the best hand, or on bluffing everyone else into packing.',
    },
    {
      title: 'Each hand',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• 2 to 6 players; everyone starts the game with {START_CHIPS.toLocaleString()} play chips.</li>
          <li>• Everyone puts in the boot ({BOOT}) to start the pot, then gets three cards face down.</li>
          <li>• Betting goes round the table, starting left of the dealer.</li>
        </ul>
      ),
    },
    {
      title: 'Blind or seen',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• <strong className="text-ink">Blind:</strong> you haven’t looked. You bet the stake.</li>
          <li>• <strong className="text-ink">Seen:</strong> you’ve looked. You bet double the stake.</li>
          <li>• You can look at your cards any time; it doesn’t use your turn.</li>
        </ul>
      ),
    },
    {
      title: 'Your moves',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• <strong className="text-ink">Chaal:</strong> pay to stay in.</li>
          <li>• <strong className="text-ink">Raise:</strong> double the stake for everyone after you (it stops doubling at {MAX_STAKE} blind).</li>
          <li>• <strong className="text-ink">Pack:</strong> fold and give up the pot.</li>
          <li>• <strong className="text-ink">Show:</strong> when only two players are left, pay and compare hands. If they tie, the player who asked loses.</li>
          <li>• <strong className="text-ink">All in:</strong> if you can’t afford to stay in, put in everything; all hands left are shown and the best takes the pot.</li>
        </ul>
      ),
    },
    {
      title: 'Hand rankings (best first)',
      content: (
        <ol className="ml-4 list-decimal space-y-1">
          <li><strong className="text-ink">Trail:</strong> three of a kind (A-A-A is best).</li>
          <li><strong className="text-ink">Pure sequence:</strong> three in a row of one suit.</li>
          <li><strong className="text-ink">Sequence:</strong> three in a row, mixed suits.</li>
          <li><strong className="text-ink">Color:</strong> three of one suit, not in a row.</li>
          <li><strong className="text-ink">Pair:</strong> two of the same rank.</li>
          <li><strong className="text-ink">High card:</strong> none of the above.</li>
        </ol>
      ),
    },
    {
      title: 'Sequences',
      content: 'A-K-Q is the highest sequence and A-2-3 the second highest, then K-Q-J and down to 4-3-2.',
    },
    {
      title: 'Winning',
      content: 'The game lasts the number of hands the host picked, or until one player has all the chips. Most chips wins. Chips are play money only.',
    },
  ]

  const jutPattiSections = [
    {
      title: 'About Jut Patti',
      content: `Jut Patti is a pairing game for 2 to 4 players with a standard 52-card deck. Each player gets ${HAND_SIZE} cards and races to turn them into pairs.`,
    },
    {
      title: 'Setting up',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• Everyone is dealt {HAND_SIZE} cards face down.</li>
          <li>• One card from the stock is turned up. Every card exactly one rank higher is a <strong className="text-ink">joker</strong> for the round (a King makes Aces jokers, an Ace makes 2s jokers).</li>
          <li>• The rest of the stock stays face down; discards go in a face-up pile beside it.</li>
        </ul>
      ),
    },
    {
      title: 'Your turn',
      content: (
        <ol className="ml-4 list-decimal space-y-1">
          <li>Draw one card, from the stock or the top of the discard pile. You now hold {HAND_SIZE + 1}.</li>
          <li>Discard one card face up on the pile.</li>
        </ol>
      ),
    },
    {
      title: 'Pairs and jokers',
      content: 'A pair is two cards of the same rank, like 8♠ and 8♦. A joker pairs with any card, so don’t throw one away lightly. Two jokers also make a pair.',
    },
    {
      title: 'Winning a round',
      content: `Seven cards can’t all pair, so the winning hand is three pairs plus one spare card. When your ${HAND_SIZE + 1} cards hold three pairs, discard a spare and declare. You can’t throw back the card you just took from the pile.`,
    },
    {
      title: 'Scoring',
      content: `The winner of a round scores ${WIN_POINTS} points. Everyone else loses a point for each card they hold that isn’t in a pair. The most points after the last round wins.`,
    },
    {
      title: 'Tips',
      content: (
        <ul className="ml-4 space-y-1">
          <li>• Watch the discard pile: it shows which ranks your opponents aren’t collecting.</li>
          <li>• Every discard is a gift. Avoid throwing a rank the player after you just picked up.</li>
          <li>• Don’t sit on a lone card of the joker rank when you could pair it off.</li>
        </ul>
      ),
    },
  ]

  const sections =
    view === 'jutpatti' || view === 'jutpattiHistory'
      ? jutPattiSections
      : view === 'teenpatti' || view === 'teenpattiHistory'
        ? teenPattiSections
        : section === 'blackjack'
          ? blackjackSections
          : callBreakSections

  return (
    <Modal
      side="right"
      onClose={onClose}
      labelledBy="rules-title"
      className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6 shadow-2xl"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="rules-title" className="flex items-center gap-2 text-2xl text-ink">
          <FiBookOpen className="h-6 w-6 text-accent" aria-hidden="true" />
          Rules &amp; Guide
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close rules"
          className="rounded-lg p-2 text-mute hover:bg-raised hover:text-ink"
        >
          <FiX className="h-6 w-6" />
        </button>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="border-b border-line pb-6 last:border-b-0">
            <h3 className="mb-2 font-extrabold text-ink">{section.title}</h3>
            <div className="text-sm leading-relaxed text-mute">
              {typeof section.content === 'string' ? <p>{section.content}</p> : section.content}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  )
}
