import { useState } from 'react'
import { useGameStore } from '../../store'
import { useToastStore } from '../../hooks/useToast'
import { FiCheck, FiX } from 'react-icons/fi'
import BidCard from '../BidCard'
import Modal from '../Modal'
import { getCardsPerPlayer, getMaxBid, sumTricks, validateBids, validateTricks } from '../../utils/helpers'

export default function EditRoundModal({ roundIndex, onClose }) {
  const players = useGameStore((s) => s.players)
  const playerCount = useGameStore((s) => s.playerCount)
  const round = useGameStore((s) => s.rounds[roundIndex])
  const editRound = useGameStore((s) => s.editRound)
  const { error, success } = useToastStore()

  const cards = getCardsPerPlayer(playerCount)
  const maxBid = getMaxBid(playerCount)

  const [bids, setBids] = useState(round.bids)
  const [tricks, setTricks] = useState(round.tricks)

  const update = (setter) => (index, value) =>
    setter((prev) => prev.map((v, i) => (i === index ? value : v)))

  const assigned = sumTricks(tricks)

  const handleSave = () => {
    const problem = validateBids(bids, { players, maxBid, maxTotal: cards }) ?? validateTricks(tricks, { players, cards })
    if (problem) return error(problem)
    editRound(roundIndex, bids, tricks)
    success(`Round ${roundIndex + 1} saved.`)
    onClose()
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy="edit-round-title"
      className="my-8 w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="edit-round-title" className="text-2xl text-ink">
          Edit round <span className="text-accent">{roundIndex + 1}</span>
        </h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-mute hover:bg-raised hover:text-ink">
          <FiX className="h-6 w-6" />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4">
        {players.map((name, idx) => (
          <BidCard
            key={idx}
            playerName={name}
            seat={idx}
            mode="both"
            bid={bids[idx]}
            tricks={tricks[idx]}
            maxBid={maxBid}
            maxTricks={cards}
            chips={false}
            onBidChange={(v) => update(setBids)(idx, v)}
            onTricksChange={(v) => update(setTricks)(idx, v)}
          />
        ))}
      </div>

      <p className={`mb-6 text-sm font-semibold tabular-nums ${assigned === cards ? 'text-accent' : 'text-mute'}`} aria-live="polite">
        Tricks assigned: {assigned} / {cards}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={handleSave} disabled={assigned !== cards} className="btn btn-primary flex-1">
          <FiCheck className="h-5 w-5" aria-hidden="true" />
          Save changes
        </button>
        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </Modal>
  )
}
