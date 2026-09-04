import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset, neuProgress } from '@/lib/neumorphic';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { BudgetService } from '@/services/budgets';
import { ReminderService } from '@/services/reminders';
import type { BudgetConsumption, Reminder, ReminderFrequency } from '@/types';
import type { MainStackParamList } from '@/navigation/types';
import { RemindersList } from '@/components/RemindersList';
import { BottomModal } from '@/components/BottomModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BudgetsScreen() {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const budgetService = useMemo(() => new BudgetService(), []);
  const reminderService = useMemo(() => new ReminderService(), []);

  const [consumptions, setConsumptions] = useState<(BudgetConsumption & { categoryName: string })[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [budgetData, reminderData] = await Promise.all([
        budgetService.getAllConsumptions(),
        reminderService.getAll(),
      ]);
      setConsumptions(budgetData);
      setReminders(reminderData);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error loading budgets data:', msg);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [budgetService, reminderService]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddBudget = useCallback(() => {
    navigation.navigate('AddBudget');
  }, [navigation]);

  const handleAddReminder = useCallback(() => {
    navigation.navigate('AddReminder');
  }, [navigation]);

  const handleBudgetPress = useCallback(
    (budgetId: string) => {
      navigation.navigate('BudgetDetail', { budgetId });
    },
    [navigation]
  );

  // Manual spend inline form state
  const [spendingBudgetId, setSpendingBudgetId] = useState<string | null>(null);
  const [spendingCategoryName, setSpendingCategoryName] = useState('');
  const [spendAmount, setSpendAmount] = useState('');

  const handleAddManualSpent = useCallback(
    (budgetId: string, categoryName: string) => {
      setSpendingBudgetId(budgetId);
      setSpendingCategoryName(categoryName);
      setSpendAmount('');
    },
    []
  );

  const handleConfirmSpent = useCallback(async () => {
    if (!spendingBudgetId) return;
    const raw = spendAmount.replace(/\./g, '');
    const amount = parseInt(raw, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido.');
      return;
    }
    try {
      await budgetService.addManualSpent(spendingBudgetId, amount * 100);
      setSpendingBudgetId(null);
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo registrar el gasto.');
    }
  }, [spendingBudgetId, spendAmount, budgetService, loadData]);

  const handleSpendAmountChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setSpendAmount(digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando presupuestos...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundPrimary }]}>
        <Text style={{ fontSize: 16, color: 'red', textAlign: 'center', margin: 24 }}>
          Error: {loadError}
        </Text>
        <TouchableOpacity onPress={loadData} style={[styles.addButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.addButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
  <View style={{flex: 1}}>
    <FlatList
      style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
      contentContainerStyle={[
        styles.contentContainer,
        isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
      ]}
      data={consumptions}
      keyExtractor={(item) => item.budgetId}
      ListHeaderComponent={
        <View>
          {/* Presupuesto General */}
          <GeneralBudgetCard consumptions={consumptions} reminders={reminders} />

          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Presupuestos</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}
              onPress={handleAddBudget}
              accessibilityRole="button"
              accessibilityLabel="Agregar presupuesto"
            >
              <Text style={styles.addButtonText}>+ Nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <BudgetProgressItem
          consumption={item}
          onPress={() => handleBudgetPress(item.budgetId)}
          onAddSpent={() => handleAddManualSpent(item.budgetId, item.categoryName)}
        />
      )}
      ListEmptyComponent={
        <View style={[neuSurface(scheme, 'raised'), styles.emptyCard]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay presupuestos activos.</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Crea uno para controlar tus gastos.</Text>
        </View>
      }
      ListFooterComponent={
        <View>
          {/* Reminders Section */}
          <View style={styles.remindersHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recordatorios</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}
              onPress={handleAddReminder}
              accessibilityRole="button"
              accessibilityLabel="Agregar recordatorio"
            >
              <Text style={styles.addButtonText}>+ Nuevo</Text>
            </TouchableOpacity>
          </View>
          <RemindersList reminders={reminders} onRefresh={loadData} />
        </View>
      }
    />

    {/* Manual Spend Modal */}
    <BottomModal
      visible={!!spendingBudgetId}
      title="Registrar gasto"
      subtitle={`¿Cuánto gastaste en ${spendingCategoryName}?`}
      onClose={() => setSpendingBudgetId(null)}
    >
      <TextInput
        style={[neuInset(scheme), styles.spendInput, { color: colors.textPrimary, borderRadius: 12 }]}
        value={spendAmount}
        onChangeText={handleSpendAmountChange}
        placeholder="0"
        placeholderTextColor="#999"
        keyboardType="numeric"
        autoFocus
        accessibilityLabel="Monto del gasto manual"
      />
      <Text style={[styles.spendHint, { color: colors.textTertiary }]}>Este gasto no crea un movimiento en tus cuentas.</Text>
      <TouchableOpacity
        style={[styles.spendConfirmBtn, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}
        onPress={handleConfirmSpent}
      >
        <Text style={styles.spendConfirmText}>Registrar</Text>
      </TouchableOpacity>
    </BottomModal>
  </View>
  );
}

// ─── General Budget Card ─────────────────────────────────────────────────────

const RECURRING_FREQUENCIES: ReminderFrequency[] = ['monthly', 'biweekly', 'weekly'];

function isInCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

/** Cuántas veces recurre un recordatorio dentro del mes actual. */
function getRecurrencesInMonth(dueDate: Date, frequency: ReminderFrequency): number {
  if (frequency === 'monthly') return 1;
  const periodDays = frequency === 'weekly' ? 7 : 15;
  const DAY = 86_400_000;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const anchor = new Date(dueDate).getTime();
  const firstK = Math.ceil((monthStart - anchor) / (periodDays * DAY));
  let count = 0;
  let cursor = anchor + firstK * periodDays * DAY;
  while (cursor < monthEnd) {
    count++;
    cursor += periodDays * DAY;
  }
  return count;
}

