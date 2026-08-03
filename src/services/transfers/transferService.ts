import { supabase } from '@/lib/supabase';
import type { Transfer } from '@/types';
import { useAuthStore } from '@/store/authStore';

export const TRANSFER_CATEGORY_ID = 'system-transfer';

export interface CreateTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: Date;
}

export interface CreateTransferResult {
  transfer: Transfer;
  hasInsufficientBalance: boolean;
}

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

export class TransferService {
  async checkBalance(sourceAccountId: string, amount: number): Promise<boolean> {
    const { data } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', sourceAccountId)
      .single();

    return (data?.balance ?? 0) >= amount;
  }

  async create(input: CreateTransferInput, skipBalanceCheck = false): Promise<CreateTransferResult> {
    const userId = getUserId();

    if (input.sourceAccountId === input.destinationAccountId) {
      throw new Error('Las cuentas origen y destino deben ser diferentes');
    }

    if (input.amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }

    let hasInsufficientBalance = false;
    if (!skipBalanceCheck) {
      hasInsufficientBalance = !(await this.checkBalance(input.sourceAccountId, input.amount));
    }

    // Get transfer category
    const { data: catData } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Transferencia')
      .single();

    const categoryId = catData?.id ?? userId; // fallback

    // Create expense transaction (source)
    const { data: sourceTxn, error: srcErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: input.sourceAccountId,
        type: 'expense',
        amount: input.amount,
        category_id: categoryId,
        description: 'Transfer out',
        date: input.date.toISOString(),
      })
      .select()
      .single();

    if (srcErr) throw new Error(srcErr.message);

    // Create income transaction (destination)
    const { data: destTxn, error: destErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: input.destinationAccountId,
        type: 'income',
        amount: input.amount,
        category_id: categoryId,
        description: 'Transfer in',
        date: input.date.toISOString(),
      })
      .select()
      .single();

    if (destErr) throw new Error(destErr.message);

    // Update source account balance
    const { data: srcAcc } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', input.sourceAccountId)
      .single();

    if (srcAcc) {
      await supabase
        .from('accounts')
        .update({ balance: srcAcc.balance - input.amount, updated_at: new Date().toISOString() })
        .eq('id', input.sourceAccountId);
    }

    // Update destination account balance
    const { data: destAcc } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', input.destinationAccountId)
      .single();

    if (destAcc) {
      await supabase
        .from('accounts')
        .update({ balance: destAcc.balance + input.amount, updated_at: new Date().toISOString() })
        .eq('id', input.destinationAccountId);
    }

    // Create transfer record
    const { data: transferData, error: tErr } = await supabase
      .from('transfers')
      .insert({
        user_id: userId,
        source_account_id: input.sourceAccountId,
        destination_account_id: input.destinationAccountId,
        amount: input.amount,
        source_transaction_id: sourceTxn.id,
        destination_transaction_id: destTxn.id,
        date: input.date.toISOString(),
      })
      .select()
      .single();

    if (tErr) throw new Error(tErr.message);

    // Link transactions to transfer
    await supabase
      .from('transactions')
      .update({ linked_transfer_id: transferData.id })
      .in('id', [sourceTxn.id, destTxn.id]);

    const transfer: Transfer = {
      id: transferData.id,
      userId,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amount: input.amount,
      sourceTransactionId: sourceTxn.id,
      destinationTransactionId: destTxn.id,
      date: new Date(transferData.date),
      createdAt: new Date(transferData.created_at),
    };

    return { transfer, hasInsufficientBalance };
  }

  async getByAccount(accountId: string): Promise<Transfer[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('transfers')
      .select()
      .eq('user_id', userId)
      .or(`source_account_id.eq.${accountId},destination_account_id.eq.${accountId}`)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      sourceAccountId: row.source_account_id,
      destinationAccountId: row.destination_account_id,
      amount: row.amount,
      sourceTransactionId: row.source_transaction_id,
      destinationTransactionId: row.destination_transaction_id,
      date: new Date(row.date),
      createdAt: new Date(row.created_at),
    }));
  }
}
