import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import {
  ActivityIndicator,
  FlatList,
  Platform,
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

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: 'Alta', color: colors.redExpenses },
  medium: { label: 'Media', color: colors.tertiary },
  low: { label: 'Baja', color: colors.greenEarns },
};

export function GoalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const goalService = useMemo(() => new GoalService(), []);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

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

  const activeGoals = goals.filter((g) => g.status === 'active');
  const pausedGoals = goals.filter((g) => g.status === 'paused');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
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
            <Text style={styles.sectionTitle}>🎯 Mis Metas</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddGoal')}
            >
              <Text style={styles.addButtonText}>+ Nueva</Text>
            </TouchableOpacity>
          </View>

          {/* Summary card */}
          {activeGoals.length > 0 && (
            <View style={styles.summaryCard}>
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
          <Text style={styles.emptyText}>No tienes metas activas</Text>
          <Text style={styles.emptySubtext}>Crea una meta para empezar a materializar tus objetivos.</Text>
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
                  style={styles.pausedItem}
                  onPress={() => navigation.navigate('GoalDetail', { goalId: g.id })}
                >
                  <View>
                    <Text style={styles.pausedName}>{g.name}</Text>
                    <Text style={styles.pausedProgress}>{g.progress.toFixed(0)}% • {formatAmount(g.savedAmount)} / {formatAmount(g.targetAmount)}</Text>
                  </View>
                  <Text style={styles.pausedArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <View style={styles.completedSection}>
              <Text style={styles.completedTitle}>✅ Completadas ({completedGoals.length})</Text>
              {completedGoals.map((g) => (
                <View key={g.id} style={styles.completedItem}>
                  <Text style={styles.completedName}>{g.name}</Text>
                  <Text style={styles.completedAmount}>{formatAmount(g.targetAmount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      }
    />
  );
}

// ─── Goal Card ───────────────────────────────────────────────────────────────

function GoalCard({ goal, onPress, isDesktop }: { goal: Goal; onPress: () => void; isDesktop?: boolean }) {
  const priority = PRIORITY_LABELS[goal.priority] ?? PRIORITY_LABELS.medium;
  const daysLeft = Math.max(0, Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <TouchableOpacity style={[styles.goalCard, isDesktop && { flex: 1 }]} onPress={onPress}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '20' }]}>
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>

      <View style={styles.goalProgressRow}>
        <View style={styles.goalBarBg}>
          <View style={[styles.goalBarFill, { width: `${goal.progress}%` }]} />
        </View>
        <Text style={styles.goalPercent}>{goal.progress.toFixed(0)}%</Text>
      </View>

      <View style={styles.goalFooter}>
        <Text style={styles.goalAmount}>
          {formatAmount(goal.savedAmount)} / {formatAmount(goal.targetAmount)}
        </Text>
        <Text style={styles.goalDate}>
          {daysLeft > 0 ? `${daysLeft} días` : 'Vencida'}
        </Text>
      </View>

      <View style={styles.goalMeta}>
        <Text style={styles.goalInstallment}>
          💡 Ahorra {formatAmount(goal.suggestedInstallment)} / {goal.installmentFrequency === 'monthly' ? 'mes' : goal.installmentFrequency === 'biweekly' ? 'quincena' : 'semana'}
        </Text>
        {goal.type === 'couple' && <Text style={styles.goalTypeBadge}>👥 Pareja</Text>}
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
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.secondary },
  addButton: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  summaryCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 4 },
  summaryBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  summaryBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  summaryMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  goalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalName: { fontSize: 16, fontWeight: '600', color: colors.secondary, flex: 1, marginRight: 8 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '600' },

  goalProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  goalBarBg: { flex: 1, height: 8, backgroundColor: '#EEEEEE', borderRadius: 4, overflow: 'hidden' },
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
  pausedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: colors.tertiary },
  pausedName: { fontSize: 14, fontWeight: '500', color: colors.secondary },
  pausedProgress: { fontSize: 12, color: '#999', marginTop: 2 },
  pausedArrow: { fontSize: 20, color: '#CCC' },
});
