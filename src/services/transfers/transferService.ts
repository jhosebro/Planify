import { supabase } from '@/lib/supabase';
import type { Transfer } from '@/types';
import { useAuthStore } from '@/store/authStore';

export const TRANSFER_CATEGORY_ID = 'system-transfer';

export interface CreateTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: Date;
  description?: string;
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
  /** Obtiene o crea la categoría "Transferencia" para el usuario. */
  private async ensureTransferCategory(userId: string): Promise<string> {
    // Try to find it first (race condition guard)
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Transferencia')
      .maybeSingle();

    if (existing?.id) return existing.id;

    // Create it if it doesn't exist
    const { data: created, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: 'Transferencia', icon: '↔️', color: '#607D8B', is_default: true })
      .select('id')
      .single();

    if (error) throw new Error(`No se pudo crear la categoría de transferencia: ${error.message}`);
    return created.id;
  }

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

    // Get transfer category and both account names in parallel
    const [catResult, srcAccResult, destAccResult] = await Promise.all([
      supabase.from('categories').select('id').eq('user_id', userId).eq('name', 'Transferencia').single(),
      supabase.from('accounts').select('id, name, balance').eq('id', input.sourceAccountId).single(),
      supabase.from('accounts').select('id, name, balance').eq('id', input.destinationAccountId).single(),
    ]);

    const categoryId = catResult.data?.id ?? await this.ensureTransferCategory(userId);
    const srcAccName = srcAccResult.data?.name ?? 'Cuenta origen';
    const destAccName = destAccResult.data?.name ?? 'Cuenta destino';

    const baseDesc = input.description?.trim() ?? '';
    const sourceDesc = baseDesc ? `${baseDesc} → ${destAccName}` : `Transferencia → ${destAccName}`;
    const destDesc = baseDesc ? `${baseDesc} ← ${srcAccName}` : `Transferencia ← ${srcAccName}`;

    // Create expense transaction (source)
    const { data: sourceTxn, error: srcErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: input.sourceAccountId,
        type: 'expense',
        amount: input.amount,
        category_id: categoryId,
        description: sourceDesc,
        date: input.date.toISOString(),
      })
      .select()
      .single();

    if (srcErr) {
      console.error('[TransferService] source transaction error:', srcErr);
      throw new Error(srcErr.message);
    }

    // Create income transaction (destination)
    const { data: destTxn, error: destErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: input.destinationAccountId,
        type: 'income',
        amount: input.amount,
        category_id: categoryId,
        description: destDesc,
        date: input.date.toISOString(),
      })
      .select()
      .single();

    if (destErr) {
      console.error('[TransferService] dest transaction error:', destErr);
      throw new Error(destErr.message);
    }

    // Update source account balance
    const srcBalance = srcAccResult.data?.balance ?? 0;
    await supabase
      .from('accounts')
      .update({ balance: srcBalance - input.amount, updated_at: new Date().toISOString() })
      .eq('id', input.sourceAccountId);

    // Update destination account balance
    const destBalance = destAccResult.data?.balance ?? 0;
    await supabase
      .from('accounts')
      .update({ balance: destBalance + input.amount, updated_at: new Date().toISOString() })
      .eq('id', input.destinationAccountId);

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

    if (tErr) {
      console.error('[TransferService] transfer record error:', tErr);
      throw new Error(tErr.message);
    }

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
