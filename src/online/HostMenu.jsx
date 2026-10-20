import { useState } from 'react'
import { FiFlag, FiRotateCcw, FiSliders, FiX } from 'react-icons/fi'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { useToastStore } from '../hooks/useToast'
import { gameOf, plural } from './games'
import { useOnlineStore } from './store'

/** Host-only pop-up with game controls. Each control asks for confirmation first. */
export default function HostMenu() {
  const state = useOnlineStore((s) => s.row?.state)
  const me = useOnlineStore((s) => s.me)
  const act = useOnlineStore((s) => s.act)
  const toast = useToastStore()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'redo' | 'end'

  if (!state || state.hostId !== me.id || state.status === 'lobby') return null

  const game = gameOf(state)
  const inGame = state.status !== 'finished'
  const played = game.played(state)
  const total = game.optionOf(state)
  const unit = game.unit
  const what = game.id === 'teenpatti' ? 'chip counts' : 'scores'

  const ACTIONS = {
    redo: {
      icon: FiRotateCcw,
      label: 'Redo this game',
      description: `Shuffle a fresh deck and start again from ${unit} 1 with the same players. All ${what} are reset.`,
      title: 'Redo this game?',
      message: `Everyone's ${what}${played ? ` from ${plural(played, unit)}` : ''} will be reset and a new game of ${plural(total, unit)} starts from ${unit} 1. This cannot be undone.`,
      confirmLabel: 'Redo game',
      run: (s, id) => game.restart(s, id),
      done: 'New game dealt',
      enabled: true,
    },
    end: {
      icon: FiFlag,
      label: 'End game',
      description: played
        ? `Stop now and show the final standings after ${plural(played, unit)}.`
        : `No ${unit} has finished yet, so everyone goes back to the waiting room.`,
      title: 'End the game now?',
      message: played
        ? `The game ends for everyone and the final standings use the ${plural(played, `finished ${unit}`)}. The ${unit} being played now will not count${game.id === 'teenpatti' ? ', and chips bet in it go back' : ''}.`
        : `No ${unit} has finished yet, so the game is cancelled and everyone goes back to the waiting room.`,
      confirmLabel: 'End game',
      run: (s, id) => game.end(s, id),
      done: 'Game ended',
      enabled: inGame,
    },
  }

  const choose = (kind) => {
    setOpen(false)
    setConfirm(kind)
  }

  const runConfirmed = async () => {
    const action = ACTIONS[confirm]
    setConfirm(null)
    const result = await act(action.run)
    if (result.ok) toast.success(action.done)
    else toast.error(result.error)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Host controls" className="btn btn-secondary !min-h-0 !px-3 !py-2">
        <FiSliders className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Host controls</span>
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          labelledBy="host-menu-title"
          className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        >
          <div className="mb-1 flex items-center justify-between">
            <h2 id="host-menu-title" className="flex items-center gap-2 text-xl text-ink">
              <FiSliders className="h-5 w-5 text-accent" aria-hidden="true" />
              Host controls
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close host controls"
              className="rounded-lg p-2 text-mute hover:bg-raised hover:text-ink"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <p className="mb-5 text-sm text-mute">Only the host sees these. Changes apply to everyone at the table.</p>

          <ul className="space-y-3">
            {Object.entries(ACTIONS).map(([kind, a]) => (
              <li key={kind}>
                <button
                  type="button"
                  disabled={!a.enabled}
                  onClick={() => choose(kind)}
                  className="flex w-full items-start gap-3 rounded-xl border border-line bg-raised/60 p-4 text-left transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
                    <a.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-bold text-ink">{a.label}</span>
                    <span className="mt-0.5 block text-sm text-mute">{a.enabled ? a.description : 'The game is already over.'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={ACTIONS[confirm].title}
          message={ACTIONS[confirm].message}
          confirmLabel={ACTIONS[confirm].confirmLabel}
          onConfirm={runConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
