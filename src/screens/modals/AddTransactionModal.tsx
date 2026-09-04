import React, { useEffect, useMemo, useState } from 'react';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { TransactionService } from '@/services/transactions/transactionService';
import { AccountService } from '@/services/accounts/accountService';
import { DebtService } from '@/services/debts';
import { CategorySelector } from '@/components/CategorySelector';
import { CyclicDatePicker } from '@/components/CyclicDatePicker';
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
  const route = useRoute<RouteProp<MainStackParamList, 'AddTransaction'>>();
  const transactionId = route.params?.transactionId;
  const isEditMode = !!transactionId;
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';

  const transactionService = useMemo(() => new TransactionService(), []);
  const accountService = useMemo(() => new AccountService(), []);
  const debtService = useMemo(() => new DebtService(), []);

  const [type, setType] = useState<TransactionType>('expense');
  const [displayAmount, setDisplayAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Credit card installment fields
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('');
  const [paidInstallments, setPaidInstallments] = useState('');

  // Date picker state
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  const formattedDate = `${selectedDay.toString().padStart(2, '0')} ${MONTHS[selectedMonth]} ${selectedYear}`;

  const [accounts, setAccounts] = useState<Account[]>([]);

  // Derived: is the selected account a credit card?
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const isCreditCard = selectedAccount?.type === 'credit_card' && type === 'expense';

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

      // Load existing transaction for edit mode
      if (transactionId) {
        const { data } = await (await import('@/lib/supabase')).supabase
          .from('transactions')
          .select()
          .eq('id', transactionId)
          .single();

        if (data) {
          setType(data.type);
          setDisplayAmount(formatWithThousands(Math.round(data.amount / 100).toString()));
          setSelectedAccountId(data.account_id);
          setCategoryId(data.category_id);
          setDescription(data.description ?? '');
          const txDate = new Date(data.date);
          setSelectedYear(txDate.getFullYear());
          setSelectedMonth(txDate.getMonth());
          setSelectedDay(txDate.getDate());
        }
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
      if (isEditMode && transactionId) {
        await transactionService.update(transactionId, {
          accountId: selectedAccountId,
          type,
          amount: amountCentavos,
          categoryId,
          date: selectedDate,
          description: description.trim() || undefined,
        });
      } else {
        await transactionService.create({
          accountId: selectedAccountId,
          type,
          amount: amountCentavos,
          categoryId,
          date: selectedDate,
          description: description.trim() || undefined,
        });

        // If expense on a credit card, update linked debt or create installment debt
        const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
        if (selectedAccount?.type === 'credit_card' && type === 'expense') {
          try {
            const allDebts = await debtService.getAll();

            if (isInstallment && installmentCount) {
              // Create a new installment debt for this purchase
              const totalInst = parseInt(installmentCount, 10);
              const paidInst = parseInt(paidInstallments || '0', 10);
              const instAmount = Math.round(amountCentavos / totalInst);
              const paidAmount = instAmount * paidInst;

              const newDebt = await debtService.create({
                category: 'credit_card',
                direction: 'i_owe',
                name: `${description.trim() || selectedAccount.name} (${totalInst} cuotas)`,
                description: `Compra a ${totalInst} cuotas en ${selectedAccount.name}`,
                totalAmount: amountCentavos,
                totalInstallments: totalInst,
                installmentAmount: instAmount,
                linkedAccountId: selectedAccountId,
              });

              // If already paid some installments, update directly
              if (paidInst > 0) {
                const { supabase } = await import('@/lib/supabase');
                await supabase
                  .from('debts')
                  .update({
                    paid_amount: paidAmount,
                    paid_installments: paidInst,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', newDebt.id);
              }
            } else {
              // Regular CC expense: create individual debt so each purchase is trackable
              await debtService.create({
                category: 'credit_card',
                direction: 'i_owe',
                name: description.trim() || 'Gasto en ' + selectedAccount.name,
                description: `Gasto en ${selectedAccount.name}`,
                totalAmount: amountCentavos,
                totalInstallments: 1,
                installmentAmount: amountCentavos,
                linkedAccountId: selectedAccountId,
              });
            }
          } catch (debtError) {
            // Don't fail the transaction if debt update fails
            console.warn('Could not update linked debt:', debtError);
          }
        }
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el movimiento. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>{isEditMode ? 'Editar Movimiento' : 'Nuevo Movimiento'}</Text>

        {/* Transaction Type Selector */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Tipo</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, neuSurface(scheme, 'flat'), { borderRadius: 8 }, type === 'expense' && { backgroundColor: themeColors.redExpenses, ...neuShadow(scheme, 'pressed') }]}
            onPress={() => setType('expense')}
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'expense' }}
          >
            <Text style={[styles.typeButtonText, { color: type === 'expense' ? themeColors.textInverse : themeColors.textSecondary }]}>
              Gasto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, neuSurface(scheme, 'flat'), { borderRadius: 8 }, type === 'income' && { backgroundColor: themeColors.greenEarns, ...neuShadow(scheme, 'pressed') }]}
            onPress={() => setType('income')}
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'income' }}
          >
            <Text style={[styles.typeButtonText, { color: type === 'income' ? themeColors.textInverse : themeColors.textSecondary }]}>
              Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount with thousand separators */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Monto ($)</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: themeColors.textPrimary }]}
          value={displayAmount}
          onChangeText={handleAmountChange}
          placeholder="0"
          placeholderTextColor={themeColors.textTertiary}
          keyboardType="numeric"
          accessibilityLabel="Monto del movimiento"
        />

        {/* Account Selector */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Cuenta</Text>
        <View style={styles.selectorRow}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[styles.selectorChip, neuSurface(scheme, 'flat'), { borderRadius: 8 }, selectedAccountId === acc.id && { backgroundColor: themeColors.primary, ...neuShadow(scheme, 'pressed') }]}
              onPress={() => setSelectedAccountId(acc.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedAccountId === acc.id }}
            >
              <Text style={[styles.selectorChipText, { color: selectedAccountId === acc.id ? themeColors.textInverse : themeColors.textSecondary }]}>
                {acc.name}
              </Text>
              <Text style={[styles.selectorChipBalance, { color: selectedAccountId === acc.id ? themeColors.textInverse : themeColors.textTertiary }]}>
                {formatAccountBalance(acc.balance)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Credit Card Installment Options */}
        {isCreditCard && (
          <View style={[styles.installmentSection, neuSurface(scheme, 'raised'), { borderRadius: 12 }]}>
            <TouchableOpacity
              style={styles.installmentToggle}
              onPress={() => setIsInstallment(!isInstallment)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isInstallment }}
            >
              <View style={[styles.checkbox, { borderColor: themeColors.border }, isInstallment && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }]}>
                {isInstallment && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.installmentToggleText, { color: themeColors.textPrimary }]}>
                Este gasto es a cuotas
              </Text>
            </TouchableOpacity>

            {isInstallment && (
              <View style={styles.installmentFields}>
                <View style={styles.installmentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.installmentLabel, { color: themeColors.textSecondary }]}>Total de cuotas</Text>
                    <TextInput
                      style={[styles.installmentInput, neuInset(scheme), { color: themeColors.textPrimary }]}
                      value={installmentCount}
                      onChangeText={setInstallmentCount}
                      placeholder="Ej: 6"
                      placeholderTextColor={themeColors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.installmentLabel, { color: themeColors.textSecondary }]}>Cuotas ya pagadas</Text>
                    <TextInput
                      style={[styles.installmentInput, neuInset(scheme), { color: themeColors.textPrimary }]}
                      value={paidInstallments}
                      onChangeText={setPaidInstallments}
                      placeholder="0"
                      placeholderTextColor={themeColors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                {installmentCount && parseFormattedAmount(displayAmount) > 0 && (
                  <Text style={[styles.installmentHint, { color: themeColors.textTertiary }]}>
                    💡 Cuota de ~${(parseFormattedAmount(displayAmount) / parseInt(installmentCount || '1', 10)).toLocaleString('es')} cada una
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Category Selector */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Categoría</Text>
        <CategorySelector selectedId={categoryId} onSelect={setCategoryId} />

        {/* Date Picker */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Fecha</Text>
        <TouchableOpacity
          style={[styles.dateButton, neuInset(scheme)]}
          onPress={() => setShowDatePicker(!showDatePicker)}
          accessibilityLabel="Seleccionar fecha"
          accessibilityRole="button"
        >
          <Text style={[styles.dateButtonText, { color: themeColors.textPrimary }]}>{formattedDate}</Text>
          <Text style={[styles.dateButtonIcon, { color: themeColors.textTertiary }]}>{showDatePicker ? '▲' : '▼'}</Text>
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

        {/* Description */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, neuInset(scheme), { color: themeColors.textPrimary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción del movimiento..."
          placeholderTextColor={themeColors.textTertiary}
          multiline
          numberOfLines={3}
          accessibilityLabel="Descripción del movimiento"
        />

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelButtonText, { color: themeColors.textSecondary }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: themeColors.primary }, neuShadow(scheme, 'raised'), submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Guardar')}
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
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
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  selectorChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectorChipBalance: {
    fontSize: 11,
    marginTop: 2,
  },

  // Installment section
  installmentSection: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  installmentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  installmentToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  installmentFields: {
    marginTop: 14,
  },
  installmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  installmentLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  installmentInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  installmentHint: {
    fontSize: 12,
    marginTop: 10,
  },

  // Date picker
  dateButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
  },
  dateButtonIcon: {
    fontSize: 12,
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
    fontWeight: '500',
  },
  submitButton: {
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
