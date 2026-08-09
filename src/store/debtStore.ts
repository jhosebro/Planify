import { create } from 'zustand';
import type { Debt, DebtSummary } from '@/services/debts';

interface DebtState {
  debts: Debt[];
  summary: DebtSummary;
}

interface DebtActions {
  setDebts: (debts: Debt[]) => void;
  setSummary: (summary: DebtSummary) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
}

export type DebtStore = DebtState & DebtActions;

const defaultSummary: DebtSummary = {
  totalIOwe: 0,
  totalTheyOweMe: 0,
  creditCardDebt: 0,
  installmentDebt: 0,
  personalDebt: 0,
};

export const useDebtStore = create<DebtStore>((set, get) => ({
  debts: [],
  summary: defaultSummary,

  setDebts: (debts) => set({ debts }),

  setSummary: (summary) => set({ summary }),

  addDebt: (debt) => {
    set({ debts: [debt, ...get().debts] });
  },

  updateDebt: (id, updates) => {
    const debts = get().debts.map((d) =>
      d.id === id ? { ...d, ...updates } : d
    );
    set({ debts });
  },

  removeDebt: (id) => {
    set({ debts: get().debts.filter((d) => d.id !== id) });
  },
}));
