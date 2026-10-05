import { FiAlertTriangle } from 'react-icons/fi'
import Modal from './Modal'

export default function ConfirmDialog({ title, message, confirmLabel = 'Continue', onConfirm, onCancel }) {
  return (
    <Modal
      onClose={onCancel}
      labelledBy="confirm-title"
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
        <FiAlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 id="confirm-title" className="mb-2 text-center text-2xl text-ink">
        {title}
      </h2>
      <p className="mb-8 text-center text-mute">{message}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onConfirm} className="btn btn-danger flex-1">
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </Modal>
  )
}
