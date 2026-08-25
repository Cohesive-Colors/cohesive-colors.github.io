import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  swatch?: string;
  tone: 'default' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, options?: { swatch?: string; tone?: Toast['tone'] }) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, options = {}) => {
    const id = nextId++;
    set((s) => ({
      // Cap the stack so a burst of copies cannot cover the page.
      toasts: [...s.toasts, { id, message, swatch: options.swatch, tone: options.tone ?? 'default' }].slice(-3),
    }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, options?: { swatch?: string; tone?: Toast['tone'] }) =>
  useToastStore.getState().push(message, options);
