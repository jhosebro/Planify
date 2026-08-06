import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalType = 'personal' | 'couple';
export type GoalStatus = 'active' | 'completed' | 'paused';
export type InstallmentFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetAmount: number;
  savedAmount: number;
  priority: GoalPriority;
  type: GoalType;
  targetDate: Date;
  suggestedInstallment: number;
  installmentFrequency: InstallmentFrequency;
  status: GoalStatus;
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  userId: string;
  amount: number;
  note?: string;
  createdAt: Date;
}

export interface GoalAction {
  id: string;
  goalId: string;
  userId: string;
  title: string;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  targetAmount: number;
  priority: GoalPriority;
  type: GoalType;
  targetDate: Date;
  installmentFrequency: InstallmentFrequency;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

function calculateInstallment(targetAmount: number, savedAmount: number, targetDate: Date, frequency: InstallmentFrequency): number {
  const remaining = targetAmount - savedAmount;
  if (remaining <= 0) return 0;

  const now = new Date();
  const msRemaining = targetDate.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  let periods: number;
  switch (frequency) {
    case 'weekly': periods = Math.max(1, Math.ceil(daysRemaining / 7)); break;
    case 'biweekly': periods = Math.max(1, Math.ceil(daysRemaining / 15)); break;
    case 'monthly': periods = Math.max(1, Math.ceil(daysRemaining / 30)); break;
  }

  return Math.ceil(remaining / periods);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class GoalService {
  async create(input: CreateGoalInput): Promise<Goal> {
    const userId = getUserId();
    const installment = calculateInstallment(input.targetAmount, 0, input.targetDate, input.installmentFrequency);

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description ?? null,
        target_amount: input.targetAmount,
        priority: input.priority,
        type: input.type,
        target_date: input.targetDate.toISOString().split('T')[0],
        suggested_installment: installment,
        installment_frequency: input.installmentFrequency,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapGoal(data);
  }

  async getAll(): Promise<Goal[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('goals')
      .select()
      .eq('user_id', userId)
      .order('priority', { ascending: true })
      .order('target_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapGoal);
  }

  async getById(id: string): Promise<Goal | null> {
    const { data, error } = await supabase
      .from('goals')
      .select()
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapGoal(data);
  }

  async addContribution(goalId: string, amount: number, note?: string): Promise<GoalContribution> {
    const userId = getUserId();

    // Insert contribution
    const { data: contrib, error: contribErr } = await supabase
      .from('goal_contributions')
      .insert({
        goal_id: goalId,
        user_id: userId,
        amount,
        note: note ?? null,
      })
      .select()
      .single();

    if (contribErr) throw new Error(contribErr.message);

    // Update goal saved_amount
    const { data: goal } = await supabase
      .from('goals')
      .select('saved_amount, target_amount')
      .eq('id', goalId)
      .single();

    if (goal) {
      const newSaved = goal.saved_amount + amount;
      const updates: any = { saved_amount: newSaved, updated_at: new Date().toISOString() };

      // Auto-complete if target reached
      if (newSaved >= goal.target_amount) {
        updates.status = 'completed';
      }

      await supabase.from('goals').update(updates).eq('id', goalId);
    }

    return {
      id: contrib.id,
      goalId: contrib.goal_id,
      userId: contrib.user_id,
      amount: contrib.amount,
      note: contrib.note ?? undefined,
      createdAt: new Date(contrib.created_at),
    };
  }

  async getContributions(goalId: string): Promise<GoalContribution[]> {
    const { data, error } = await supabase
      .from('goal_contributions')
      .select()
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id,
      goalId: row.goal_id,
      userId: row.user_id,
      amount: row.amount,
      note: row.note ?? undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  async addAction(goalId: string, title: string): Promise<GoalAction> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('goal_actions')
      .insert({
        goal_id: goalId,
        user_id: userId,
        title,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapAction(data);
  }

  async toggleAction(actionId: string): Promise<void> {
    const { data: action } = await supabase
      .from('goal_actions')
      .select('is_completed')
      .eq('id', actionId)
      .single();

    if (!action) throw new Error('Acción no encontrada');

    const newCompleted = !action.is_completed;
    await supabase
      .from('goal_actions')
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', actionId);
  }

  async getActions(goalId: string): Promise<GoalAction[]> {
    const { data, error } = await supabase
      .from('goal_actions')
      .select()
      .eq('goal_id', goalId)
      .order('created_at', { ascending: true });

    if (error) return [];
    return (data ?? []).map(this.mapAction);
  }

  async update(id: string, input: Partial<CreateGoalInput>): Promise<Goal> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (input.name) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.targetAmount) updates.target_amount = input.targetAmount;
    if (input.priority) updates.priority = input.priority;
    if (input.type) updates.type = input.type;
    if (input.targetDate) updates.target_date = input.targetDate.toISOString().split('T')[0];
    if (input.installmentFrequency) updates.installment_frequency = input.installmentFrequency;

    // Recalculate installment if relevant fields changed
    if (input.targetAmount || input.targetDate || input.installmentFrequency) {
      const current = await this.getById(id);
      if (current) {
        const targetAmount = input.targetAmount ?? current.targetAmount;
        const targetDate = input.targetDate ?? current.targetDate;
        const freq = input.installmentFrequency ?? current.installmentFrequency;
        updates.suggested_installment = calculateInstallment(targetAmount, current.savedAmount, targetDate, freq);
      }
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapGoal(data);
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async updateStatus(id: string, status: GoalStatus): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  private mapGoal(row: any): Goal {
    const targetAmount = row.target_amount;
    const savedAmount = row.saved_amount;
    const progress = targetAmount > 0 ? Math.min(100, (savedAmount / targetAmount) * 100) : 0;

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description ?? undefined,
      targetAmount,
      savedAmount,
      priority: row.priority,
      type: row.type,
      targetDate: new Date(row.target_date),
      suggestedInstallment: row.suggested_installment,
      installmentFrequency: row.installment_frequency,
      status: row.status,
      progress,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapAction(row: any): GoalAction {
    return {
      id: row.id,
      goalId: row.goal_id,
      userId: row.user_id,
      title: row.title,
      isCompleted: row.is_completed,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