interface GeneralBudgetCardProps {
  consumptions: (BudgetConsumption & { categoryName: string })[];
  reminders: Reminder[];
}

function GeneralBudgetCard({ consumptions, reminders }: GeneralBudgetCardProps) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';

  const includedConsumptions = consumptions.filter((c) => c.includeInGeneral);
  const includedCategoryIds = new Set(includedConsumptions.map((c) => c.categoryId));
  const recurring = reminders.filter((r) => RECURRING_FREQUENCIES.includes(r.frequency));
  // Solo recordatorios sin presupuesto propio dentro del general, para no contarlos dos veces
  const nonBudgeted = (r: Reminder) => !(r.categoryId && includedCategoryIds.has(r.categoryId));

  // Límite = presupuestos actuales + carga mensual de recordatorios recurrentes pendientes
  const totalBudgetLimits = includedConsumptions.reduce((sum, c) => sum + c.limit, 0);
  const totalReminderLimits = recurring
    .filter((r) => !r.isPaid && nonBudgeted(r))
    .reduce((sum, r) => sum + r.amount * getRecurrencesInMonth(r.dueDate, r.frequency), 0);
  const totalLimit = totalBudgetLimits + totalReminderLimits;

  // Gasto = presupuesto gastado + pagos del MES ACTUAL de recordatorios sin presupuesto
  const totalBudgetSpent = includedConsumptions.reduce((sum, c) => sum + c.spent, 0);
  const totalReminderSpent = recurring
    .filter((r) => r.isPaid && isInCurrentMonth(r.dueDate) && nonBudgeted(r))
    .reduce((sum, r) => sum + r.amount, 0);
  const totalSpent = totalBudgetSpent + totalReminderSpent;

  const percentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100);
  const barColor = percentage > 100
    ? colors.redExpenses
    : percentage >= 80
      ? colors.tertiary
      : colors.greenEarns;

  return (
    <View style={[styles.generalCard, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}>
      <Text style={styles.generalTitle}>💰 Presupuesto General</Text>
      <View style={styles.generalAmounts}>
        <View style={styles.generalAmountItem}>
          <Text style={styles.generalAmountLabel}>Gastado</Text>
          <Text style={[styles.generalAmountValue, { color: barColor }]}>
            {formatAmount(totalSpent)}
          </Text>
        </View>
        <View style={styles.generalAmountItem}>
          <Text style={styles.generalAmountLabel}>Presupuestado</Text>
          <Text style={styles.generalAmountValue}>
            {formatAmount(totalLimit)}
          </Text>
        </View>
      </View>
      <View style={styles.generalProgressBg}>
        <View
          style={[
            styles.generalProgressFill,
            { width: `${displayPercentage}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <View style={styles.generalFooter}>
        <Text style={styles.generalPercentage}>{percentage.toFixed(1)}% usado</Text>
        <Text style={styles.generalRemaining}>
          Disponible: {formatAmount(Math.max(0, totalLimit - totalSpent))}
        </Text>
      </View>
    </View>
  );
}

// ─── Budget Progress Item ────────────────────────────────────────────────────

interface BudgetProgressItemProps {
  consumption: BudgetConsumption & { categoryName: string };
  onPress: () => void;
  onAddSpent: () => void;
}

function BudgetProgressItem({ consumption, onPress, onAddSpent }: BudgetProgressItemProps) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const percentage = Math.min(consumption.percentage, 100);
  const barColor = consumption.isOverBudget
    ? colors.redExpenses
    : consumption.isAtThreshold
      ? colors.tertiary
      : colors.greenEarns;

  return (
    <View style={[neuSurface(scheme, 'raised'), styles.budgetCard]}>
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle presupuesto ${consumption.categoryName ?? 'Sin categoría'}`}
      >
        <View style={styles.budgetHeader}>
          <Text style={[styles.budgetCategory, { color: colors.textPrimary }]}>{consumption.categoryName ?? 'Sin categoría'}</Text>
          <Text style={[styles.budgetPercentageText, { color: barColor }]}>
            {consumption.percentage.toFixed(1)}%
          </Text>
        </View>
        <View style={[neuProgress(scheme), styles.progressBarBackground]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </TouchableOpacity>
      <View style={styles.budgetFooter}>
        <Text style={[styles.budgetAmountText, { color: colors.textSecondary }]}>
          {formatAmount(consumption.spent)} / {formatAmount(consumption.limit)}
        </Text>
        <TouchableOpacity
          style={[styles.addSpentButton, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}
          onPress={onAddSpent}
          accessibilityRole="button"
          accessibilityLabel="Registrar gasto manual"
        >
          <Text style={styles.addSpentButtonText}>+ Gasto</Text>
        </TouchableOpacity>
      </View>
      {consumption.isOverBudget && (
        <Text style={styles.overBudgetBadge}>¡Excedido!</Text>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  budgetCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  budgetPercentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  budgetAmountText: {
    fontSize: 13,
    color: '#666',
  },
  overBudgetBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.redExpenses,
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  addSpentButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  addSpentButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
  },
  remindersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },

  // General Budget Card
  generalCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  generalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  generalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  generalAmountItem: {
    alignItems: 'center',
  },
  generalAmountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  generalAmountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  generalProgressBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  generalProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  generalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  generalPercentage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  generalRemaining: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  spendInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'center',
  },
  spendHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  spendConfirmBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  spendConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
