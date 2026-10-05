import { create } from 'zustand'

const DURATIONS = { success: 3000, warning: 3500, error: 4000 }

/**
 * Toast notification system using Zustand
 */
export const useToastStore = create((set, get) => {
  const push = (type) => (message) => {
    const id = Date.now() + Math.random()
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), DURATIONS[type])
    return id
  }

  return {
    toasts: [],

    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

    success: push('success'),
    error: push('error'),
    warning: push('warning'),
  }
})
