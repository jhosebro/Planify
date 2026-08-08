import React, { useCallback, useMemo, useRef, useState } from 'react';
import { colors } from '@/theme';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { GoalService } from '@/services/goals';
import type { Goal, GoalContribution, GoalAction } from '@/services/goals';
import { BottomModal } from '@/components/BottomModal';
import type { MainStackParamList } from '@/navigation/types';

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatWithThousands(value: string): string {
  const clean = value.replace(/[^0-9]/g, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function GoalDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'GoalDetail'>>();
  const { goalId } = route.params;
  const goalService = useMemo(() => new GoalService(), []);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [actions, setActions] = useState<GoalAction[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  // Contribute modal
  const [showContribute, setShowContribute] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeNote, setContributeNote] = useState('');

  // Add action
  const [newAction, setNewAction] = useState('');

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [g, c, a] = await Promise.all([
        goalService.getById(goalId),
        goalService.getContributions(goalId),
        goalService.getActions(goalId),
      ]);
      setGoal(g);
      setContributions(c);
      setActions(a);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [goalId, goalService]);

  // Reload on every focus (initial mount + returning from edit modal)
  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnce.current) {
        loadData(false);
      } else {
        loadData(true);
        hasLoadedOnce.current = true;
      }
    }, [loadData])
  );

  const handleContribute = async () => {
    const raw = contributeAmount.replace(/\./g, '');
    const amount = parseInt(raw, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido.');
      return;
    }
    try {
      await goalService.addContribution(goalId, amount * 100, contributeNote.trim() || undefined);
      setShowContribute(false);
      setContributeAmount('');
      setContributeNote('');
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo registrar el aporte.');
    }
  };

  const handleAddAction = async () => {
    if (!newAction.trim()) return;
    try {
      await goalService.addAction(goalId, newAction.trim());
      setNewAction('');
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo agregar la acción.');
    }
  };

  const handleToggleAction = async (actionId: string) => {
    try {
      await goalService.toggleAction(actionId);
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar.');
    }
  };

  if (loading || !goal) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const completedActions = actions.filter((a) => a.isCompleted).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.headerName}>{goal.name}</Text>
        {goal.description && <Text style={styles.headerDesc}>{goal.description}</Text>}
        <Text style={styles.headerProgress}>{goal.progress.toFixed(0)}%</Text>
        <View style={styles.headerBarBg}>
          <View style={[styles.headerBarFill, { width: `${goal.progress}%` }]} />
        </View>
        <View style={styles.headerAmounts}>
          <Text style={styles.headerSaved}>{formatAmount(goal.savedAmount)}</Text>
          <Text style={styles.headerTarget}>de {formatAmount(goal.targetAmount)}</Text>
        </View>
      </View>

      {/* Info chips */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>📅 Fecha</Text>
          <Text style={styles.chipValue}>{formatDate(goal.targetDate)}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>⏳ Faltan</Text>
          <Text style={styles.chipValue}>{daysLeft} días</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>💡 Ahorra</Text>
          <Text style={styles.chipValue}>{formatAmount(goal.suggestedInstallment)}/{goal.installmentFrequency === 'monthly' ? 'mes' : goal.installmentFrequency === 'biweekly' ? 'qna' : 'sem'}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.contributeButton} onPress={() => setShowContribute(true)}>
          <Text style={styles.contributeText}>💰 Abonar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editGoalButton} onPress={() => navigation.navigate('AddGoal', { goalId: goal.id })}>
          <Text style={styles.editGoalText}>✏️ Editar</Text>
        </TouchableOpacity>
      </View>

      {/* Pause/Activate button */}
      <TouchableOpacity
        style={[styles.pauseButton, goal.status === 'paused' && styles.activateButton]}
        onPress={async () => {
          const newStatus = goal.status === 'paused' ? 'active' : 'paused';
          try {
            await goalService.updateStatus(goal.id, newStatus);
            loadData();
          } catch {
            Alert.alert('Error', 'No se pudo actualizar el estado.');
          }
        }}
      >
        <Text style={[styles.pauseButtonText, goal.status === 'paused' && styles.activateButtonText]}>
          {goal.status === 'paused' ? '▶️ Reactivar meta' : '⏸️ Pausar meta'}
        </Text>
      </TouchableOpacity>

      {/* Actions section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📋 Acciones ({completedActions}/{actions.length})
        </Text>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionItem}
            onPress={() => handleToggleAction(action.id)}
          >
            <Text style={styles.actionCheckbox}>{action.isCompleted ? '✅' : '⬜'}</Text>
            <Text style={[styles.actionTitle, action.isCompleted && styles.actionCompleted]}>
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.addActionRow}>
          <TextInput
            style={styles.addActionInput}
            value={newAction}
            onChangeText={setNewAction}
            placeholder="Agregar acción concreta..."
            placeholderTextColor="#999"
            onSubmitEditing={handleAddAction}
          />
          <TouchableOpacity style={styles.addActionBtn} onPress={handleAddAction}>
            <Text style={styles.addActionBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contributions history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Historial de aportes</Text>
        {contributions.length === 0 && (
          <Text style={styles.emptyText}>Aún no has hecho aportes a esta meta.</Text>
        )}
        {contributions.map((c) => (
          <View key={c.id} style={styles.contributionItem}>
            <View>
              <Text style={styles.contributionAmount}>+{formatAmount(c.amount)}</Text>
              {c.note && <Text style={styles.contributionNote}>{c.note}</Text>}
            </View>
            <Text style={styles.contributionDate}>{formatDate(c.createdAt)}</Text>
          </View>
        ))}
      </View>

      {/* Contribute Modal */}
      <BottomModal
        visible={showContribute}
        title="Abonar a meta"
        subtitle={`¿Cuánto vas a separar para "${goal.name}"?`}
        onClose={() => setShowContribute(false)}
      >
        <TextInput
          style={styles.modalInput}
          value={contributeAmount}
          onChangeText={(t) => setContributeAmount(formatWithThousands(t.replace(/[^0-9]/g, '')))}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          autoFocus
        />
        <TextInput
          style={[styles.modalInput, { marginTop: 10 }]}
          value={contributeNote}
          onChangeText={setContributeNote}
          placeholder="Nota (opcional)"
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleContribute}>
          <Text style={styles.modalConfirmText}>Registrar aporte</Text>
        </TouchableOpacity>
      </BottomModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4, textAlign: 'center' },
  headerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textAlign: 'center' },
  headerProgress: { fontSize: 36, fontWeight: '700', color: '#fff', marginBottom: 8 },
  headerBarBg: { width: '100%', height: 10, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 5, overflow: 'hidden' },
  headerBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 5 },
  headerAmounts: { flexDirection: 'row', marginTop: 8, gap: 6 },
  headerSaved: { fontSize: 16, fontWeight: '600', color: '#fff' },
  headerTarget: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center' },
  chipLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  chipValue: { fontSize: 13, fontWeight: '600', color: colors.secondary },

  actionButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  contributeButton: { flex: 1, backgroundColor: colors.greenEarns, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  contributeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  editGoalButton: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  editGoalText: { color: colors.primary, fontSize: 16, fontWeight: '700' },

  pauseButton: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.tertiary },
  pauseButtonText: { color: colors.tertiary, fontSize: 15, fontWeight: '600' },
  activateButton: { borderColor: colors.greenEarns },
  activateButtonText: { color: colors.greenEarns },

  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.secondary, marginBottom: 12 },

  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  actionCheckbox: { fontSize: 18, marginRight: 10 },
  actionTitle: { fontSize: 14, color: colors.secondary, flex: 1 },
  actionCompleted: { textDecorationLine: 'line-through', color: '#999' },

  addActionRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  addActionInput: { flex: 1, backgroundColor: colors.backgroundPrimary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.secondary },
  addActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addActionBtnText: { color: '#fff', fontSize: 20, fontWeight: '600' },

  contributionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  contributionAmount: { fontSize: 15, fontWeight: '600', color: colors.greenEarns },
  contributionNote: { fontSize: 12, color: '#999', marginTop: 2 },
  contributionDate: { fontSize: 12, color: '#999' },

  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 16 },

  modalInput: { backgroundColor: colors.backgroundPrimary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: '#DDD', color: colors.secondary },
  modalConfirmBtn: { backgroundColor: colors.greenEarns, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  modalConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
