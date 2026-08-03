import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { DashboardService } from '@/services/dashboard';
import type { DashboardData, CategoryDistribution, MonthlyTrend } from '@/types/dashboard';
import type { BudgetConsumption, Transaction } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32;

type DateRangeOption = 'this_month' | 'last_3_months' | 'last_6_months' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

const CATEGORY_COLORS = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#E7E9ED',
  '#7BC67E',
  '#F7464A',
  '#46BFBD',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getDateRange(option: DateRangeOption): DateRange {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  switch (option) {
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to };
    }
    case 'last_3_months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from, to };
    }
    case 'last_6_months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { from, to };
    }
    case 'custom':
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to };
    }
  }
}

function formatMonth(monthStr: string): string {
  const [, month] = monthStr.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const idx = parseInt(month, 10) - 1;
  return months[idx] ?? month;
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const dashboardService = useMemo(() => new DashboardService(), []);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('this_month');

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange(selectedRange);
      const dashboardData = await dashboardService.getDashboardData(dateRange);
      setData(dashboardData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [dashboardService, selectedRange]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No se pudieron cargar los datos del dashboard.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Date Range Selector */}
      <DateRangeSelector selected={selectedRange} onSelect={setSelectedRange} />

      {/* Total Balance */}
      <TotalBalanceCard balance={data.totalBalance} />

      {/* Category Distribution Pie Chart */}
      <CategoryDistributionChart distribution={data.categoryDistribution} />

      {/* Monthly Trends Line Chart */}
      <MonthlyTrendsChart trends={data.monthlyTrends} />

      {/* Budget Progress Bars */}
      <BudgetProgressSection budgets={data.activeBudgets} />

      {/* Recent Transactions */}
      <RecentTransactionsSection transactions={data.recentTransactions} />
    </ScrollView>
  );
}

// ─── Date Range Selector ─────────────────────────────────────────────────────

interface DateRangeSelectorProps {
  selected: DateRangeOption;
  onSelect: (option: DateRangeOption) => void;
}

const DATE_RANGE_OPTIONS: { key: DateRangeOption; label: string }[] = [
  { key: 'this_month', label: 'Este mes' },
  { key: 'last_3_months', label: '3 meses' },
  { key: 'last_6_months', label: '6 meses' },
];

