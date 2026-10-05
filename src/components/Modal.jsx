import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog shell: portal, Esc to close, focus trap, focus restore,
 * scroll lock and aria attributes. `side="right"` renders a slide-in drawer.
 */
export default function Modal({
  onClose,
  labelledBy,
  dismissable = true,
  side,
  className = '',
  backdropClassName = 'bg-black/50 backdrop-blur-sm',
  children,
}) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = () => [...panel.querySelectorAll(FOCUSABLE)]
    ;(focusables()[0] ?? panel).focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [dismissable])

  const isDrawer = side === 'right'

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose?.()
      }}
      className={`fixed inset-0 z-[60] flex overflow-y-auto p-4 ${
        isDrawer ? 'justify-end p-0' : 'items-center justify-center'
      } ${backdropClassName}`}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        initial={isDrawer ? { x: '100%' } : { scale: 0.95, opacity: 0, y: 8 }}
        animate={isDrawer ? { x: 0 } : { scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className={`outline-none ${className}`}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body
  )
}
