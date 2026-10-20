import { FiLock, FiUsers, FiPlayCircle } from 'react-icons/fi'
import Modal from '../components/Modal'

const KIND = {
  locked: { icon: FiLock, title: 'This room is closed', hint: 'Ask the host to reopen it, or get a code for another table.' },
  full: { icon: FiUsers, title: 'This table is full', hint: 'Every seat is taken. Ask for a code to another table.' },
  started: { icon: FiPlayCircle, title: 'Game already in progress', hint: 'You can join the next game at this table once the host opens a new room.' },
}

/** "No more entry" pop-up shown when a room turns a new player away. */
export default function NoEntryDialog({ code, message, onClose, onTryAnother }) {
  const kind = KIND[code] ?? KIND.locked
  const Icon = kind.icon
  return (
    <Modal onClose={onClose} labelledBy="no-entry-title" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-2xl sm:p-8">
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/15 text-danger">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-danger">No more entry</p>
      <h2 id="no-entry-title" className="mb-2 mt-1 text-2xl text-ink">
        {kind.title}
      </h2>
      <p className="text-mute">{message}</p>
      <p className="mb-7 mt-2 text-sm text-faint">{kind.hint}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn btn-primary flex-1" onClick={onTryAnother}>
          Try another code
        </button>
        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  )
}
