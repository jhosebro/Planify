import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { useResponsiveLayout, type ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SimpleLineChart } from '@/components/SimpleLineChart';
import { DashboardService } from '@/services/dashboard';
import type { DashboardData, CategoryDistribution, MonthlyTrend } from '@/types/dashboard';
import type { BudgetConsumption, Transaction } from '@/types';

// ─── Chart Error Boundary ────────────────────────────────────────────────────

class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackText?: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallbackText?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
            {this.props.fallbackText ?? 'No se pudo mostrar el gráfico.'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Defers chart rendering to the next frame so the ErrorBoundary can catch
 * crashes that happen during the initial synchronous render.
 */
function DeferredChart({ children, fallbackText }: { children: React.ReactNode; fallbackText?: string }) {
  const colors = useThemeColors();
  const [ready, setReady] = useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return (
      <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <ChartErrorBoundary fallbackText={fallbackText}>
      {children}
    </ChartErrorBoundary>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHART_WIDTH = Math.max(Dimensions.get('window').width - 32, 280);

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
  if (!monthStr || !monthStr.includes('-')) return monthStr ?? '';
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
  const colors = useThemeColors();
  const dashboardService = useMemo(() => new DashboardService(), []);
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;

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
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando datos...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.backgroundPrimary }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No se pudieron cargar los datos del dashboard.</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadDashboardData}>
          <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]} contentContainerStyle={[
      styles.contentContainer,
      isDesktop && { paddingHorizontal: layout.contentPadding, maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' },
    ]}>
      {/* Date Range Selector */}
      <DateRangeSelector selected={selectedRange} onSelect={setSelectedRange} />

      {/* Total Balance */}
      <TotalBalanceCard balance={data.totalBalance} />

      {/* Desktop: Two-column grid for charts */}
      {isDesktop ? (
        <View style={desktopStyles.gridRow}>
          <View style={desktopStyles.gridCol}>
            <CategoryDistributionChart distribution={data.categoryDistribution} layout={layout} />
          </View>
          <View style={desktopStyles.gridCol}>
            <MonthlyTrendsChart trends={data.monthlyTrends} layout={layout} />
          </View>
        </View>
      ) : (
        <>
          <CategoryDistributionChart distribution={data.categoryDistribution} layout={layout} />
          <MonthlyTrendsChart trends={data.monthlyTrends} layout={layout} />
        </>
      )}

      {/* Desktop: Two-column grid for budgets and transactions */}
      {isDesktop ? (
        <View style={desktopStyles.gridRow}>
          <View style={desktopStyles.gridCol}>
            <BudgetProgressSection budgets={data.activeBudgets} />
          </View>
          <View style={desktopStyles.gridCol}>
            <RecentTransactionsSection transactions={data.recentTransactions} />
          </View>
        </View>
      ) : (
        <>
          <BudgetProgressSection budgets={data.activeBudgets} />
          <RecentTransactionsSection transactions={data.recentTransactions} />
        </>
      )}
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
  const colors = useThemeColors();

  return (
    <View style={styles.dateRangeContainer}>
      {DATE_RANGE_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.dateRangeButton,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            selected === option.key && [styles.dateRangeButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
          ]}
          onPress={() => onSelect(option.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === option.key }}
          accessibilityLabel={`Filtrar por ${option.label}`}
        >
          <Text
            style={[
              styles.dateRangeButtonText,
              { color: colors.textSecondary },
              selected === option.key && [styles.dateRangeButtonTextActive, { color: colors.textInverse }],
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
  const colors = useThemeColors();

  return (
    <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
      <Text style={styles.balanceLabel}>Saldo Total</Text>
      <Text style={[styles.balanceAmount, { color: '#FFFFFF' }, balance < 0 && styles.negativeAmount]}>
        {formatAmount(balance)}
      </Text>
    </View>
  );
}

// ─── Category Distribution Chart ─────────────────────────────────────────────

interface CategoryDistributionChartProps {
  distribution: CategoryDistribution[];
  layout: ResponsiveLayout;
}

function CategoryDistributionChart({ distribution, layout }: CategoryDistributionChartProps) {
  const colors = useThemeColors();

  if (distribution.length === 0) {
    return (
      <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Distribución por Categoría</Text>
        <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>No hay gastos registrados en este período.</Text>
      </View>
    );
  }

  const pieData = distribution.map((item, index) => ({
    name: item.categoryName,
    population: item.amount / 100,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    legendFontColor: colors.textPrimary,
    legendFontSize: 12,
  }));

  // Use a responsive chart width based on layout
  const chartWidth = Platform.OS === 'web' && layout.isDesktop
    ? Math.max(Math.min(layout.contentMaxWidth / 2 - 80, 440), 280)
    : CHART_WIDTH;

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.cardBackground, overflow: 'hidden' }]}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Distribución por Categoría</Text>
      {chartWidth > 0 && (
        <DeferredChart fallbackText="No se pudo mostrar el gráfico de categorías.">
          <PieChart
            data={pieData}
            width={chartWidth}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute={false}
          />
        </DeferredChart>
      )}
    </View>
  );
}

// ─── Monthly Trends Chart ────────────────────────────────────────────────────

interface MonthlyTrendsChartProps {
  trends: MonthlyTrend[];
  layout: ResponsiveLayout;
}

