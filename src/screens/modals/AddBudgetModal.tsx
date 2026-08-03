import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BudgetService } from '@/services/budgets';
import { CategorySelector } from '@/components/CategorySelector';
import type { MainStackParamList } from '@/navigation/types';

// ─── Component ───────────────────────────────────────────────────────────────

export function AddBudgetModal() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const budgetService = useMemo(() => new BudgetService(), []);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [saving, setSaving] = useState(false);

  const handleLimitChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDisplayLimit(digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const handleSubmit = useCallback(async () => {
    if (!categoryId) {
      Alert.alert('Error', 'Debes seleccionar una categoría.');
      return;
    }

    const limitNum = parseInt(displayLimit.replace(/\./g, ''), 10);
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Error', 'El límite mensual debe ser un número mayor a 0.');
      return;
    }

    const thresholdNum = parseInt(alertThreshold, 10);
    if (isNaN(thresholdNum) || thresholdNum < 1 || thresholdNum > 100) {
      Alert.alert('Error', 'El umbral de alerta debe estar entre 1 y 100.');
      return;
    }

    setSaving(true);
    try {
      await budgetService.create({
        categoryId,
        monthlyLimit: limitNum * 100,
        alertThreshold: thresholdNum,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el presupuesto. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [budgetService, categoryId, displayLimit, alertThreshold, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Nuevo Presupuesto</Text>
        <Text style={styles.subtitle}>
          Establece un límite de gasto mensual para una categoría.
        </Text>

        {/* Category Selector */}
        <Text style={styles.inputLabel}>Categoría</Text>
        <CategorySelector selectedId={categoryId} onSelect={setCategoryId} />

        {/* Monthly Limit */}
        <Text style={styles.inputLabel}>Límite mensual ($)</Text>
        <TextInput
          style={styles.input}
          value={displayLimit}
          onChangeText={handleLimitChange}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          accessibilityLabel="Límite mensual en pesos"
        />

        {/* Alert Threshold */}
        <Text style={styles.inputLabel}>Umbral de alerta (%)</Text>
        <TextInput
          style={styles.input}
          value={alertThreshold}
          onChangeText={setAlertThreshold}
          placeholder="80"
          placeholderTextColor="#999"
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel="Porcentaje de umbral de alerta"
        />
        <Text style={styles.inputHint}>
          Recibirás una notificación cuando alcances este porcentaje de tu presupuesto.
        </Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Crear presupuesto"
        >
          <Text style={styles.submitButtonText}>
            {saving ? 'Creando...' : 'Crear presupuesto'}
          </Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    color: colors.secondary,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
});