function DateRangeSelector({ selected, onSelect }: DateRangeSelectorProps) {
  return (
    <View style={styles.dateRangeContainer}>
      {DATE_RANGE_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.dateRangeButton,
            selected === option.key && styles.dateRangeButtonActive,
          ]}
          onPress={() => onSelect(option.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === option.key }}
          accessibilityLabel={`Filtrar por ${option.label}`}
        >
          <Text
            style={[
              styles.dateRangeButtonText,
              selected === option.key && styles.dateRangeButtonTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Total Balance Card ──────────────────────────────────────────────────────

interface TotalBalanceCardProps {
  balance: number;
}

function TotalBalanceCard({ balance }: TotalBalanceCardProps) {
  return (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>Saldo Total</Text>
      <Text style={[styles.balanceAmount, balance < 0 && styles.negativeAmount]}>
        {formatAmount(balance)}
      </Text>
    </View>
  );
}

// ─── Category Distribution Chart ─────────────────────────────────────────────

interface CategoryDistributionChartProps {
  distribution: CategoryDistribution[];
}

function CategoryDistributionChart({ distribution }: CategoryDistributionChartProps) {
  if (distribution.length === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Distribución por Categoría</Text>
        <Text style={styles.emptyChartText}>No hay gastos registrados en este período.</Text>
      </View>
    );
  }

  const pieData = distribution.map((item, index) => ({
    name: item.categoryName,
    population: item.amount / 100,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Distribución por Categoría</Text>
      <PieChart
        data={pieData}
        width={CHART_WIDTH}
        height={200}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="0"
        absolute={false}
      />
    </View>
  );
}

// ─── Monthly Trends Chart ────────────────────────────────────────────────────

interface MonthlyTrendsChartProps {
  trends: MonthlyTrend[];
}

function MonthlyTrendsChart({ trends }: MonthlyTrendsChartProps) {
  if (trends.length === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Tendencia de Ingresos y Gastos</Text>
        <Text style={styles.emptyChartText}>No hay datos de tendencia disponibles.</Text>
      </View>
    );
  }

  const labels = trends.map((t) => formatMonth(t.month));
  const incomeData = trends.map((t) => t.totalIncome / 100);
  const expenseData = trends.map((t) => t.totalExpense / 100);

  const hasData = incomeData.some((v) => v > 0) || expenseData.some((v) => v > 0);

  if (!hasData) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Tendencia de Ingresos y Gastos</Text>
        <Text style={styles.emptyChartText}>Aún no hay movimientos para mostrar tendencias.</Text>
      </View>
    );
  }

  // Ensure datasets have at least a small value to prevent chart-kit crashes
  const safeIncome = incomeData.some((v) => v > 0) ? incomeData : incomeData.map(() => 0.01);
  const safeExpense = expenseData.some((v) => v > 0) ? expenseData : expenseData.map(() => 0.01);

  const lineData = {
    labels,
    datasets: [
      {
        data: safeIncome,
        color: (opacity = 1) => `rgba(46, 173, 93, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: safeExpense,
        color: (opacity = 1) => `rgba(231, 102, 102, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Ingresos', 'Gastos'],
  };

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Tendencia de Ingresos y Gastos</Text>
      <LineChart
        data={lineData}
        width={CHART_WIDTH}
        height={220}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(74, 144, 217, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
          style: { borderRadius: 8 },
          propsForDots: {
            r: '4',
            strokeWidth: '1',
            stroke: colors.primary,
          },
        }}
        bezier
        style={styles.lineChart}
      />
    </View>
  );
}

// ─── Budget Progress Section ─────────────────────────────────────────────────

interface BudgetProgressSectionProps {
  budgets: BudgetConsumption[];
}

function BudgetProgressSection({ budgets }: BudgetProgressSectionProps) {
  if (budgets.length === 0) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Presupuestos Activos</Text>
        <Text style={styles.emptyChartText}>No hay presupuestos activos.</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Presupuestos Activos</Text>
      {budgets.map((budget) => (
        <BudgetProgressBar key={budget.budgetId} budget={budget} />
      ))}
    </View>
  );
}

interface BudgetProgressBarProps {
  budget: BudgetConsumption;
}

function BudgetProgressBar({ budget }: BudgetProgressBarProps) {
  const percentage = Math.min(budget.percentage, 100);
  const barColor = budget.isOverBudget
    ? colors.redExpenses
    : budget.isAtThreshold
      ? colors.tertiary
      : colors.greenEarns;

  return (
    <View style={styles.budgetItem}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetCategory}>{(budget as any).categoryName ?? budget.categoryId}</Text>
        <Text style={styles.budgetAmount}>
          {formatAmount(budget.spent)} / {formatAmount(budget.limit)}
        </Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={[styles.budgetPercentage, { color: barColor }]}>
        {budget.percentage.toFixed(1)}%
        {budget.isOverBudget && ' - ¡Excedido!'}
      </Text>
    </View>
  );
}

// ─── Recent Transactions Section ─────────────────────────────────────────────

interface RecentTransactionsSectionProps {
  transactions: Transaction[];
}

function RecentTransactionsSection({ transactions }: RecentTransactionsSectionProps) {
  if (transactions.length === 0) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
        <Text style={styles.emptyChartText}>No hay movimientos recientes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => <TransactionRow transaction={item} />}
      />
    </View>
  );
}

interface TransactionRowProps {
  transaction: Transaction;
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const color = isExpense ? colors.redExpenses : colors.greenEarns;

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>
          {transaction.description || (isExpense ? 'Gasto' : 'Ingreso')}
        </Text>
        <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
      </View>
      <Text style={[styles.transactionAmount, { color }]}>
        {sign}{formatAmount(transaction.amount)}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundPrimary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.backgroundPrimary,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Date Range Selector
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dateRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  dateRangeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateRangeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dateRangeButtonTextActive: {
    color: '#fff',
  },

  // Balance Card
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  negativeAmount: {
    color: '#FFCDD2',
  },

  // Chart Cards
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyChartText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  lineChart: {
    borderRadius: 8,
    marginLeft: -8,
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  // Budget Progress
  budgetItem: {
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  budgetAmount: {
    fontSize: 12,
    color: '#666',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetPercentage: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },

  // Transactions
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
