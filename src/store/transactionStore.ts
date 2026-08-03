import { create } from 'zustand';
import type { Transaction } from '@/types';

interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface TransactionState {
  transactions: Transaction[];
  filters: TransactionFilters;
}

interface TransactionActions {
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setFilters: (filters: TransactionFilters) => void;
  clearFilters: () => void;
}

export type TransactionStore = TransactionState & TransactionActions;

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  filters: {},

  setTransactions: (transactions) =>
    set({ transactions }),

  addTransaction: (transaction) =>
    set({ transactions: [transaction, ...get().transactions] }),

  updateTransaction: (id, updates) =>
    set({
      transactions: get().transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }),

  deleteTransaction: (id) =>
    set({
      transactions: get().transactions.filter((t) => t.id !== id),
    }),

  setFilters: (filters) =>
    set({ filters }),

  clearFilters: () =>
    set({ filters: {} }),
}));
