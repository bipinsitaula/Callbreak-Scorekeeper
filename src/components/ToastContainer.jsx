import { useToastStore } from '../hooks/useToast'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi'

const STYLES = {
  error: 'border-danger/50 text-ink [&_svg:first-child]:text-danger',
  warning: 'border-gold/50 text-ink [&_svg:first-child]:text-gold',
  success: 'border-accent/50 text-ink [&_svg:first-child]:text-accent',
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    // Live region so screen readers announce validation errors and confirmations.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-20 z-[70] flex flex-col items-end gap-3"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border bg-surface px-4 py-3 shadow-2xl ${
              STYLES[toast.type] ?? STYLES.success
            }`}
          >
            {toast.type === 'success' ? (
              <FiCheckCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            ) : (
              <FiAlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1 text-sm font-semibold">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => removeToast(toast.id)}
              className="ml-1 rounded p-1 text-mute hover:bg-raised hover:text-ink"
            >
              <FiX className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
