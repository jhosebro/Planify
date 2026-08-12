import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DebtCategory = 'credit_card' | 'installment' | 'personal';
export type DebtDirection = 'i_owe' | 'they_owe_me';
export type DebtStatus = 'active' | 'paid_off';

export interface Debt {
  id: string;
  userId: string;
  category: DebtCategory;
  direction: DebtDirection;
  name: string;
  description?: string;
  /** Monto total de la deuda en centavos */
  totalAmount: number;
  /** Monto pagado hasta ahora en centavos */
  paidAmount: number;
  /** Número total de cuotas (null si no aplica) */
  totalInstallments?: number;
  /** Cuotas pagadas */
  paidInstallments?: number;
  /** Monto por cuota en centavos (null si no aplica) */
  installmentAmount?: number;
  /** Persona o entidad vinculada */
  counterparty?: string;
  /** ID de cuenta credit_card vinculada (solo para category = credit_card) */
  linkedAccountId?: string;
  /** Indica que el dinero ya fue separado/provisionado para esta compra */
  isProvisioned: boolean;
  status: DebtStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  userId: string;
  amount: number;
  note?: string;
  createdAt: Date;
}

export interface CreateDebtInput {
  category: DebtCategory;
  direction: DebtDirection;
  name: string;
  description?: string;
  totalAmount: number;
  totalInstallments?: number;
  installmentAmount?: number;
  counterparty?: string;
  linkedAccountId?: string;
  isProvisioned?: boolean;
}

export interface DebtSummary {
  totalIOwe: number;
  totalTheyOweMe: number;
  creditCardDebt: number;
  installmentDebt: number;
  personalDebt: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class DebtService {
  async create(input: CreateDebtInput): Promise<Debt> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('debts')
      .insert({
        user_id: userId,
        category: input.category,
        direction: input.direction,
        name: input.name,
        description: input.description ?? null,
        total_amount: input.totalAmount,
        paid_amount: 0,
        total_installments: input.totalInstallments ?? null,
        paid_installments: 0,
        installment_amount: input.installmentAmount ?? null,
        counterparty: input.counterparty ?? null,
        linked_account_id: input.linkedAccountId ?? null,
        is_provisioned: input.isProvisioned ?? false,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapDebt(data);
  }

  async getAll(): Promise<Debt[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('debts')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapDebt);
  }

  async getByCategory(category: DebtCategory): Promise<Debt[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('debts')
      .select()
      .eq('user_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapDebt);
  }

  async getById(id: string): Promise<Debt | null> {
    const { data, error } = await supabase
      .from('debts')
      .select()
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapDebt(data);
  }

  async addPayment(debtId: string, amount: number, note?: string): Promise<DebtPayment> {
    const userId = getUserId();

    // Insert payment
    const { data: payment, error: payErr } = await supabase
      .from('debt_payments')
      .insert({
        debt_id: debtId,
        user_id: userId,
        amount,
        note: note ?? null,
      })
      .select()
      .single();

    if (payErr) throw new Error(payErr.message);

    // Update debt paid_amount and optionally paid_installments
    const { data: debt } = await supabase
      .from('debts')
      .select('paid_amount, total_amount, paid_installments, total_installments, installment_amount')
      .eq('id', debtId)
      .single();

    if (debt) {
      const newPaid = debt.paid_amount + amount;
      const updates: any = {
        paid_amount: newPaid,
        updated_at: new Date().toISOString(),
      };

      // If has installments, increment paid_installments
      if (debt.total_installments && debt.installment_amount) {
        updates.paid_installments = (debt.paid_installments ?? 0) + 1;
      }

      // Auto mark as paid_off if fully paid
      if (newPaid >= debt.total_amount) {
        updates.status = 'paid_off';
      }

      await supabase.from('debts').update(updates).eq('id', debtId);
    }

    return {
      id: payment.id,
      debtId: payment.debt_id,
      userId: payment.user_id,
      amount: payment.amount,
      note: payment.note ?? undefined,
      createdAt: new Date(payment.created_at),
    };
  }

  async getPayments(debtId: string): Promise<DebtPayment[]> {
    const { data, error } = await supabase
      .from('debt_payments')
      .select()
      .eq('debt_id', debtId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id,
      debtId: row.debt_id,
      userId: row.user_id,
      amount: row.amount,
      note: row.note ?? undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  async getSummary(): Promise<DebtSummary> {
    const debts = await this.getAll();
    const active = debts.filter((d) => d.status === 'active');

    let totalIOwe = 0;
    let totalTheyOweMe = 0;
    let creditCardDebt = 0;
    let installmentDebt = 0;
    let personalDebt = 0;

    for (const debt of active) {
      const remaining = debt.totalAmount - debt.paidAmount;
      if (debt.direction === 'i_owe') {
        // Provisioned debts don't count toward what we actually owe
        if (!debt.isProvisioned) {
          totalIOwe += remaining;
        }
        if (debt.category === 'credit_card') creditCardDebt += remaining;
        else if (debt.category === 'installment') installmentDebt += remaining;
        else personalDebt += remaining;
      } else {
        totalTheyOweMe += remaining;
      }
    }

    return { totalIOwe, totalTheyOweMe, creditCardDebt, installmentDebt, personalDebt };
  }

  async update(id: string, input: Partial<CreateDebtInput>): Promise<Debt> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.totalAmount !== undefined) updates.total_amount = input.totalAmount;
    if (input.totalInstallments !== undefined) updates.total_installments = input.totalInstallments;
    if (input.installmentAmount !== undefined) updates.installment_amount = input.installmentAmount;
    if (input.counterparty !== undefined) updates.counterparty = input.counterparty || null;
    if (input.direction !== undefined) updates.direction = input.direction;
    if (input.isProvisioned !== undefined) updates.is_provisioned = input.isProvisioned;

    const { data, error } = await supabase
      .from('debts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapDebt(data);
  }

  async markAsPaidOff(id: string): Promise<void> {
    const { error } = await supabase
      .from('debts')
      .update({ status: 'paid_off', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteDebt(id: string): Promise<void> {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  private mapDebt(row: any): Debt {
    return {
      id: row.id,
      userId: row.user_id,
      category: row.category,
      direction: row.direction,
      name: row.name,
      description: row.description ?? undefined,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      totalInstallments: row.total_installments ?? undefined,
      paidInstallments: row.paid_installments ?? undefined,
      installmentAmount: row.installment_amount ?? undefined,
      counterparty: row.counterparty ?? undefined,
      linkedAccountId: row.linked_account_id ?? undefined,
      isProvisioned: row.is_provisioned ?? false,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
