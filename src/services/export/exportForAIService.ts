import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountSummary {
  nombre: string;
  tipo: 'Efectivo' | 'Banco' | 'Tarjeta de crédito';
  saldo: string;
  archivada: boolean;
}

interface TransactionSummary {
  fecha: string;
  tipo: 'Ingreso' | 'Gasto';
  monto: string;
  cuenta: string;
  categoría: string;
  descripción: string;
}

interface BudgetSummary {
  categoría: string;
  límite_mensual: string;
  gasto_actual: string;
  porcentaje_usado: string;
  excedido: boolean;
}

interface GoalSummary {
  nombre: string;
  descripción: string;
  monto_objetivo: string;
  monto_ahorrado: string;
  progreso: string;
  prioridad: string;
  tipo: string;
  fecha_objetivo: string;
  cuota_sugerida: string;
  frecuencia_cuota: string;
  estado: string;
}

interface ReminderSummary {
  descripción: string;
  monto: string;
  fecha_vencimiento: string;
  frecuencia: string;
  pagado: boolean;
}

interface DebtSummary {
  nombre: string;
  categoría: 'Tarjeta de crédito' | 'Deuda en cuotas' | 'Cuenta personal';
  dirección: 'Yo debo' | 'Me deben';
  monto_total: string;
  monto_pagado: string;
  monto_pendiente: string;
  progreso: string;
  cuotas_totales?: number;
  cuotas_pagadas?: number;
  monto_por_cuota?: string;
  contraparte?: string;
  estado: string;
}

