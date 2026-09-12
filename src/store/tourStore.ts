import { create } from 'zustand';

interface TourStore {
  /** The openTour callback registered by the currently focused screen. */
  openCurrentTour: (() => void) | null;
  registerTour: (fn: () => void) => void;
  unregisterTour: () => void;
}

export const useTourStore = create<TourStore>((set) => ({
  openCurrentTour: null,
  registerTour: (fn) => set({ openCurrentTour: fn }),
  unregisterTour: () => set({ openCurrentTour: null }),
}));
