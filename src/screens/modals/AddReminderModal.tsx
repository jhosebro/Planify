import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset } from '@/lib/neumorphic';
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
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ReminderService } from '@/services/reminders';
import { CategorySelector } from '@/components/CategorySelector';
import { CyclicDatePicker } from '@/components/CyclicDatePicker';
import type { ReminderFrequency } from '@/types';
import type { MainStackParamList } from '@/navigation/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS: { key: ReminderFrequency; label: string }[] = [
  { key: 'once', label: 'Una vez' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'biweekly', label: 'Quincenal' },
  { key: 'monthly', label: 'Mensual' },
  { key: 'yearly', label: 'Anual' },
];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatWithThousands(value: string): string {
  const clean = value.replace(/[^0-9]/g, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseFormattedAmount(display: string): number {
  const raw = display.replace(/\./g, '');
  return parseInt(raw, 10) || 0;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AddReminderModal() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const route = (navigation.getState()?.routes ?? []).find(r => r.name === 'AddReminder');
  const reminderId = (route?.params as any)?.reminderId as string | undefined;
  const isEditMode = !!reminderId;

  const reminderService = useMemo(() => new ReminderService(), []);

  const [description, setDescription] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [frequency, setFrequency] = useState<ReminderFrequency>('once');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Date picker state
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);

  const formattedDate = `${selectedDay.toString().padStart(2, '0')} ${MONTHS[selectedMonth]} ${selectedYear}`;

  const handleAmountChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDisplayAmount(formatWithThousands(digitsOnly));
  };

  // Load existing reminder if in edit mode
  useEffect(() => {
    if (reminderId) {
      const loadReminder = async () => {
        const { data } = await supabase
          .from('reminders')
          .select()
          .eq('id', reminderId)
          .single();

        if (data) {
          setDescription(data.description);
          const amountWhole = Math.round(data.amount / 100);
          setDisplayAmount(formatWithThousands(amountWhole.toString()));
          setFrequency(data.frequency);
          if (data.category_id) setCategoryId(data.category_id);
          const due = new Date(data.due_date);
          setSelectedYear(due.getFullYear());
          setSelectedMonth(due.getMonth());
          setSelectedDay(due.getDate());
        }
      };
      loadReminder();
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'La descripción es obligatoria.');
      return;
    }

    const amountCentavos = parseFormattedAmount(displayAmount) * 100;
    if (amountCentavos <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0.');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && reminderId) {
        await reminderService.update(reminderId, {
          description: description.trim(),
          amount: amountCentavos,
          dueDate: selectedDate,
          frequency,
          categoryId: categoryId ?? undefined,
        });
      } else {
        await reminderService.create({
          description: description.trim(),
          amount: amountCentavos,
          dueDate: selectedDate,
          frequency,
          categoryId: categoryId ?? undefined,
        });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el recordatorio. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [reminderService, reminderId, isEditMode, description, displayAmount, selectedDate, frequency, categoryId, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{isEditMode ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</Text>
        <Text style={styles.subtitle}>
          {isEditMode ? 'Modifica los datos del recordatorio.' : 'Programa un recordatorio de pago con recurrencia.'}
        </Text>

        {/* Description */}
        <Text style={styles.inputLabel}>Descripción</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: colors.textPrimary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Ej: Renta, Internet, Seguro"
          placeholderTextColor="#999"
          autoCapitalize="sentences"
          accessibilityLabel="Descripción del recordatorio"
        />

        {/* Amount with thousand separators */}
        <Text style={styles.inputLabel}>Monto ($)</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: colors.textPrimary }]}
          value={displayAmount}
          onChangeText={handleAmountChange}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          accessibilityLabel="Monto del recordatorio"
        />

        {/* Date Picker */}
        <Text style={styles.inputLabel}>Fecha de vencimiento</Text>
        <TouchableOpacity
          style={[styles.dateButton, neuInset(scheme)]}
          onPress={() => setShowDatePicker(!showDatePicker)}
          accessibilityLabel="Seleccionar fecha de vencimiento"
          accessibilityRole="button"
        >
          <Text style={styles.dateButtonText}>{formattedDate}</Text>
          <Text style={styles.dateButtonIcon}>{showDatePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <CyclicDatePicker
            year={selectedYear}
            month={selectedMonth}
            day={selectedDay}
            onChangeYear={setSelectedYear}
            onChangeMonth={setSelectedMonth}
            onChangeDay={setSelectedDay}
          />
        )}

        {/* Category */}
        <Text style={styles.inputLabel}>Categoría</Text>
        <CategorySelector selectedId={categoryId} onSelect={setCategoryId} />

        {/* Frequency */}
        <Text style={styles.inputLabel}>Frecuencia</Text>
        <View style={styles.frequencyContainer}>
          {FREQUENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.frequencyButton,
                neuSurface(scheme, 'flat'),
                { borderRadius: 20 },
                frequency === option.key && { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') },
              ]}
              onPress={() => setFrequency(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: frequency === option.key }}
              accessibilityLabel={`Frecuencia ${option.label}`}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  { color: frequency === option.key ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, neuShadow(scheme, 'raised'), saving && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Crear recordatorio"
        >
          <Text style={styles.submitButtonText}>
            {saving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Crear recordatorio')}
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.secondary,
  },

  // Date picker
  dateButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.secondary,
  },
  dateButtonIcon: {
    fontSize: 12,
    color: '#999',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: {
    fontSize: 14,
    color: colors.primary,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    minWidth: 80,
    textAlign: 'center',
  },
  dateConfirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  dateConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Frequency
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // Buttons
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
