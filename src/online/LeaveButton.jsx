import { useState } from 'react'
import { FiLogOut } from 'react-icons/fi'
import ConfirmDialog from '../components/ConfirmDialog'
import { useOnlineStore } from './store'

/** "Leave room" with a confirmation dialog that explains what happens to your seat. */
export default function LeaveButton() {
  const [open, setOpen] = useState(false)
  const leave = useOnlineStore((s) => s.leave)
  const code = useOnlineStore((s) => s.code)
  const state = useOnlineStore((s) => s.row?.state)
  const me = useOnlineStore((s) => s.me)

  const inLobby = state?.status === 'lobby'
  const isHost = state?.hostId === me.id
  const others = (state?.players.length ?? 1) > 1

  const message = inLobby
    ? `Your seat will be given up${isHost && others ? ' and another player becomes the host' : ''}. You can join again with code ${code} before the game starts.`
    : `The game carries on without you, waiting at your turn. To get back in, sign in as ${me.name} and join code ${code}.`

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost !min-h-0 !px-3 !py-2">
        <FiLogOut className="h-4 w-4" aria-hidden="true" />
        {inLobby ? 'Leave room' : 'Leave table'}
      </button>
      {open && (
        <ConfirmDialog
          title={inLobby ? 'Leave this room?' : 'Leave the game?'}
          message={message}
          confirmLabel={inLobby ? 'Leave room' : 'Leave game'}
          onConfirm={() => {
            setOpen(false)
            leave()
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  )
}
