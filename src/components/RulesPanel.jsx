import { FiBookOpen, FiX } from 'react-icons/fi'
import { useGameStore } from '../store'
import { getCardsPerPlayer, getMaxBid, getRemainingCards, getVariantNotes } from '../utils/helpers'
import Modal from './Modal'

/** Rules & guide, shown as a slide-in drawer from the navbar "?" button on every screen size. */
export default function RulesPanel({ onClose }) {
  const playerCount = useGameStore((s) => s.playerCount)
  const section = useGameStore((s) => s.section)

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
            <li>• Total bids may not exceed {cardsPerPlayer} (the tricks available).</li>
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
        'Play proceeds clockwise. The player left of the dealer bids first and leads the first trick. The winner of each trick leads the next. After every round, the dealer rotates one seat clockwise.',
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

  const sections = section === 'blackjack' ? blackjackSections : callBreakSections

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
