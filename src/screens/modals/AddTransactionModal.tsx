import React, { useEffect, useMemo, useState } from 'react';
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
import { TransactionService } from '@/services/transactions/transactionService';
import { AccountService } from '@/services/accounts/accountService';
import { CategorySelector } from '@/components/CategorySelector';
import type { MainStackParamList } from '@/navigation/types';
import type { Account, TransactionType } from '@/types';

type AddTransactionNavProp = NativeStackNavigationProp<MainStackParamList, 'AddTransaction'>;


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
  return parseInt(display.replace(/\./g, ''), 10) || 0;
}

function formatAccountBalance(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AddTransactionModal() {
  const navigation = useNavigation<AddTransactionNavProp>();
  const transactionService = useMemo(() => new TransactionService(), []);
  const accountService = useMemo(() => new AccountService(), []);

  const [type, setType] = useState<TransactionType>('expense');
  const [displayAmount, setDisplayAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Date picker state
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  const formattedDate = `${selectedDay.toString().padStart(2, '0')} ${MONTHS[selectedMonth]} ${selectedYear}`;

  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accountList = await accountService.getActiveAccounts();
      setAccounts(accountList);
      if (accountList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountList[0].id);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const handleAmountChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setDisplayAmount(formatWithThousands(digitsOnly));
  };

  const handleSubmit = async () => {
    const amountValue = parseFormattedAmount(displayAmount);
    if (amountValue <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a cero.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Error', 'Debes seleccionar una cuenta.');
      return;
    }

    if (!categoryId) {
      Alert.alert('Error', 'Debes seleccionar una categoría.');
      return;
    }

    const amountCentavos = amountValue * 100;
    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);

    setSubmitting(true);
    try {
      await transactionService.create({
        accountId: selectedAccountId,
        type,
        amount: amountCentavos,
        categoryId,
        date: selectedDate,
        description: description.trim() || undefined,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el movimiento. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Nuevo Movimiento</Text>

        {/* Transaction Type Selector */}
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'expense' && styles.typeButtonExpense]}
            onPress={() => setType('expense')}
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'expense' }}
          >
            <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
              Gasto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'income' && styles.typeButtonIncome]}
            onPress={() => setType('income')}
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'income' }}
          >
            <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>
              Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount with thousand separators */}
        <Text style={styles.label}>Monto ($)</Text>
        <TextInput
          style={styles.input}
          value={displayAmount}
          onChangeText={handleAmountChange}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          accessibilityLabel="Monto del movimiento"
        />

        {/* Account Selector */}
        <Text style={styles.label}>Cuenta</Text>
        <View style={styles.selectorRow}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[styles.selectorChip, selectedAccountId === acc.id && styles.selectorChipActive]}
              onPress={() => setSelectedAccountId(acc.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedAccountId === acc.id }}
            >
              <Text style={[styles.selectorChipText, selectedAccountId === acc.id && styles.selectorChipTextActive]}>
                {acc.name}
              </Text>
              <Text style={[styles.selectorChipBalance, selectedAccountId === acc.id && styles.selectorChipTextActive]}>
                {formatAccountBalance(acc.balance)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Selector */}
        <Text style={styles.label}>Categoría</Text>
        <CategorySelector selectedId={categoryId} onSelect={setCategoryId} />

        {/* Date Picker */}
        <Text style={styles.label}>Fecha</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(!showDatePicker)}
          accessibilityLabel="Seleccionar fecha"
          accessibilityRole="button"
        >
          <Text style={styles.dateButtonText}>{formattedDate}</Text>
          <Text style={styles.dateButtonIcon}>{showDatePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Año</Text>
              <View style={styles.dateControls}>
                <TouchableOpacity style={styles.dateArrow} onPress={() => setSelectedYear(selectedYear - 1)}>
                  <Text style={styles.dateArrowText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.dateValue}>{selectedYear}</Text>
                <TouchableOpacity style={styles.dateArrow} onPress={() => setSelectedYear(selectedYear + 1)}>
                  <Text style={styles.dateArrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Mes</Text>
              <View style={styles.dateControls}>
                <TouchableOpacity style={styles.dateArrow} onPress={() => {
                  if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
                  else setSelectedMonth(selectedMonth - 1);
                }}>
                  <Text style={styles.dateArrowText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.dateValue}>{MONTHS[selectedMonth]}</Text>
                <TouchableOpacity style={styles.dateArrow} onPress={() => {
                  if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
                  else setSelectedMonth(selectedMonth + 1);
                }}>
                  <Text style={styles.dateArrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Día</Text>
              <View style={styles.dateControls}>
                <TouchableOpacity style={styles.dateArrow} onPress={() => setSelectedDay(Math.max(1, selectedDay - 1))}>
                  <Text style={styles.dateArrowText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.dateValue}>{selectedDay}</Text>
                <TouchableOpacity style={styles.dateArrow} onPress={() => setSelectedDay(Math.min(daysInMonth, selectedDay + 1))}>
                  <Text style={styles.dateArrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.dateConfirmButton} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.dateConfirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Description */}
        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción del movimiento..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          accessibilityLabel="Descripción del movimiento"
        />

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.secondary,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeButtonExpense: {
    backgroundColor: '#FDECEC',
    borderColor: colors.redExpenses,
  },
  typeButtonIncome: {
    backgroundColor: '#ECFDF0',
    borderColor: colors.greenEarns,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: colors.secondary,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#fff',
  },
  selectorChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#E6F4FF',
  },
  selectorChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  selectorChipBalance: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  selectorChipTextActive: {
    color: colors.primary,
  },
  noCategoriesText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },

  // Date picker
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#DDD',
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

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
