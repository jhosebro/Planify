import { create } from 'zustand';
import type { TrackingList, TrackingItem } from '@/services/tracking';

interface TrackingState {
  lists: TrackingList[];
  currentListItems: TrackingItem[];
  loading: boolean;
}

interface TrackingActions {
  setLists: (lists: TrackingList[]) => void;
  addList: (list: TrackingList) => void;
  updateList: (id: string, updates: Partial<TrackingList>) => void;
  deleteList: (id: string) => void;
  setCurrentListItems: (items: TrackingItem[]) => void;
  addItem: (item: TrackingItem) => void;
  updateItem: (id: string, updates: Partial<TrackingItem>) => void;
  deleteItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export type TrackingStore = TrackingState & TrackingActions;

export const useTrackingStore = create<TrackingStore>((set, get) => ({
  lists: [],
  currentListItems: [],
  loading: false,

  setLists: (lists) => set({ lists }),

  addList: (list) => set({ lists: [...get().lists, list] }),

  updateList: (id, updates) =>
    set({
      lists: get().lists.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }),

  deleteList: (id) =>
    set({ lists: get().lists.filter((l) => l.id !== id) }),

  setCurrentListItems: (items) => set({ currentListItems: items }),

  addItem: (item) =>
    set({ currentListItems: [...get().currentListItems, item] }),

  updateItem: (id, updates) =>
    set({
      currentListItems: get().currentListItems.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    }),

  deleteItem: (id) =>
    set({
      currentListItems: get().currentListItems.filter((i) => i.id !== id),
    }),

  setLoading: (loading) => set({ loading }),
}));
