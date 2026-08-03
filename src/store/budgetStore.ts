import { create } from 'zustand';
import type { Budget, BudgetConsumption } from '@/types';

interface BudgetState {
  budgets: Budget[];
  consumptions: BudgetConsumption[];
}

interface BudgetActions {
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  setConsumptions: (consumptions: BudgetConsumption[]) => void;
}

export type BudgetStore = BudgetState & BudgetActions;

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  consumptions: [],

  setBudgets: (budgets) =>
    set({ budgets }),

  addBudget: (budget) =>
    set({ budgets: [...get().budgets, budget] }),

  updateBudget: (id, updates) =>
    set({
      budgets: get().budgets.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }),

  deleteBudget: (id) =>
    set({
      budgets: get().budgets.filter((b) => b.id !== id),
    }),

  setConsumptions: (consumptions) =>
    set({ consumptions }),
}));
