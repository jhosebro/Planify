import { supabase } from '@/lib/supabase';
import type { Reminder, ReminderFrequency, Transaction } from '@/types';
import { useAuthStore } from '@/store/authStore';

export const REMINDER_CATEGORY_ID = 'system-reminder';

export interface CreateReminderInput {
  description: string;
  amount: number;
  dueDate: Date;
  frequency: ReminderFrequency;
  categoryId?: string;
}

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

function calculateNextDueDate(currentDueDate: Date, frequency: ReminderFrequency): Date {
  const next = new Date(currentDueDate);
  switch (frequency) {
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'biweekly': next.setDate(next.getDate() + 15); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

export class ReminderService {
  async create(input: CreateReminderInput): Promise<Reminder> {
    const userId = getUserId();

    const insertData: any = {
      user_id: userId,
      description: input.description,
      amount: input.amount,
      due_date: input.dueDate.toISOString(),
      frequency: input.frequency,
    };

    if (input.categoryId) {
      insertData.category_id = input.categoryId;
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  async update(id: string, input: Partial<CreateReminderInput>): Promise<Reminder> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (input.description) updates.description = input.description;
    if (input.amount) updates.amount = input.amount;
    if (input.dueDate) updates.due_date = input.dueDate.toISOString();
    if (input.frequency) updates.frequency = input.frequency;
    if (input.categoryId) updates.category_id = input.categoryId;

    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async markAsPaid(id: string, accountId: string): Promise<Transaction> {
    const userId = getUserId();

    // Get the reminder
    const { data: reminder, error: remErr } = await supabase
      .from('reminders')
      .select()
      .eq('id', id)
      .single();

    if (remErr || !reminder) throw new Error('Recordatorio no encontrado');

    // Get or create the category for the payment
    let categoryId: string;

    if (reminder.category_id) {
      categoryId = reminder.category_id;
    } else {
      // Fallback: find any existing category
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (catData?.id) {
        categoryId = catData.id;
      } else {
        const { data: newCat, error: catErr } = await supabase
          .from('categories')
          .insert({ user_id: userId, name: 'Recordatorio', icon: '🔔', color: '#FF9800', is_default: true })
          .select('id')
          .single();

        if (catErr || !newCat) throw new Error('No se pudo crear categoría para el pago');
        categoryId = newCat.id;
      }
    }

    // Mark as paid
    const { error: updateErr } = await supabase
      .from('reminders')
      .update({ is_paid: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) throw new Error('No se pudo marcar como pagado: ' + updateErr.message);

    // Create expense transaction
    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: accountId,
        type: 'expense',
        amount: reminder.amount,
        category_id: categoryId,
        description: reminder.description,
        date: new Date().toISOString(),
        linked_reminder_id: id,
      })
      .select()
      .single();

    if (txnErr) throw new Error(txnErr.message);

    // Update account balance
    const { data: acc } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', accountId)
      .single();

    if (acc) {
      await supabase
        .from('accounts')
        .update({ balance: acc.balance - reminder.amount, updated_at: new Date().toISOString() })
        .eq('id', accountId);
    }

    // Generate next recurrence if not 'once'
    if (reminder.frequency !== 'once') {
      await this.generateNextRecurrence(id);
    }

    return {
      id: txn.id,
      userId,
      accountId,
      type: 'expense',
      amount: reminder.amount,
      categoryId,
      description: reminder.description,
      date: new Date(),
      createdAt: new Date(txn.created_at),
      updatedAt: new Date(txn.updated_at),
    };
  }

  async getAll(): Promise<Reminder[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('reminders')
      .select()
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapRow);
  }

  async getPending(): Promise<Reminder[]> {
    const userId = getUserId();
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from('reminders')
      .select()
      .eq('user_id', userId)
      .eq('is_paid', false)
      .gte('due_date', today)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapRow);
  }

  async getOverdue(): Promise<Reminder[]> {
    const userId = getUserId();
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from('reminders')
      .select()
      .eq('user_id', userId)
      .eq('is_paid', false)
      .lt('due_date', today)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapRow);
  }

  async scheduleNotifications(): Promise<void> {
    // Notifications handled at app level — Supabase doesn't need local scheduling
  }

  async generateNextRecurrence(reminderId: string): Promise<Reminder> {
    const { data: existing, error } = await supabase
      .from('reminders')
      .select()
      .eq('id', reminderId)
      .single();

    if (error || !existing) throw new Error('Reminder not found');
    if (existing.frequency === 'once') throw new Error('Cannot recur a one-time reminder');

    const nextDueDate = calculateNextDueDate(new Date(existing.due_date), existing.frequency);

    return this.create({
      description: existing.description,
      amount: existing.amount,
      dueDate: nextDueDate,
      frequency: existing.frequency,
    });
  }

  private mapRow(row: any): Reminder {
    const dueDate = new Date(row.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      id: row.id,
      userId: row.user_id,
      description: row.description,
      amount: row.amount,
      dueDate,
      frequency: row.frequency as ReminderFrequency,
      isPaid: row.is_paid,
      isOverdue: !row.is_paid && dueDate < today,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
