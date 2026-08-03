/**
 * Tipos e interfaces compartidos del dominio de finanzas personales.
 * Todos los montos monetarios se almacenan en centavos (enteros)
 * para evitar errores de punto flotante.
 */

// === Cuentas Financieras ===

export type AccountType = 'cash' | 'bank' | 'credit_card';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  /** Saldo en centavos */
  balance: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// === Movimientos ===

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  /** Monto siempre positivo, en centavos */
  amount: number;
  categoryId: string;
  description?: string;
  date: Date;
  /** ID de transferencia vinculada (si aplica) */
  linkedTransferId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// === Transferencias ===

export interface Transfer {
  id: string;
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  /** Monto en centavos */
  amount: number;
  sourceTransactionId: string;
  destinationTransactionId: string;
  date: Date;
  createdAt: Date;
}

// === Presupuestos ===

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  /** Límite mensual en centavos */
  monthlyLimit: number;
  /** Umbral de alerta como porcentaje (0-100) */
  alertThreshold: number;
  /** Gasto acumulado del mes actual en centavos */
  currentSpent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetConsumption {
  budgetId: string;
  categoryId: string;
  /** Límite en centavos */
  limit: number;
  /** Gasto acumulado en centavos */
  spent: number;
  /** Porcentaje de consumo (0-100+) */
  percentage: number;
  isOverBudget: boolean;
  isAtThreshold: boolean;
}

// === Recordatorios ===

export type ReminderFrequency = 'once' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Reminder {
  id: string;
  userId: string;
  description: string;
  /** Monto en centavos */
  amount: number;
  dueDate: Date;
  frequency: ReminderFrequency;
  isPaid: boolean;
  isOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// === Sincronización ===

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'conflict';

export interface SyncEntry {
  id: string;
  entityType: 'transaction' | 'account' | 'budget' | 'reminder';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: Date;
  isSynced: boolean;
}
