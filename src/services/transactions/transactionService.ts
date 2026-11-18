import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionType } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { adjustAccountBalance } from '@/services/accounts/accountService';

export interface CreateTransactionInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: Date;
  description?: string;
}

export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  type?: TransactionType;
  /** true = solo transferencias, false = excluir transferencias */
  isTransfer?: boolean;
}

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

export class TransactionService {
  async create(input: CreateTransactionInput): Promise<Transaction> {
    const userId = getUserId();

    // Insert transaction
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: input.accountId,
        type: input.type,
        amount: input.amount,
        category_id: input.categoryId,
        description: input.description ?? null,
        date: input.date.toISOString(),
      })
      .select()
      .single();

    if (txnError) throw new Error(txnError.message);

    const delta = input.type === 'income' ? input.amount : -input.amount;
    await adjustAccountBalance(input.accountId, delta);

    return this.mapRow(txn);
  }

  async update(id: string, input: Partial<CreateTransactionInput>): Promise<Transaction> {
    // Get existing to calculate balance diff
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Transaction ${id} not found`);

    const updates: any = { updated_at: new Date().toISOString() };
    if (input.accountId) updates.account_id = input.accountId;
    if (input.type) updates.type = input.type;
    if (input.amount) updates.amount = input.amount;
    if (input.categoryId) updates.category_id = input.categoryId;
    if (input.description !== undefined) updates.description = input.description;
    if (input.date) updates.date = input.date.toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Ajustar saldos de las cuentas correctamente:
    //  - Si cambia la cuenta: devolver el efecto original en la cuenta vieja
    //    y aplicar el efecto nuevo en la cuenta nueva.
    //  - Si la cuenta es la misma: aplicar el delta neto.
    const newType = input.type ?? existing.type;
    const newAmount = input.amount ?? existing.amount;
    const newAccountId = input.accountId ?? existing.accountId;

    const oldDelta = existing.type === 'income' ? existing.amount : -existing.amount;
    const newDelta = newType === 'income' ? newAmount : -newAmount;

    if (newAccountId !== existing.accountId) {
      await adjustAccountBalance(existing.accountId, -oldDelta);
      await adjustAccountBalance(newAccountId, newDelta);
    } else {
      await adjustAccountBalance(existing.accountId, newDelta - oldDelta);
    }

    return this.mapRow(data);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Transaction ${id} not found`);

    // If this transaction is part of a transfer, delete the whole transfer
    // (both legs + the transfers record) to avoid FK constraint violations
    if (existing.linkedTransferId) {
      await this.deleteTransfer(existing.linkedTransferId);
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Revert balance: devolver el valor a la cuenta correspondiente
    const delta = existing.type === 'income' ? existing.amount : -existing.amount;
    await adjustAccountBalance(existing.accountId, -delta);
  }

  /** Deletes a full transfer: both transactions and the transfers record, reverting both balances. */
  private async deleteTransfer(transferId: string): Promise<void> {
    // Fetch the transfer record to get both transaction IDs and account IDs
    const { data: transfer, error: fetchErr } = await supabase
      .from('transfers')
      .select()
      .eq('id', transferId)
      .single();

    if (fetchErr || !transfer) throw new Error('No se encontró el registro de transferencia.');

    // Fetch both transactions to know the amounts and accounts
    const { data: txns } = await supabase
      .from('transactions')
      .select()
      .in('id', [transfer.source_transaction_id, transfer.destination_transaction_id]);

    // Unlink transactions from the transfer (so FK is clear before deleting transfers row)
    const { error: unlinkErr } = await supabase
      .from('transactions')
      .update({ linked_transfer_id: null })
      .in('id', [transfer.source_transaction_id, transfer.destination_transaction_id]);
    if (unlinkErr) throw new Error(unlinkErr.message);

    // Delete the transfers record first (it references the transactions)
    const { error: transferDelErr } = await supabase.from('transfers').delete().eq('id', transferId);
    if (transferDelErr) throw new Error(transferDelErr.message);

    // Delete both transactions
    const { error: txnDelErr } = await supabase
      .from('transactions')
      .delete()
      .in('id', [transfer.source_transaction_id, transfer.destination_transaction_id]);
    if (txnDelErr) throw new Error(txnDelErr.message);

    // Revert balances for both accounts
    if (txns) {
      for (const txn of txns) {
        // source was expense (deducted), destination was income (added) — revert both
        const delta = txn.type === 'income' ? -txn.amount : txn.amount;
        await adjustAccountBalance(txn.account_id, delta);
      }
    }
  }

  async getHistory(filter: TransactionFilter): Promise<Transaction[]> {
    const userId = getUserId();

    let query = supabase
      .from('transactions')
      .select()
      .eq('user_id', userId);

    if (filter.accountId) query = query.eq('account_id', filter.accountId);
    if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
    if (filter.type) query = query.eq('type', filter.type);
    if (filter.isTransfer === true) query = query.not('linked_transfer_id', 'is', null);
    if (filter.isTransfer === false) query = query.is('linked_transfer_id', null);
    if (filter.dateFrom) query = query.gte('date', filter.dateFrom.toISOString());
    if (filter.dateTo) query = query.lte('date', filter.dateTo.toISOString());

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapRow);
  }

  async getByDateRange(from: Date, to: Date): Promise<Transaction[]> {
    return this.getHistory({ dateFrom: from, dateTo: to });
  }

  private async getById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select()
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapRow(data);
  }

  private mapRow(row: any): Transaction {
    return {
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      type: row.type as TransactionType,
      amount: row.amount,
      categoryId: row.category_id,
      description: row.description ?? undefined,
      date: new Date(row.date),
      linkedTransferId: row.linked_transfer_id ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
