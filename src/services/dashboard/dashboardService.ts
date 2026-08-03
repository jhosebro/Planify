import { supabase } from '@/lib/supabase';
import type { BudgetConsumption, Transaction } from '@/types';
import type { CategoryDistribution, DashboardData, MonthlyTrend } from '@/types/dashboard';
import { useAuthStore } from '@/store/authStore';

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

function getCurrentMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

export class DashboardService {
  async getDashboardData(dateRange?: { from: Date; to: Date }): Promise<DashboardData> {
    const range = dateRange ?? getCurrentMonthRange();

    const [totalBalance, categoryDistribution, monthlyTrends, activeBudgets, recentTransactions] =
      await Promise.all([
        this.getTotalBalance(),
        this.getCategoryDistribution(range.from, range.to),
        this.getMonthlyTrends(6),
        this.getActiveBudgets(range.from, range.to),
        this.getRecentTransactions(5),
      ]);

    return { totalBalance, categoryDistribution, monthlyTrends, activeBudgets, recentTransactions };
  }

  async getCategoryDistribution(from: Date, to: Date): Promise<CategoryDistribution[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, category_id, categories(name)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', from.toISOString())
      .lte('date', to.toISOString());

    if (error || !data || data.length === 0) return [];

    // Aggregate by category
    const categoryMap = new Map<string, { name: string; total: number }>();
    for (const row of data) {
      const catName = (row as any).categories?.name ?? 'Otros';
      const existing = categoryMap.get(row.category_id) ?? { name: catName, total: 0 };
      existing.total += row.amount;
      categoryMap.set(row.category_id, existing);
    }

    const grandTotal = Array.from(categoryMap.values()).reduce((s, c) => s + c.total, 0);
    if (grandTotal === 0) return [];

    return Array.from(categoryMap.entries()).map(([id, { name, total }]) => ({
      categoryId: id,
      categoryName: name,
      amount: total,
      percentage: Math.round((total / grandTotal) * 10000) / 100,
    }));
  }

  async getMonthlyTrends(months: number): Promise<MonthlyTrend[]> {
    const userId = getUserId();
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, date')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString());

    if (error) return [];

    // Generate all months
    const monthMap = new Map<string, { income: number; expense: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { income: 0, expense: 0 });
    }

    for (const row of data ?? []) {
      const d = new Date(row.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (entry) {
        if (row.type === 'income') entry.income += row.amount;
        else entry.expense += row.amount;
      }
    }

    return Array.from(monthMap.entries()).map(([month, { income, expense }]) => ({
      month,
      totalIncome: income,
      totalExpense: expense,
    }));
  }

  private async getTotalBalance(): Promise<number> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', userId)
      .eq('is_archived', false);

    if (error) return 0;
    return (data ?? []).reduce((sum, row) => sum + row.balance, 0);
  }

  private async getActiveBudgets(from: Date, to: Date): Promise<(BudgetConsumption & { categoryName: string })[]> {
    const userId = getUserId();

    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('*, categories(name)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !budgets) return [];

    const consumptions: (BudgetConsumption & { categoryName: string })[] = [];
    for (const budget of budgets) {
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', budget.category_id)
        .eq('type', 'expense')
        .gte('date', from.toISOString())
        .lte('date', to.toISOString());

      const transactionSpent = (txns ?? []).reduce((s, r) => s + r.amount, 0);
      const manualSpent = (budget as any).manual_spent ?? 0;
      const totalSpent = transactionSpent + manualSpent;
      const percentage = (totalSpent / budget.monthly_limit) * 100;

      consumptions.push({
        budgetId: budget.id,
        categoryId: budget.category_id,
        categoryName: (budget as any).categories?.name ?? 'Sin categoría',
        limit: budget.monthly_limit,
        spent: totalSpent,
        percentage,
        isOverBudget: percentage > 100,
        isAtThreshold: percentage >= budget.alert_threshold,
      });
    }
    return consumptions;
  }

  private async getRecentTransactions(limit: number): Promise<Transaction[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('transactions')
      .select()
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      type: row.type as 'income' | 'expense',
      amount: row.amount,
      categoryId: row.category_id,
      description: row.description ?? undefined,
      date: new Date(row.date),
      linkedTransferId: row.linked_transfer_id ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }
}
