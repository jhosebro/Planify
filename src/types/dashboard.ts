/**
 * Tipos relacionados con el dashboard y visualización de datos financieros.
 */

import type { BudgetConsumption, Transaction } from './index';

export interface CategoryDistribution {
  categoryId: string;
  categoryName: string;
  /** Monto en centavos */
  amount: number;
  /** Porcentaje de distribución */
  percentage: number;
}

export interface MonthlyTrend {
  /** Formato YYYY-MM */
  month: string;
  /** Total de ingresos en centavos */
  totalIncome: number;
  /** Total de gastos en centavos */
  totalExpense: number;
}

export interface DashboardData {
  /** Saldo total consolidado en centavos */
  totalBalance: number;
  categoryDistribution: CategoryDistribution[];
  /** Tendencias de los últimos 6 meses */
  monthlyTrends: MonthlyTrend[];
  activeBudgets: BudgetConsumption[];
  /** Últimos 5 movimientos */
  recentTransactions: Transaction[];
}
