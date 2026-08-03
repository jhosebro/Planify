import { create } from 'zustand';
import type { Account } from '@/types';

interface AccountState {
  accounts: Account[];
  totalBalance: number;
}

interface AccountActions {
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  archiveAccount: (id: string) => void;
  recalculateTotal: () => void;
}

export type AccountStore = AccountState & AccountActions;

function calculateTotalBalance(accounts: Account[]): number {
  return accounts
    .filter((account) => !account.isArchived)
    .reduce((sum, account) => sum + account.balance, 0);
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  totalBalance: 0,

  setAccounts: (accounts) =>
    set({
      accounts,
      totalBalance: calculateTotalBalance(accounts),
    }),

  addAccount: (account) => {
    const accounts = [...get().accounts, account];
    set({
      accounts,
      totalBalance: calculateTotalBalance(accounts),
    });
  },

  updateAccount: (id, updates) => {
    const accounts = get().accounts.map((account) =>
      account.id === id ? { ...account, ...updates } : account
    );
    set({
      accounts,
      totalBalance: calculateTotalBalance(accounts),
    });
  },

  archiveAccount: (id) => {
    const accounts = get().accounts.map((account) =>
      account.id === id ? { ...account, isArchived: true, updatedAt: new Date() } : account
    );
    set({
      accounts,
      totalBalance: calculateTotalBalance(accounts),
    });
  },

  recalculateTotal: () => {
    set({ totalBalance: calculateTotalBalance(get().accounts) });
  },
}));
