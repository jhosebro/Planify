import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuProgress } from '@/lib/neumorphic';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { GoalService } from '@/services/goals';
import type { Goal } from '@/services/goals';
import type { MainStackParamList } from '@/navigation/types';
import { ScreenTourModal, type TourSlide } from '@/components/ScreenTourModal';
import { useScreenTour } from '@/hooks/useScreenTour';

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: 'Alta', color: colors.redExpenses },
  medium: { label: 'Media', color: colors.tertiary },
  low: { label: 'Baja', color: colors.greenEarns },
};

// ─── Filter & Sort Types ─────────────────────────────────────────────────────

type GoalFilterType = 'all' | 'personal' | 'couple';
type GoalFilterPriority = 'all' | 'high' | 'medium' | 'low';
type GoalSortKey = 'date_asc' | 'date_desc' | 'progress_asc' | 'progress_desc' | 'amount_asc' | 'amount_desc' | 'priority';

const FILTER_TYPE_OPTIONS: { key: GoalFilterType; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'personal', label: '👤 Personal' },
  { key: 'couple', label: '👥 Pareja' },
];

const FILTER_PRIORITY_OPTIONS: { key: GoalFilterPriority; label: string; color?: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'high', label: 'Alta', color: colors.redExpenses },
  { key: 'medium', label: 'Media', color: colors.tertiary },
  { key: 'low', label: 'Baja', color: colors.greenEarns },
];

const SORT_OPTIONS: { key: GoalSortKey; label: string }[] = [
  { key: 'date_asc', label: 'Más cercana' },
  { key: 'date_desc', label: 'Más lejana' },
  { key: 'progress_desc', label: 'Mayor progreso' },
  { key: 'progress_asc', label: 'Menor progreso' },
  { key: 'amount_desc', label: 'Mayor monto' },
  { key: 'amount_asc', label: 'Menor monto' },
  { key: 'priority', label: 'Prioridad' },
];

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortGoals(goals: Goal[], sortKey: GoalSortKey): Goal[] {
  const sorted = [...goals];
  switch (sortKey) {
    case 'date_asc':
      return sorted.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
    case 'date_desc':
      return sorted.sort((a, b) => b.targetDate.getTime() - a.targetDate.getTime());
    case 'progress_desc':
      return sorted.sort((a, b) => b.progress - a.progress);
    case 'progress_asc':
      return sorted.sort((a, b) => a.progress - b.progress);
    case 'amount_desc':
      return sorted.sort((a, b) => b.targetAmount - a.targetAmount);
    case 'amount_asc':
      return sorted.sort((a, b) => a.targetAmount - b.targetAmount);
    case 'priority':
      return sorted.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
    default:
      return sorted;
  }
}

