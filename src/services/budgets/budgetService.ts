import { supabase } from '@/lib/supabase';
import type { Budget, BudgetConsumption } from '@/types';
import { useAuthStore } from '@/store/authStore';

export interface CreateBudgetInput {
  categoryId: string;
  monthlyLimit: number;
  alertThreshold: number;
  /** Si el presupuesto cuenta dentro del Presupuesto General (default true) */
  includeInGeneral?: boolean;
}

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
  return { start, end };
}

export class BudgetService {
  async create(input: CreateBudgetInput): Promise<Budget> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        category_id: input.categoryId,
        monthly_limit: input.monthlyLimit,
        alert_threshold: input.alertThreshold,
        include_in_general: input.includeInGeneral ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRow(data, 0);
  }

  async update(id: string, input: Partial<CreateBudgetInput>): Promise<Budget> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (input.categoryId) updates.category_id = input.categoryId;
    if (input.monthlyLimit) updates.monthly_limit = input.monthlyLimit;
    if (input.alertThreshold) updates.alert_threshold = input.alertThreshold;
    if (input.includeInGeneral !== undefined) updates.include_in_general = input.includeInGeneral;

    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    const spent = await this.getCategorySpent(data.category_id);
    return this.mapRow(data, spent);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async getAll(): Promise<Budget[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('budgets')
      .select()
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const budgets: Budget[] = [];
    for (const row of data ?? []) {
      const spent = await this.getCategorySpent(row.category_id);
      budgets.push(this.mapRow(row, spent));
    }
    return budgets;
  }

  async getConsumption(budgetId: string): Promise<BudgetConsumption> {
    const { data, error } = await supabase
      .from('budgets')
      .select()
      .eq('id', budgetId)
      .single();

    if (error) throw new Error(error.message);

    const spent = await this.getCategorySpent(data.category_id);
    const percentage = (spent / data.monthly_limit) * 100;

    return {
      budgetId: data.id,
      categoryId: data.category_id,
      limit: data.monthly_limit,
      spent,
      percentage,
      isOverBudget: percentage > 100,
      isAtThreshold: percentage >= data.alert_threshold,
      includeInGeneral: data.include_in_general !== false && data.include_in_general !== 0,
    };
  }

  async getAllConsumptions(): Promise<(BudgetConsumption & { categoryName: string })[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(name)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw new Error(error.message);

    const consumptions: (BudgetConsumption & { categoryName: string })[] = [];
    for (const row of data ?? []) {
      const transactionSpent = await this.getCategorySpent(row.category_id);
      const manualSpent = row.manual_spent ?? 0;
      const totalSpent = transactionSpent + manualSpent;
      const percentage = (totalSpent / row.monthly_limit) * 100;
      consumptions.push({
        budgetId: row.id,
        categoryId: row.category_id,
        categoryName: (row as any).categories?.name ?? 'Sin categoría',
        limit: row.monthly_limit,
        spent: totalSpent,
        percentage,
        isOverBudget: percentage > 100,
        isAtThreshold: percentage >= row.alert_threshold,
        includeInGeneral: row.include_in_general !== false && row.include_in_general !== 0,
      });
    }
    return consumptions;
  }

  async resetMonthlyCounters(): Promise<void> {
    // Reset manual_spent for all active budgets at start of new month
    const userId = getUserId();
    await supabase
      .from('budgets')
      .update({ manual_spent: 0, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);
  }

  /**
   * Agrega gasto manual a un presupuesto sin crear un movimiento.
   * Útil para registrar gastos que ya ocurrieron sin afectar las cuentas.
   */
  async addManualSpent(budgetId: string, amount: number): Promise<void> {
    const { data: budget, error: getErr } = await supabase
      .from('budgets')
      .select('manual_spent')
      .eq('id', budgetId)
      .single();

    if (getErr || !budget) throw new Error('Presupuesto no encontrado');

    const newManualSpent = (budget.manual_spent ?? 0) + amount;

    const { error } = await supabase
      .from('budgets')
      .update({ manual_spent: newManualSpent, updated_at: new Date().toISOString() })
      .eq('id', budgetId);

    if (error) throw new Error(error.message);
  }

  /**
   * Establece el gasto manual de un presupuesto a un valor específico.
   */
  async setManualSpent(budgetId: string, amount: number): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .update({ manual_spent: amount, updated_at: new Date().toISOString() })
      .eq('id', budgetId);

    if (error) throw new Error(error.message);
  }

  async checkAlerts(_categoryId: string, _newExpenseAmount: number): Promise<void> {
    // Budget alerts are checked at the UI level for now
    // Push notifications can be added via Supabase Edge Functions later
  }

  private async getCategorySpent(categoryId: string): Promise<number> {
    const userId = getUserId();
    const { start, end } = getCurrentMonthRange();

    // Get all expense transactions for this category in the current month
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, linked_reminder_id, description')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end);

    if (error) return 0;

    // Exclude transactions that come from yearly or one-time reminders
    // Only monthly/biweekly/weekly recurring expenses count toward budget
    const transactions = data ?? [];
    if (transactions.length === 0) return 0;

    // Strategy 1: Exclude by linked_reminder_id (new transactions)
    const reminderIds = transactions
      .map((t) => t.linked_reminder_id)
      .filter((id): id is string => !!id);

    let excludedReminderIds: Set<string> = new Set();
    if (reminderIds.length > 0) {
      const { data: reminders } = await supabase
        .from('reminders')
        .select('id')
        .in('id', reminderIds)
        .in('frequency', ['yearly', 'once']);

      if (reminders) {
        excludedReminderIds = new Set(reminders.map((r) => r.id));
      }
    }

    // Strategy 2: For transactions without linked_reminder_id,
    // check if they match a yearly/once reminder by description + amount
    // (covers transactions created before the migration)
    const { data: yearlyOnceReminders } = await supabase
      .from('reminders')
      .select('description, amount')
      .eq('user_id', userId)
      .in('frequency', ['yearly', 'once']);

    const excludedByMatch = new Set<string>();
    if (yearlyOnceReminders && yearlyOnceReminders.length > 0) {
      for (const t of transactions) {
        if (t.linked_reminder_id) continue; // already handled
        if (!t.description) continue;
        const match = yearlyOnceReminders.find(
          (r) => r.description.trim().toLowerCase() === t.description.trim().toLowerCase() && r.amount === t.amount
        );
        if (match) {
          excludedByMatch.add(t.id);
        }
      }
    }

    // Sum amounts excluding yearly/once reminder transactions
    return transactions
      .filter((t) => {
        if (t.linked_reminder_id && excludedReminderIds.has(t.linked_reminder_id)) return false;
        if (excludedByMatch.has(t.id)) return false;
        return true;
      })
      .reduce((sum, row) => sum + row.amount, 0);
  }

  private mapRow(row: any, currentSpent: number): Budget {
    return {
      id: row.id,
      userId: row.user_id,
      categoryId: row.category_id,
      monthlyLimit: row.monthly_limit,
      alertThreshold: row.alert_threshold,
      currentSpent,
      isActive: row.is_active,
      includeInGeneral: row.include_in_general !== false && row.include_in_general !== 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
