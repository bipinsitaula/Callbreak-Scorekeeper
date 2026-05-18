import { useGameStore } from '../store'
import { motion } from 'framer-motion'
import { getCardsPerPlayer, getRemainingCards, getVariantNotes } from '../utils/helpers'

export default function RulesPanel() {
  const { playerCount } = useGameStore()

  const cardsPerPlayer = getCardsPerPlayer(playerCount)
  const remainingCards = getRemainingCards(playerCount)

  const sections = [
    {
      title: 'About Call Break',
      icon: 'ℹ️',
      content:
        'Call Break (also "Lakdi" or "Spades variant") is a popular trick-taking card game from South Asia. Players bid the number of tricks they expect to win and earn or lose points based on accuracy.',
    },
    {
      title: `Setup for ${playerCount} Players`,
      icon: playerCount,
      content: (
        <>
          <p>{getVariantNotes(playerCount)}</p>
          <p className="mt-2">
            Use a standard 52-card deck. <strong>Cards per player: {cardsPerPlayer}</strong>
            {remainingCards > 0 && ` (${remainingCards} card${remainingCards > 1 ? 's' : ''} set aside)`}.
          </p>
        </>
      ),
    },
    {
      title: 'Trump Rules',
      icon: '♠',
      content: (
        <>
          <p className="font-semibold mb-2">Spades are always trump.</p>
          <ul className="space-y-1 ml-4 text-sm">
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
      icon: '📣',
      content: (
        <>
          <p>Before each round, every player declares how many tricks they intend to win.</p>
          <ul className="space-y-1 ml-4 text-sm mt-2">
            <li>• Minimum bid: <strong>1</strong></li>
            <li>• Maximum bid: <strong>{cardsPerPlayer}</strong></li>
            <li>• Bids are made in turn order, starting left of the dealer.</li>
            <li>• Total bids need not equal {cardsPerPlayer}.</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Scoring',
      icon: '#',
      content: (
        <>
          <div className="mb-3">
            <p className="font-semibold text-accent-600 dark:text-accent-400">If you meet or exceed your bid:</p>
            <ul className="space-y-1 ml-4 text-sm mt-1">
              <li>• Earn 1 point per trick bid.</li>
              <li>• Each extra trick (overtrick) adds 0.1 points.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-danger-500 dark:text-danger-400">If you fall short of your bid:</p>
            <ul className="space-y-1 ml-4 text-sm mt-1">
              <li>• Lose the full bid amount as negative points.</li>
            </ul>
          </div>
          <p className="text-xs mt-3 italic text-gray-600 dark:text-gray-400">
            Example: Bid 3, won 4 → +3.1. Bid 3, won 2 → −3.
          </p>
        </>
      ),
    },
    {
      title: 'Turn Order',
      icon: '↻',
      content:
        'Play proceeds clockwise. The player left of the dealer leads the first trick. The winner of each trick leads the next. After every round, the dealer rotates one seat clockwise.',
    },
    {
      title: 'Winning',
      icon: '🏆',
      content:
        'The game is typically played for a fixed number of rounds. The player with the highest total score at the end wins.',
    },
    {
      title: 'Strategy Tips',
      icon: '💡',
      content: (
        <ul className="space-y-1 ml-4 text-sm">
          <li>• Count your sure tricks (Aces, high spades) before bidding.</li>
          <li>• Avoid overbidding — undertricks cost the full bid.</li>
          <li>• Lead with strong off-suit cards to flush out trumps.</li>
          <li>• Watch which cards have been played to track remaining trumps.</li>
        </ul>
      ),
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="panel sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto"
    >
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <span>📖</span> Rules & Guide
      </h2>

      <motion.div variants={containerVariants} className="space-y-6">
        {sections.map((section, idx) => (
          <motion.div key={idx} variants={itemVariants} className="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span className="text-lg">{section.icon}</span>
              {section.title}
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {typeof section.content === 'string' ? <p>{section.content}</p> : section.content}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
