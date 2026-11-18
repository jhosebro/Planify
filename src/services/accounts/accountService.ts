import { supabase } from '@/lib/supabase';
import type { Account, AccountType } from '@/types';
import { useAuthStore } from '@/store/authStore';

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  initialBalance: number;
}

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

/** Suma `delta` (en centavos) al saldo de la cuenta. Lanza si no se pudo aplicar. */
export async function adjustAccountBalance(accountId: string, delta: number): Promise<void> {
  if (delta === 0) return;

  // Atómico en el servidor (migración 20261117_update_account_balance.sql)
  const { error: rpcError } = await supabase.rpc('update_account_balance', {
    p_account_id: accountId,
    p_delta: delta,
  });
  if (!rpcError) return;

  // shortcut: leer-y-escribir no es atómico; desaparece cuando la migración esté aplicada en todos los entornos
  const { data: acc, error: readError } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();
  if (readError || !acc) throw new Error(`No se pudo leer el saldo de la cuenta: ${readError?.message ?? accountId}`);

  const { error: writeError } = await supabase
    .from('accounts')
    .update({ balance: acc.balance + delta, updated_at: new Date().toISOString() })
    .eq('id', accountId);
  if (writeError) throw new Error(`No se pudo actualizar el saldo: ${writeError.message}`);
}

export class AccountService {
  async create(input: CreateAccountInput): Promise<Account> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        balance: input.initialBalance,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  async update(id: string, updates: Partial<Pick<Account, 'name' | 'type'>>): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async getAll(): Promise<Account[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('accounts')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapRow);
  }

  async getActiveAccounts(): Promise<Account[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('accounts')
      .select()
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapRow);
  }

  async getTotalBalance(): Promise<number> {
    const accounts = await this.getActiveAccounts();
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  async getById(id: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select()
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapRow(data);
  }

  private mapRow(row: any): Account {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type as AccountType,
      balance: row.balance,
      isArchived: row.is_archived,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