export interface AIExportData {
  prompt_sistema: string;
  fecha_exportación: string;
  moneda: string;
  resumen_general: {
    balance_total: string;
    ingresos_mes_actual: string;
    gastos_mes_actual: string;
    ahorro_mes_actual: string;
    tasa_ahorro: string;
    total_deudas: string;
    total_por_cobrar: string;
  };
  cuentas: AccountSummary[];
  transacciones_últimos_3_meses: TransactionSummary[];
  presupuestos: BudgetSummary[];
  deudas: DebtSummary[];
  metas_financieras: GoalSummary[];
  recordatorios_pendientes: ReminderSummary[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

function formatCentavos(centavos: number): string {
  return `$${(centavos / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

const ACCOUNT_TYPE_MAP: Record<string, AccountSummary['tipo']> = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de crédito',
};

const FREQUENCY_MAP: Record<string, string> = {
  once: 'Una vez',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

const PRIORITY_MAP: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const GOAL_TYPE_MAP: Record<string, string> = {
  personal: 'Personal',
  couple: 'En pareja',
};

const GOAL_STATUS_MAP: Record<string, string> = {
  active: 'Activa',
  completed: 'Completada',
  paused: 'Pausada',
};

const DEBT_CATEGORY_MAP: Record<string, DebtSummary['categoría']> = {
  credit_card: 'Tarjeta de crédito',
  installment: 'Deuda en cuotas',
  personal: 'Cuenta personal',
};

const DEBT_DIRECTION_MAP: Record<string, DebtSummary['dirección']> = {
  i_owe: 'Yo debo',
  they_owe_me: 'Me deben',
};

const DEBT_STATUS_MAP: Record<string, string> = {
  active: 'Activa',
  paid_off: 'Pagada',
};

// ─── Service ─────────────────────────────────────────────────────────────────

export class ExportForAIService {
  async generate(): Promise<AIExportData> {
    const userId = getUserId();
    const now = new Date();

    // Date ranges
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();

    // Parallel queries
    const [accountsRes, transactionsRes, currentMonthRes, budgetsRes, goalsRes, remindersRes, debtsRes] =
      await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userId)
          .order('name'),
        supabase
          .from('transactions')
          .select('*, accounts(name), categories(name)')
          .eq('user_id', userId)
          .gte('date', threeMonthsAgo)
          .order('date', { ascending: false }),
        supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', userId)
          .gte('date', monthStart),
        supabase
          .from('budgets')
          .select('*, categories(name)')
          .eq('user_id', userId)
          .eq('is_active', true),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .order('priority')
          .order('target_date'),
        supabase
          .from('reminders')
          .select('*')
          .eq('user_id', userId)
          .eq('is_paid', false)
          .order('due_date'),
        supabase
          .from('debts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

    // Process accounts
    const accounts = (accountsRes.data ?? []).map((a: any): AccountSummary => ({
      nombre: a.name,
      tipo: ACCOUNT_TYPE_MAP[a.type] ?? a.type,
      saldo: formatCentavos(a.balance),
      archivada: !!a.is_archived,
    }));

    const totalBalance = (accountsRes.data ?? [])
      .filter((a: any) => !a.is_archived)
      .reduce((sum: number, a: any) => sum + a.balance, 0);

    // Process current month income/expenses
    const currentMonthTxs = currentMonthRes.data ?? [];
    const monthIncome = currentMonthTxs
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const monthExpense = currentMonthTxs
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const monthSaving = monthIncome - monthExpense;
    const savingsRate = monthIncome > 0 ? ((monthSaving / monthIncome) * 100).toFixed(1) : '0';

    // Process transactions (last 3 months)
    const transactions = (transactionsRes.data ?? []).map((t: any): TransactionSummary => ({
      fecha: formatDate(t.date),
      tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
      monto: formatCentavos(t.amount),
      cuenta: t.accounts?.name ?? '',
      categoría: t.categories?.name ?? '',
      descripción: t.description ?? '',
    }));

    // Process budgets
    const budgets = (budgetsRes.data ?? []).map((b: any): BudgetSummary => {
      const spent = b.current_spent ?? 0;
      const limit = b.monthly_limit;
      const pct = limit > 0 ? ((spent / limit) * 100).toFixed(1) : '0';
      return {
        categoría: b.categories?.name ?? '',
        límite_mensual: formatCentavos(limit),
        gasto_actual: formatCentavos(spent),
        porcentaje_usado: `${pct}%`,
        excedido: spent > limit,
      };
    });

    // Process goals
    const goals = (goalsRes.data ?? []).map((g: any): GoalSummary => {
      const progress = g.target_amount > 0
        ? ((g.saved_amount / g.target_amount) * 100).toFixed(1)
        : '0';
      return {
        nombre: g.name,
        descripción: g.description ?? '',
        monto_objetivo: formatCentavos(g.target_amount),
        monto_ahorrado: formatCentavos(g.saved_amount),
        progreso: `${progress}%`,
        prioridad: PRIORITY_MAP[g.priority] ?? g.priority,
        tipo: GOAL_TYPE_MAP[g.type] ?? g.type,
        fecha_objetivo: formatDate(g.target_date),
        cuota_sugerida: formatCentavos(g.suggested_installment),
        frecuencia_cuota: FREQUENCY_MAP[g.installment_frequency] ?? g.installment_frequency,
        estado: GOAL_STATUS_MAP[g.status] ?? g.status,
      };
    });

    // Process reminders
    const reminders = (remindersRes.data ?? []).map((r: any): ReminderSummary => ({
      descripción: r.description,
      monto: formatCentavos(r.amount),
      fecha_vencimiento: formatDate(r.due_date),
      frecuencia: FREQUENCY_MAP[r.frequency] ?? r.frequency,
      pagado: !!r.is_paid,
    }));

    // Process debts
    const debtsData = debtsRes.data ?? [];
    const debts = debtsData.map((d: any): DebtSummary => {
      const remaining = d.total_amount - d.paid_amount;
      const progress = d.total_amount > 0 ? ((d.paid_amount / d.total_amount) * 100).toFixed(1) : '0';
      return {
        nombre: d.name,
        categoría: DEBT_CATEGORY_MAP[d.category] ?? d.category,
        dirección: DEBT_DIRECTION_MAP[d.direction] ?? d.direction,
        monto_total: formatCentavos(d.total_amount),
        monto_pagado: formatCentavos(d.paid_amount),
        monto_pendiente: formatCentavos(remaining),
        progreso: `${progress}%`,
        cuotas_totales: d.total_installments ?? undefined,
        cuotas_pagadas: d.paid_installments ?? undefined,
        monto_por_cuota: d.installment_amount ? formatCentavos(d.installment_amount) : undefined,
        contraparte: d.counterparty ?? undefined,
        estado: DEBT_STATUS_MAP[d.status] ?? d.status,
      };
    });

    const totalDebt = debtsData
      .filter((d: any) => d.status === 'active' && d.direction === 'i_owe')
      .reduce((sum: number, d: any) => sum + (d.total_amount - d.paid_amount), 0);
    const totalReceivable = debtsData
      .filter((d: any) => d.status === 'active' && d.direction === 'they_owe_me')
      .reduce((sum: number, d: any) => sum + (d.total_amount - d.paid_amount), 0);

    return {
      prompt_sistema: this.buildSystemPrompt(),
      fecha_exportación: now.toISOString(),
      moneda: 'COP (pesos colombianos)',
      resumen_general: {
        balance_total: formatCentavos(totalBalance),
        ingresos_mes_actual: formatCentavos(monthIncome),
        gastos_mes_actual: formatCentavos(monthExpense),
        ahorro_mes_actual: formatCentavos(monthSaving),
        tasa_ahorro: `${savingsRate}%`,
        total_deudas: formatCentavos(totalDebt),
        total_por_cobrar: formatCentavos(totalReceivable),
      },
      cuentas: accounts,
      transacciones_últimos_3_meses: transactions,
      presupuestos: budgets,
      deudas: debts,
      metas_financieras: goals,
      recordatorios_pendientes: reminders,
    };
  }

  private buildSystemPrompt(): string {
    return `Eres un asesor financiero personal experto. A continuación recibirás los datos financieros reales de un usuario exportados desde su app de finanzas personales "Planify". Los montos están en pesos colombianos (COP).

Tu objetivo es:
1. Analizar su situación financiera actual (ingresos, gastos, ahorro, deudas).
2. Evaluar sus presupuestos y si los está cumpliendo.
3. Revisar sus deudas: tarjetas de crédito, cuotas pendientes, y cuentas por cobrar/pagar.
4. Revisar el progreso de sus metas de ahorro y dar recomendaciones para alcanzarlas.
5. Identificar patrones de gasto problemáticos o áreas de mejora.
6. Dar recomendaciones concretas, priorizadas y accionables.
7. Si tiene recordatorios de pagos pendientes, advertir sobre vencimientos próximos.

Reglas:
- Sé directo y práctico, no des consejos genéricos.
- Basa todo en los datos reales proporcionados.
- Si la tasa de ahorro es baja, sugiere recortes específicos basados en las categorías de gasto.
- Si hay presupuestos excedidos, señálalos con urgencia.
- Si tiene deudas con cuotas, indica cuántas faltan y cuánto queda por pagar.
- Si le deben dinero, recomienda hacer seguimiento.
- Habla en español de forma cercana pero profesional.
- Estructura tu respuesta con secciones claras: Diagnóstico, Deudas, Presupuestos, Metas, Recomendaciones.

Aquí están los datos financieros del usuario:`;
  }

  formatForClipboard(data: AIExportData): string {
    return JSON.stringify(data, null, 2);
  }
}
