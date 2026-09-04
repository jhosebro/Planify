import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset, neuProgress } from '@/lib/neumorphic';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { BudgetService } from '@/services/budgets';
import type { BudgetConsumption } from '@/types';
import type { MainStackParamList } from '@/navigation/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BudgetDetailScreen() {
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'BudgetDetail'>>();
  const { budgetId } = route.params;

  const budgetService = useMemo(() => new BudgetService(), []);

  const [consumption, setConsumption] = useState<BudgetConsumption | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editLimit, setEditLimit] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editIncludeInGeneral, setEditIncludeInGeneral] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await budgetService.getConsumption(budgetId);
      setConsumption(data);
      setEditLimit((data.limit / 100).toString());
      setEditThreshold(
        // We need to get the actual threshold from the budget
        // getConsumption gives isAtThreshold which is computed, so we derive from percentage
        ''
      );
    } catch (error) {
      console.error('Error loading budget detail:', error);
    } finally {
      setLoading(false);
    }
  }, [budgetService, budgetId]);

  // Load budget details including the alert threshold
  const [alertThreshold, setAlertThreshold] = useState<number>(80);

  const loadFullBudget = useCallback(async () => {
    setLoading(true);
    try {
      const allBudgets = await budgetService.getAll();
      const budget = allBudgets.find((b) => b.id === budgetId);
      if (budget) {
        setAlertThreshold(budget.alertThreshold);
        setEditLimit((budget.monthlyLimit / 100).toString());
        setEditThreshold(budget.alertThreshold.toString());
        setEditIncludeInGeneral(budget.includeInGeneral);
      }
      const data = await budgetService.getConsumption(budgetId);
      setConsumption(data);
    } catch (error) {
      console.error('Error loading budget detail:', error);
    } finally {
      setLoading(false);
    }
  }, [budgetService, budgetId]);

  useEffect(() => {
    loadFullBudget();
  }, [loadFullBudget]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar presupuesto',
      '¿Estás seguro de que deseas eliminar este presupuesto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetService.delete(budgetId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el presupuesto.');
            }
          },
        },
      ]
    );
  }, [budgetService, budgetId, navigation]);

  const handleSaveEdit = useCallback(async () => {
    const limitNum = parseFloat(editLimit);
    const thresholdNum = parseInt(editThreshold, 10);

    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Error', 'El límite debe ser un número mayor a 0.');
      return;
    }
    if (isNaN(thresholdNum) || thresholdNum < 1 || thresholdNum > 100) {
      Alert.alert('Error', 'El umbral debe ser entre 1 y 100.');
      return;
    }

    setSaving(true);
    try {
      await budgetService.update(budgetId, {
        monthlyLimit: Math.round(limitNum * 100),
        alertThreshold: thresholdNum,
        includeInGeneral: editIncludeInGeneral,
      });
      setIsEditing(false);
      await loadFullBudget();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el presupuesto.');
    } finally {
      setSaving(false);
    }
  }, [budgetService, budgetId, editLimit, editThreshold, editIncludeInGeneral, loadFullBudget]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!consumption) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>No se encontró el presupuesto.</Text>
        <TouchableOpacity style={[styles.backButton, neuShadow(scheme, 'raised')]} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const percentage = Math.min(consumption.percentage, 100);
  const barColor = consumption.isOverBudget
    ? colors.redExpenses
    : consumption.isAtThreshold
      ? colors.tertiary
      : colors.greenEarns;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Category Header */}
      <View style={[styles.headerCard, neuShadow(scheme, 'raised')]}>
        <Text style={styles.categoryTitle}>{consumption.categoryId}</Text>
        <Text style={[styles.percentageText, { color: barColor }]}>
          {consumption.percentage.toFixed(1)}%
        </Text>
      </View>

      {/* Progress Section */}
      <View style={[styles.card, neuSurface(scheme, 'flat')]}>
        <Text style={styles.cardTitle}>Consumo del mes</Text>
        <View style={[styles.progressBarBackground, neuProgress(scheme)]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <View style={styles.amountsRow}>
          <Text style={styles.spentText}>Gastado: {formatAmount(consumption.spent)}</Text>
          <Text style={styles.limitText}>Límite: {formatAmount(consumption.limit)}</Text>
        </View>
        {consumption.isOverBudget && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>⚠️ Has excedido tu presupuesto</Text>
          </View>
        )}
        {!consumption.isOverBudget && consumption.isAtThreshold && (
          <View style={[styles.alertBanner, styles.warningBanner]}>
            <Text style={[styles.alertText, styles.warningText]}>
              📊 Has alcanzado el umbral de alerta ({alertThreshold}%)
            </Text>
          </View>
        )}
      </View>

      {/* Details / Edit Section */}
      <View style={[styles.card, neuSurface(scheme, 'flat')]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Configuración</Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editLink}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View>
            <Text style={styles.inputLabel}>Límite mensual ($)</Text>
            <TextInput
              style={[styles.input, neuInset(scheme)]}
              value={editLimit}
              onChangeText={setEditLimit}
              keyboardType="decimal-pad"
              placeholder="0.00"
              accessibilityLabel="Límite mensual"
            />

            <Text style={styles.inputLabel}>Umbral de alerta (%)</Text>
            <TextInput
              style={[styles.input, neuInset(scheme)]}
              value={editThreshold}
              onChangeText={setEditThreshold}
              keyboardType="number-pad"
              placeholder="80"
              maxLength={3}
              accessibilityLabel="Umbral de alerta"
            />

            <Text style={styles.inputLabel}>Presupuesto General</Text>
            <TouchableOpacity
              style={[styles.switchRow, neuSurface(scheme, 'flat')]}
              onPress={() => setEditIncludeInGeneral((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: editIncludeInGeneral }}
              accessibilityLabel="Contar este presupuesto dentro del presupuesto general"
            >
              <View style={styles.switchTextBlock}>
                <Text style={styles.switchTitle}>Incluir en presupuesto general</Text>
                <Text style={styles.switchHint}>
                  Si lo desactivas, su límite y gasto no contarán en el total general.
                </Text>
              </View>
              <Switch
                value={editIncludeInGeneral}
                onValueChange={setEditIncludeInGeneral}
                trackColor={{ false: '#CCC', true: colors.primary }}
                thumbColor="#fff"
              />
            </TouchableOpacity>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.cancelButton, neuSurface(scheme, 'flat')]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, neuShadow(scheme, 'raised'), saving && styles.disabledButton]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Categoría</Text>
              <Text style={styles.detailValue}>{consumption.categoryId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Límite mensual</Text>
              <Text style={styles.detailValue}>{formatAmount(consumption.limit)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Umbral de alerta</Text>
              <Text style={styles.detailValue}>{alertThreshold}%</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gasto actual</Text>
              <Text style={[styles.detailValue, { color: barColor }]}>
                {formatAmount(consumption.spent)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>En presupuesto general</Text>
              <Text style={[styles.detailValue, { color: editIncludeInGeneral ? colors.greenEarns : '#999' }]}>
                {editIncludeInGeneral ? 'Sí' : 'No'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Delete Button */}
      <TouchableOpacity
        style={[styles.deleteButton, neuSurface(scheme, 'flat')]}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Eliminar presupuesto"
      >
        <Text style={styles.deleteButtonText}>Eliminar presupuesto</Text>
      </TouchableOpacity>
    </ScrollView>
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
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  percentageText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  progressBarBackground: {
    height: 12,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spentText: {
    fontSize: 13,
    color: '#666',
  },
  limitText: {
    fontSize: 13,
    color: '#666',
  },
  alertBanner: {
    backgroundColor: '#FDEDEC',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  warningBanner: {
    backgroundColor: '#FEF9E7',
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.redExpenses,
  },
  warningText: {
    color: colors.tertiary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderInset,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  switchTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  switchHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  deleteButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.redExpenses,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.redExpenses,
  },
});
