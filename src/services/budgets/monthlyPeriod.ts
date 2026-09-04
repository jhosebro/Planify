import AsyncStorage from '@react-native-async-storage/async-storage';

export const BUDGET_RESET_STORAGE_KEY = 'planify_budget_reset_period';

export function getCurrentMonthPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Indica si una fecha (p.ej. updated_at del presupuesto) pertenece al mes en curso.
 * Se usa para saber si un manual_spent almacenado corresponde al mes actual o a uno anterior.
 */
export function isWithinCurrentMonth(iso: string | null | undefined): boolean {
  if (!iso) return true;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}