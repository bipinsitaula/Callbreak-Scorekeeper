import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Toast notification system using Zustand
 */
export const useToastStore = create(
  subscribeWithSelector((set) => ({
    toasts: [],

    addToast: (message, type = 'success', duration = 3000) => {
      const id = Date.now() + Math.random()
      set((state) => ({
        toasts: [...state.toasts, { id, message, type }],
      }))

      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)

      return id
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    },

    success: (message) => {
      return set((state) => {
        const id = Date.now() + Math.random()
        setTimeout(() => {
          set((s) => ({
            toasts: s.toasts.filter((t) => t.id !== id),
          }))
        }, 3000)
        return { toasts: [...state.toasts, { id, message, type: 'success' }] }
      })
    },

    error: (message) => {
      return set((state) => {
        const id = Date.now() + Math.random()
        setTimeout(() => {
          set((s) => ({
            toasts: s.toasts.filter((t) => t.id !== id),
          }))
        }, 4000)
        return { toasts: [...state.toasts, { id, message, type: 'error' }] }
      })
    },

    warning: (message) => {
      return set((state) => {
        const id = Date.now() + Math.random()
        setTimeout(() => {
          set((s) => ({
            toasts: s.toasts.filter((t) => t.id !== id),
          }))
        }, 3500)
        return { toasts: [...state.toasts, { id, message, type: 'warning' }] }
      })
    },
  }))
)
