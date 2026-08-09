import React, { useEffect, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
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
import { DebtService } from '@/services/debts';
import { AccountService } from '@/services/accounts/accountService';
import type { DebtCategory, DebtDirection } from '@/services/debts';
import type { MainStackParamList } from '@/navigation/types';
import type { Account } from '@/types';

type AddDebtNavProp = NativeStackNavigationProp<MainStackParamList>;
type AddDebtRouteProp = RouteProp<MainStackParamList, 'AddDebt'>;

const CATEGORY_OPTIONS: { key: DebtCategory; label: string; icon: string }[] = [
  { key: 'credit_card', label: 'Tarjeta de Crédito', icon: '💳' },
  { key: 'installment', label: 'Deuda en Cuotas', icon: '📋' },
  { key: 'personal', label: 'Cuenta Personal', icon: '🤝' },
];

const DIRECTION_OPTIONS: { key: DebtDirection; label: string }[] = [
  { key: 'i_owe', label: 'Yo debo' },
  { key: 'they_owe_me', label: 'Me deben' },
];

export function AddDebtModal() {
  const colors = useThemeColors();
  const navigation = useNavigation<AddDebtNavProp>();
  const route = useRoute<AddDebtRouteProp>();
  const debtService = useMemo(() => new DebtService(), []);
  const accountService = useMemo(() => new AccountService(), []);

  const [category, setCategory] = useState<DebtCategory>(route.params?.category ?? 'personal');
  const [direction, setDirection] = useState<DebtDirection>(route.params?.direction ?? 'i_owe');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [displayTotalAmount, setDisplayTotalAmount] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [displayInstallmentAmount, setDisplayInstallmentAmount] = useState('');
  const [paidInstallments, setPaidInstallments] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState<string | null>(null);
  const [creditCardAccounts, setCreditCardAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);

  const showInstallments = category === 'installment' || category === 'credit_card';
  const showCounterparty = category === 'personal' || category === 'installment';
  const showLinkedAccount = category === 'credit_card';

  const formatWithThousands = (value: string): string => {
    const clean = value.replace(/[^0-9]/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text: string) => {
    const raw = text.replace(/\./g, '');
    setTotalAmount(raw);
    setDisplayTotalAmount(formatWithThousands(raw));
  };

  const handleInstallmentAmountChange = (text: string) => {
    const raw = text.replace(/\./g, '');
    setInstallmentAmount(raw);
    setDisplayInstallmentAmount(formatWithThousands(raw));
  };

  useEffect(() => {
    if (category === 'credit_card') {
      accountService.getActiveAccounts().then((accounts) => {
        setCreditCardAccounts(accounts.filter((a) => a.type === 'credit_card'));
      });
    }
  }, [category, accountService]);

  const handleSave = async () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') {
        window.alert('El nombre es obligatorio');
      } else {
        Alert.alert('Error', 'El nombre es obligatorio');
      }
      return;
    }
    const amountNum = parseInt(totalAmount || '0', 10);
    if (amountNum < 0) {
      if (Platform.OS === 'web') {
        window.alert('El monto no puede ser negativo');
      } else {
        Alert.alert('Error', 'El monto no puede ser negativo');
      }
      return;
    }

    setSaving(true);
    try {
      const amountCentavos = amountNum * 100;
      const installments = totalInstallments ? parseInt(totalInstallments, 10) : undefined;
      const instAmount = installmentAmount
        ? parseInt(installmentAmount, 10) * 100
        : installments
          ? Math.round(amountCentavos / installments)
          : undefined;
      const paidInst = paidInstallments ? parseInt(paidInstallments, 10) : 0;

      const newDebt = await debtService.create({
        category,
        direction,
        name: name.trim(),
        description: description.trim() || undefined,
        totalAmount: amountCentavos,
        totalInstallments: installments,
        installmentAmount: instAmount,
        counterparty: counterparty.trim() || undefined,
        linkedAccountId: linkedAccountId ?? undefined,
      });

      // If there are paid installments, update the debt directly
      if (paidInst > 0 && instAmount) {
        const paidAmount = instAmount * paidInst;
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

      navigation.goBack();
    } catch (error: any) {
      const msg = error.message ?? 'No se pudo guardar la deuda';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category selector */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Categoría</Text>
        <View style={styles.chipRow}>
          {CATEGORY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.chip,
                { borderColor: colors.border },
                category === opt.key && [styles.chipActive, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }],
              ]}
              onPress={() => setCategory(opt.key)}
            >
              <Text style={styles.chipIcon}>{opt.icon}</Text>
              <Text style={[styles.chipLabel, { color: colors.textSecondary }, category === opt.key && { color: colors.primary, fontWeight: '600' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Direction selector */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Dirección</Text>
        <View style={styles.chipRow}>
          {DIRECTION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.chip,
                { borderColor: colors.border },
                direction === opt.key && [styles.chipActive, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }],
              ]}
              onPress={() => setDirection(opt.key)}
            >
              <Text style={[styles.chipLabel, { color: colors.textSecondary }, direction === opt.key && { color: colors.primary, fontWeight: '600' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Visa Oro, Préstamo Juan..."
          placeholderTextColor={colors.textTertiary}
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Notas adicionales..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={2}
        />

        {/* Total Amount */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Monto total ($)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
          value={displayTotalAmount}
          onChangeText={handleAmountChange}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
        />

        {/* Counterparty */}
        {showCounterparty && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {direction === 'they_owe_me' ? '¿Quién te debe?' : '¿A quién le debes?'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
              value={counterparty}
              onChangeText={setCounterparty}
              placeholder="Nombre de la persona o entidad"
              placeholderTextColor={colors.textTertiary}
            />
          </>
        )}

        {/* Linked credit card account */}
        {showLinkedAccount && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Vincular a cuenta de tarjeta</Text>
            {creditCardAccounts.length === 0 ? (
              <Text style={[styles.noAccountsText, { color: colors.textTertiary }]}>
                No tienes cuentas tipo tarjeta de crédito. Crea una primero en el tab Cuentas.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {creditCardAccounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      linkedAccountId === acc.id && [styles.chipActive, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }],
                    ]}
                    onPress={() => setLinkedAccountId(linkedAccountId === acc.id ? null : acc.id)}
                  >
                    <Text style={styles.chipIcon}>💳</Text>
                    <Text style={[styles.chipLabel, { color: colors.textSecondary }, linkedAccountId === acc.id && { color: colors.primary, fontWeight: '600' }]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={[styles.helpText, { color: colors.textTertiary }]}>
              Al vincular, los gastos registrados en esa cuenta sumarán automáticamente a esta deuda.
            </Text>
          </>
        )}

        {/* Installments */}
        {showInstallments && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Número de cuotas</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
              value={totalInstallments}
              onChangeText={setTotalInstallments}
              placeholder="Ej: 12"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Monto por cuota (opcional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
              value={displayInstallmentAmount}
              onChangeText={handleInstallmentAmountChange}
              placeholder="Se calcula automáticamente si lo dejas vacío"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Cuotas ya pagadas</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
              value={paidInstallments}
              onChangeText={setPaidInstallments}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
          </>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Guardar deuda"
        >
          <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar Deuda'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {},
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: 13 },

  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  noAccountsText: { fontSize: 13, fontStyle: 'italic' },
  helpText: { fontSize: 12, marginTop: 8, lineHeight: 16 },
});
