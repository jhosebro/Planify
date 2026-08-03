import { create } from 'zustand';
import type { SyncStatus } from '@/types';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
}

interface SyncActions {
  setStatus: (status: SyncStatus) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (date: Date) => void;
}

export type SyncStore = SyncState & SyncActions;

export const useSyncStore = create<SyncStore>((set, get) => ({
  status: 'synced',
  pendingCount: 0,
  lastSyncAt: null,

  setStatus: (status) =>
    set({ status }),

  incrementPending: () =>
    set({ pendingCount: get().pendingCount + 1, status: 'pending' }),

  decrementPending: () => {
    const newCount = Math.max(0, get().pendingCount - 1);
    set({
      pendingCount: newCount,
      status: newCount === 0 ? 'synced' : 'pending',
    });
  },

  setPendingCount: (count) =>
    set({
      pendingCount: count,
      status: count === 0 ? 'synced' : 'pending',
    }),

  setLastSyncAt: (date) =>
    set({ lastSyncAt: date }),
}));