export function GoalsScreen() {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const goalService = useMemo(() => new GoalService(), []);

  const { visible: tourVisible, closeTour } = useScreenTour('goals');

  const TOUR_SLIDES: TourSlide[] = [
    {
      emoji: '🏆',
      title: 'Metas de ahorro',
      description: 'Crea metas financieras con un monto objetivo y una fecha límite. Planify calcula cuánto debes ahorrar por mes para llegar a tiempo.',
    },
    {
      emoji: '📈',
      title: 'Seguimiento de progreso',
      description: 'Cada meta muestra una barra de progreso con el monto acumulado vs el objetivo. Al tocarla ves el detalle y puedes registrar abonos.',
    },
    {
      emoji: '🔽',
      title: 'Filtros y orden',
      description: 'Filtra por tipo (personal o pareja) y prioridad. Ordena por fecha, progreso o monto para enfocarte en lo más urgente.',
    },
    {
      emoji: '➕',
      title: 'Nueva meta',
      description: 'Presiona "+ Nueva Meta" para crearla. Define nombre, monto objetivo, fecha límite, prioridad y si es personal o compartida.',
    },
  ];

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & sort state
  const [filterType, setFilterType] = useState<GoalFilterType>('all');
  const [filterPriority, setFilterPriority] = useState<GoalFilterPriority>('all');
  const [sortKey, setSortKey] = useState<GoalSortKey>('date_asc');
  const [showFilters, setShowFilters] = useState(false);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await goalService.getAll();
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  }, [goalService]);

  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals]));

  // Apply filters and sorting
  const activeGoals = useMemo(() => {
    let filtered = goals.filter((g) => g.status === 'active');
    if (filterType !== 'all') filtered = filtered.filter((g) => g.type === filterType);
    if (filterPriority !== 'all') filtered = filtered.filter((g) => g.priority === filterPriority);
    return sortGoals(filtered, sortKey);
  }, [goals, filterType, filterPriority, sortKey]);

  const pausedGoals = useMemo(() => {
    let filtered = goals.filter((g) => g.status === 'paused');
    if (filterType !== 'all') filtered = filtered.filter((g) => g.type === filterType);
    if (filterPriority !== 'all') filtered = filtered.filter((g) => g.priority === filterPriority);
    return sortGoals(filtered, sortKey);
  }, [goals, filterType, filterPriority, sortKey]);

  const completedGoals = goals.filter((g) => g.status === 'completed');

  const hasActiveFilters = filterType !== 'all' || filterPriority !== 'all' || sortKey !== 'date_asc';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <FlatList
      style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
      ]}
      data={activeGoals}
      keyExtractor={(item) => item.id}
      numColumns={isDesktop ? 2 : 1}
      key={isDesktop ? 'desktop-2col' : 'mobile-1col'}
      columnWrapperStyle={isDesktop ? { gap: 16 } : undefined}
      ListHeaderComponent={
        <View>
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🎯 Mis Metas</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[neuSurface(scheme, 'flat'), styles.filterToggle, hasActiveFilters && { borderColor: colors.primary, borderWidth: 2 }]}
                onPress={() => setShowFilters(!showFilters)}
                accessibilityRole="button"
                accessibilityLabel="Mostrar filtros y ordenamiento"
              >
                <Text style={[styles.filterToggleText, { color: colors.textSecondary }, hasActiveFilters && styles.filterToggleTextActive]}>
                  {showFilters ? '✕' : '⚙️'} Filtros
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}
                onPress={() => navigation.navigate('AddGoal')}
              >
                <Text style={styles.addButtonText}>+ Nueva</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filters & Sort Panel */}
          {showFilters && (
            <View style={[neuSurface(scheme, 'raised'), styles.filtersCard]}>
              {/* Sort */}
              <Text style={[styles.filterLabel, { color: colors.textTertiary }]}>Ordenar por</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <View style={styles.filterChipsRow}>
                  {SORT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        neuSurface(scheme, 'flat'),
                        styles.filterChip,
                        sortKey === opt.key && { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') },
                      ]}
                      onPress={() => setSortKey(opt.key)}
                    >
                      <Text style={[styles.filterChipText, { color: colors.textSecondary }, sortKey === opt.key && { color: colors.textInverse }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Filter by type */}
              <Text style={[styles.filterLabel, { color: colors.textTertiary }]}>Tipo</Text>
              <View style={styles.filterChipsRow}>
                {FILTER_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      neuSurface(scheme, 'flat'),
                      styles.filterChip,
                      filterType === opt.key && { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') },
                    ]}
                    onPress={() => setFilterType(opt.key)}
                  >
                    <Text style={[styles.filterChipText, { color: colors.textSecondary }, filterType === opt.key && { color: colors.textInverse }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filter by priority */}
              <Text style={[styles.filterLabel, { color: colors.textTertiary }]}>Prioridad</Text>
              <View style={styles.filterChipsRow}>
                {FILTER_PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      neuSurface(scheme, 'flat'),
                      styles.filterChip,
                      filterPriority === opt.key && { backgroundColor: opt.color ?? colors.primary, ...neuShadow(scheme, 'pressed') },
                    ]}
                    onPress={() => setFilterPriority(opt.key)}
                  >
                    <Text style={[styles.filterChipText, { color: colors.textSecondary }, filterPriority === opt.key && { color: colors.textInverse }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reset */}
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => { setFilterType('all'); setFilterPriority('all'); setSortKey('date_asc'); }}
                >
                  <Text style={styles.resetButtonText}>Limpiar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Active filters badge */}
          {hasActiveFilters && !showFilters && (
            <View style={styles.activeFiltersBadge}>
              <Text style={styles.activeFiltersText}>
                Filtros activos: {filterType !== 'all' ? `Tipo: ${filterType === 'personal' ? 'Personal' : 'Pareja'}` : ''}
                {filterPriority !== 'all' ? ` Prioridad: ${FILTER_PRIORITY_OPTIONS.find(o => o.key === filterPriority)?.label}` : ''}
                {sortKey !== 'date_asc' ? ` • Orden: ${SORT_OPTIONS.find(o => o.key === sortKey)?.label}` : ''}
              </Text>
            </View>
          )}

          {/* Summary card */}
          {activeGoals.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}>
              <Text style={styles.summaryLabel}>Progreso total</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(activeGoals.reduce((s, g) => s + g.savedAmount, 0))}
                {' / '}
                {formatAmount(activeGoals.reduce((s, g) => s + g.targetAmount, 0))}
              </Text>
              <View style={styles.summaryBarBg}>
                <View style={[styles.summaryBarFill, {
                  width: `${Math.min(100, (activeGoals.reduce((s, g) => s + g.savedAmount, 0) / Math.max(1, activeGoals.reduce((s, g) => s + g.targetAmount, 0))) * 100)}%`
                }]} />
              </View>
              <Text style={styles.summaryMeta}>{activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} activa{activeGoals.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <GoalCard goal={item} onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })} isDesktop={isDesktop} />
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tienes metas activas</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Crea una meta para empezar a materializar tus objetivos.</Text>
        </View>
      }
      ListFooterComponent={
        <View>
          {/* Paused Goals */}
          {pausedGoals.length > 0 && (
            <View style={styles.pausedSection}>
              <Text style={styles.pausedTitle}>⏸️ Pausadas ({pausedGoals.length})</Text>
              {pausedGoals.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[neuSurface(scheme, 'flat'), styles.pausedItem]}
                  onPress={() => navigation.navigate('GoalDetail', { goalId: g.id })}
                >
                  <View>
                    <Text style={styles.pausedName}>{g.name}</Text>
                    <Text style={[styles.pausedProgress, { color: colors.textTertiary }]}>{g.progress.toFixed(0)}% • {formatAmount(g.savedAmount)} / {formatAmount(g.targetAmount)}</Text>
                  </View>
                  <Text style={[styles.pausedArrow, { color: colors.textTertiary }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <View style={styles.completedSection}>
              <Text style={[styles.completedTitle, { color: colors.textSecondary }]}>✅ Completadas ({completedGoals.length})</Text>
              {completedGoals.map((g) => (
                <View key={g.id} style={[styles.completedItem, { borderBottomColor: colors.borderInset }]}>
                  <Text style={[styles.completedName, { color: colors.textTertiary }]}>{g.name}</Text>
                  <Text style={[styles.completedAmount, { color: colors.textTertiary }]}>{formatAmount(g.targetAmount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      }
    />
    <ScreenTourModal visible={tourVisible} slides={TOUR_SLIDES} onClose={closeTour} />
    </View>
  );
}

// ─── Goal Card ───────────────────────────────────────────────────────────────

function GoalCard({ goal, onPress, isDesktop }: { goal: Goal; onPress: () => void; isDesktop?: boolean }) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const priority = PRIORITY_LABELS[goal.priority] ?? PRIORITY_LABELS.medium;
  const daysLeft = Math.max(0, Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <TouchableOpacity style={[neuSurface(scheme, 'raised'), styles.goalCard, isDesktop && { flex: 1 }]} onPress={onPress}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '20' }]}>
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>

      <View style={styles.goalProgressRow}>
        <View style={[neuProgress(scheme), styles.goalBarBg]}>
          <View style={[styles.goalBarFill, { width: `${goal.progress}%` }]} />
        </View>
        <Text style={styles.goalPercent}>{goal.progress.toFixed(0)}%</Text>
      </View>

      <View style={styles.goalFooter}>
        <Text style={[styles.goalAmount, { color: colors.textSecondary }]}>
          {formatAmount(goal.savedAmount)} / {formatAmount(goal.targetAmount)}
        </Text>
        <Text style={[styles.goalDate, { color: colors.textTertiary }]}>
          {daysLeft > 0 ? `${daysLeft} días` : 'Vencida'}
        </Text>
      </View>

      <View style={styles.goalMeta}>
        <Text style={styles.goalInstallment}>
          💡 Ahorra {formatAmount(goal.suggestedInstallment)} / {goal.installmentFrequency === 'monthly' ? 'mes' : goal.installmentFrequency === 'biweekly' ? 'quincena' : 'semana'}
        </Text>
        {goal.type === 'couple' && <Text style={[styles.goalTypeBadge, { color: colors.textSecondary }]}>👥 Pareja</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.secondary },
  addButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Filter toggle
  filterToggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  filterToggleText: { fontSize: 13, fontWeight: '500', color: '#666' },
  filterToggleTextActive: { color: colors.primary },

  // Filters card
  filtersCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  filterScroll: { marginBottom: 4 },
  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#666' },
  resetButton: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  resetButtonText: { fontSize: 13, color: colors.redExpenses, fontWeight: '500' },

  // Active filters badge
  activeFiltersBadge: { backgroundColor: colors.primary + '10', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  activeFiltersText: { fontSize: 12, color: colors.primary, fontWeight: '500' },

  summaryCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 4 },
  summaryBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  summaryBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  summaryMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  goalCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalName: { fontSize: 16, fontWeight: '600', color: colors.secondary, flex: 1, marginRight: 8 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '600' },

  goalProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  goalBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  goalBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  goalPercent: { fontSize: 13, fontWeight: '600', color: colors.primary, minWidth: 36, textAlign: 'right' },

  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalAmount: { fontSize: 13, color: '#666' },
  goalDate: { fontSize: 13, color: '#999' },

  goalMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalInstallment: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  goalTypeBadge: { fontSize: 12, color: '#666' },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: '#999', textAlign: 'center' },

  completedSection: { marginTop: 24 },
  completedTitle: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 8 },
  completedItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  completedName: { fontSize: 14, color: '#999', textDecorationLine: 'line-through' },
  completedAmount: { fontSize: 14, color: '#999' },

  pausedSection: { marginTop: 24 },
  pausedTitle: { fontSize: 16, fontWeight: '600', color: colors.tertiary, marginBottom: 8 },
  pausedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: colors.tertiary },
  pausedName: { fontSize: 14, fontWeight: '500', color: colors.secondary },
  pausedProgress: { fontSize: 12, color: '#999', marginTop: 2 },
  pausedArrow: { fontSize: 20, color: '#CCC' },
});
