import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrackingList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  /** ID del presupuesto vinculado (opcional) */
  linkedBudgetId?: string;
  itemCount: number;
  pendingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingItem {
  id: string;
  listId: string;
  userId: string;
  name: string;
  /** Precio en centavos */
  price: number;
  /** Fecha de última compra */
  lastPurchaseDate?: Date;
  /** Duración promedio en días */
  averageDurationDays?: number;
  /** Fecha estimada de próxima compra (calculada) */
  nextPurchaseDate?: Date;
  /** Si necesita ser comprado */
  needsToBuy: boolean;
  /** Notas adicionales */
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrackingListInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  linkedBudgetId?: string | null;
}

export interface CreateTrackingItemInput {
  listId: string;
  name: string;
  price: number;
  lastPurchaseDate?: Date;
  averageDurationDays?: number;
  needsToBuy?: boolean;
  notes?: string;
}

export interface UpdateTrackingItemInput {
  name?: string;
  price?: number;
  lastPurchaseDate?: Date | null;
  averageDurationDays?: number | null;
  needsToBuy?: boolean;
  notes?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

function calculateNextPurchaseDate(lastPurchaseDate?: Date, averageDurationDays?: number): Date | undefined {
  if (!lastPurchaseDate || !averageDurationDays) return undefined;
  const next = new Date(lastPurchaseDate);
  next.setDate(next.getDate() + averageDurationDays);
  return next;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class TrackingService {
  // ─── Lists ───────────────────────────────────────────────────────────────

  async createList(input: CreateTrackingListInput): Promise<TrackingList> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('tracking_lists')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? '#007DC3',
        icon: input.icon ?? '📋',
        linked_budget_id: input.linkedBudgetId ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapList(data);
  }

  async getAllLists(): Promise<TrackingList[]> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('tracking_lists')
      .select()
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);

    const lists = (data ?? []).map(this.mapList);

    // Get counts for each list
    for (const list of lists) {
      const { count: totalCount } = await supabase
        .from('tracking_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id);

      const { count: pendingCount } = await supabase
        .from('tracking_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id)
        .eq('needs_to_buy', true);

      list.itemCount = totalCount ?? 0;
      list.pendingCount = pendingCount ?? 0;
    }

    return lists;
  }

  async getListById(id: string): Promise<TrackingList | null> {
    const { data, error } = await supabase
      .from('tracking_lists')
      .select()
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapList(data);
  }

  async updateList(id: string, input: Partial<CreateTrackingListInput>): Promise<TrackingList> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (input.name) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.color) updates.color = input.color;
    if (input.icon) updates.icon = input.icon;
    if (input.linkedBudgetId !== undefined) updates.linked_budget_id = input.linkedBudgetId ?? null;

    const { data, error } = await supabase
      .from('tracking_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapList(data);
  }

  async deleteList(id: string): Promise<void> {
    // Items will be cascade deleted via FK
    const { error } = await supabase.from('tracking_lists').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── Items ───────────────────────────────────────────────────────────────

  async createItem(input: CreateTrackingItemInput): Promise<TrackingItem> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('tracking_items')
      .insert({
        list_id: input.listId,
        user_id: userId,
        name: input.name,
        price: input.price,
        last_purchase_date: input.lastPurchaseDate?.toISOString().split('T')[0] ?? null,
        average_duration_days: input.averageDurationDays ?? null,
        needs_to_buy: input.needsToBuy ?? false,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapItem(data);
  }

  async getItemsByList(listId: string): Promise<TrackingItem[]> {
    const { data, error } = await supabase
      .from('tracking_items')
      .select()
      .eq('list_id', listId)
      .order('needs_to_buy', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapItem);
  }

  async updateItem(id: string, input: UpdateTrackingItemInput): Promise<TrackingItem> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.price !== undefined) updates.price = input.price;
    if (input.lastPurchaseDate !== undefined) {
      updates.last_purchase_date = input.lastPurchaseDate
        ? input.lastPurchaseDate.toISOString().split('T')[0]
        : null;
    }
    if (input.averageDurationDays !== undefined) {
      updates.average_duration_days = input.averageDurationDays;
    }
    if (input.needsToBuy !== undefined) updates.needs_to_buy = input.needsToBuy;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { data, error } = await supabase
      .from('tracking_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapItem(data);
  }

  async toggleNeedsToBuy(id: string): Promise<TrackingItem> {
    const { data: current } = await supabase
      .from('tracking_items')
      .select('needs_to_buy')
      .eq('id', id)
      .single();

    if (!current) throw new Error('Item no encontrado');

    const { data, error } = await supabase
      .from('tracking_items')
      .update({
        needs_to_buy: !current.needs_to_buy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapItem(data);
  }

  async markAsPurchased(id: string): Promise<TrackingItem> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tracking_items')
      .update({
        needs_to_buy: false,
        last_purchase_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapItem(data);
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from('tracking_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── Mappers ─────────────────────────────────────────────────────────────

  private mapList(row: any): TrackingList {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description ?? undefined,
      color: row.color,
      icon: row.icon,
      linkedBudgetId: row.linked_budget_id ?? undefined,
      itemCount: 0,
      pendingCount: 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapItem(row: any): TrackingItem {
    const lastPurchaseDate = row.last_purchase_date ? new Date(row.last_purchase_date) : undefined;
    const averageDurationDays = row.average_duration_days ?? undefined;

    return {
      id: row.id,
      listId: row.list_id,
      userId: row.user_id,
      name: row.name,
      price: row.price,
      lastPurchaseDate,
      averageDurationDays,
      nextPurchaseDate: calculateNextPurchaseDate(lastPurchaseDate, averageDurationDays),
      needsToBuy: row.needs_to_buy,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
