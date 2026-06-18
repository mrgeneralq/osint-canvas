import { create } from 'zustand'

let tid = 0

const useToastStore = create((set, get) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = ++tid
    set({ toasts: [...get().toasts, { id, message, type }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3200)
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  info:    (msg) => useToastStore.getState().add(msg, 'info'),
  success: (msg) => useToastStore.getState().add(msg, 'success'),
  error:   (msg) => useToastStore.getState().add(msg, 'error'),
  warn:    (msg) => useToastStore.getState().add(msg, 'warn'),
}

export default useToastStore