function MonthlyTrendsChart({ trends, layout }: MonthlyTrendsChartProps) {
  const colors = useThemeColors();

  if (trends.length === 0) {
    return (
      <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Tendencia de Ingresos y Gastos</Text>
        <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>No hay datos de tendencia disponibles.</Text>
      </View>
    );
  }

  const labels = trends.map((t) => formatMonth(t.month));
  const incomeData = trends.map((t) => t.totalIncome / 100);
  const expenseData = trends.map((t) => t.totalExpense / 100);

  const hasData = incomeData.some((v) => v > 0) || expenseData.some((v) => v > 0);

  if (!hasData) {
    return (
      <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Tendencia de Ingresos y Gastos</Text>
        <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>Aún no hay movimientos para mostrar tendencias.</Text>
      </View>
    );
  }

  // react-native-chart-kit needs at least 2 data points to render correctly
  const safeLabels = labels.length < 2 ? [...labels, ''] : labels;
  const safeIncome = incomeData.length < 2
    ? [...incomeData, incomeData[incomeData.length - 1] ?? 0]
    : incomeData;
  const safeExpense = expenseData.length < 2
    ? [...expenseData, expenseData[expenseData.length - 1] ?? 0]
    : expenseData;

  const lineData = {
    labels: safeLabels,
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

  // Use a responsive chart width
  const chartWidth = Platform.OS === 'web' && layout.isDesktop
    ? Math.max(Math.min(layout.contentMaxWidth / 2 - 80, 440), 280)
    : CHART_WIDTH;

  // LineChart from react-native-chart-kit crashes on web — use SimpleLineChart instead
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.chartCard, { backgroundColor: colors.cardBackground, overflow: 'hidden' }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Tendencia de Ingresos y Gastos</Text>
        <SimpleLineChart
          labels={labels}
          datasets={[
            { data: incomeData, color: colors.greenEarns, label: 'Ingresos' },
            { data: expenseData, color: colors.redExpenses, label: 'Gastos' },
          ]}
          width={chartWidth}
          height={220}
        />
      </View>
    );
  }

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.cardBackground, overflow: 'hidden' }]}>
      <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Tendencia de Ingresos y Gastos</Text>
      {chartWidth > 0 && (
        <LineChart
          data={lineData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: colors.cardBackground,
            backgroundGradientFrom: colors.cardBackground,
            backgroundGradientTo: colors.cardBackground,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(74, 144, 217, ${opacity})`,
            labelColor: () => colors.textPrimary,
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
      )}
    </View>
  );
}

// ─── Budget Progress Section ─────────────────────────────────────────────────

interface BudgetProgressSectionProps {
  budgets: BudgetConsumption[];
}

function BudgetProgressSection({ budgets }: BudgetProgressSectionProps) {
  const colors = useThemeColors();

  if (budgets.length === 0) {
    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Presupuestos Activos</Text>
        <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>No hay presupuestos activos.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Presupuestos Activos</Text>
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
  const colors = useThemeColors();
  const percentage = Math.min(budget.percentage, 100);
  const barColor = budget.isOverBudget
    ? colors.redExpenses
    : budget.isAtThreshold
      ? colors.tertiary
      : colors.greenEarns;

  return (
    <View style={styles.budgetItem}>
      <View style={styles.budgetHeader}>
        <Text style={[styles.budgetCategory, { color: colors.textPrimary }]}>{(budget as any).categoryName ?? budget.categoryId}</Text>
        <Text style={[styles.budgetAmount, { color: colors.textSecondary }]}>
          {formatAmount(budget.spent)} / {formatAmount(budget.limit)}
        </Text>
      </View>
      <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
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
  const colors = useThemeColors();

  if (transactions.length === 0) {
    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Últimos Movimientos</Text>
        <Text style={[styles.emptyChartText, { color: colors.textTertiary }]}>No hay movimientos recientes.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Últimos Movimientos</Text>
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
  const colors = useThemeColors();
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const color = isExpense ? colors.redExpenses : colors.greenEarns;

  return (
    <View style={[styles.transactionRow, { borderBottomColor: colors.border }]}>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDescription, { color: colors.textPrimary }]}>
          {transaction.description || (isExpense ? 'Gasto' : 'Ingreso')}
        </Text>
        <Text style={[styles.transactionDate, { color: colors.textTertiary }]}>{formatDate(transaction.date)}</Text>
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
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
    borderWidth: 1,
  },
  dateRangeButtonActive: {
    borderWidth: 1,
  },
  dateRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateRangeButtonTextActive: {
    fontWeight: '600',
  },

  // Balance Card
  balanceCard: {
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
  },
  negativeAmount: {
    color: '#FFCDD2',
  },

  // Chart Cards
  chartCard: {
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
    marginBottom: 12,
  },
  emptyChartText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  lineChart: {
    borderRadius: 8,
    marginLeft: -8,
  },

  // Section Card
  sectionCard: {
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
  },
  budgetAmount: {
    fontSize: 12,
  },
  progressBarBackground: {
    height: 8,
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
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Desktop-specific Styles ─────────────────────────────────────────────────

const desktopStyles = StyleSheet.create({
  gridRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  gridCol: {
    flex: 1,
  },
});
