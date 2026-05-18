import { useToastStore } from '../hooks/useToast'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return <FiAlertCircle className="w-5 h-5" />
      case 'warning':
        return <FiAlertCircle className="w-5 h-5" />
      default:
        return <FiCheckCircle className="w-5 h-5" />
    }
  }

  const getStyles = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-100'
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-100'
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100'
    }
  }

  return (
    <motion.div className="fixed top-24 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100, y: -20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg border
              shadow-lg pointer-events-auto max-w-sm
              ${getStyles(toast.type)}
            `}
          >
            {getIcon(toast.type)}
            <span className="flex-1 font-medium text-sm">{toast.message}</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            >
              <FiX className="w-4 h-4" />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
