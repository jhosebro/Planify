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
import { TransferService } from '@/services/transfers/transferService';
import { AccountService } from '@/services/accounts/accountService';
import type { MainStackParamList } from '@/navigation/types';
import type { Account } from '@/types';

type AddTransferNavProp = NativeStackNavigationProp<MainStackParamList, 'AddTransfer'>;

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AddTransferModal() {
  const navigation = useNavigation<AddTransferNavProp>();
  const transferService = useMemo(() => new TransferService(), []);
  const accountService = useMemo(() => new AccountService(), []);

  const [sourceAccountId, setSourceAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showInsufficientWarning, setShowInsufficientWarning] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const accountList = await accountService.getActiveAccounts();
      setAccounts(accountList);
      if (accountList.length >= 2) {
        setSourceAccountId(accountList[0].id);
        setDestinationAccountId(accountList[1].id);
      } else if (accountList.length === 1) {
        setSourceAccountId(accountList[0].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  // Check insufficient balance when amount or source account changes
  useEffect(() => {
    if (!sourceAccountId || !amount.trim()) {
      setShowInsufficientWarning(false);
      return;
    }

    const amountCentavos = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCentavos) || amountCentavos <= 0) {
      setShowInsufficientWarning(false);
      return;
    }

    const sourceAccount = accounts.find((a) => a.id === sourceAccountId);
    if (sourceAccount && sourceAccount.balance < amountCentavos) {
      setShowInsufficientWarning(true);
    } else {
      setShowInsufficientWarning(false);
    }
  }, [sourceAccountId, amount, accounts]);

  const handleSubmit = async () => {
    if (!amount.trim() || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a cero.');
      return;
    }

    if (!sourceAccountId) {
      Alert.alert('Error', 'Debes seleccionar una cuenta origen.');
      return;
    }

    if (!destinationAccountId) {
      Alert.alert('Error', 'Debes seleccionar una cuenta destino.');
      return;
    }

    if (sourceAccountId === destinationAccountId) {
      Alert.alert('Error', 'La cuenta origen y destino deben ser diferentes.');
      return;
    }

    const amountCentavos = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCentavos) || amountCentavos <= 0) {
      Alert.alert('Error', 'El monto ingresado no es válido.');
      return;
    }

    // If insufficient balance, ask confirmation
    if (showInsufficientWarning) {
      Alert.alert(
        'Saldo Insuficiente',
        'La cuenta origen no tiene saldo suficiente para completar esta transferencia. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', style: 'destructive', onPress: () => executeTransfer(amountCentavos) },
        ]
      );
      return;
    }

    await executeTransfer(amountCentavos);
  };

  const executeTransfer = async (amountCentavos: number) => {
    setSubmitting(true);
    try {
      await transferService.create(
        {
          sourceAccountId: sourceAccountId!,
          destinationAccountId: destinationAccountId!,
          amount: amountCentavos,
          date: new Date(),
        },
        showInsufficientWarning // skip balance check if user already confirmed
      );
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo completar la transferencia: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId);
  const destinationAccount = accounts.find((a) => a.id === destinationAccountId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Nueva Transferencia</Text>

        {/* Source Account */}
        <Text style={styles.label}>Cuenta Origen</Text>
        <View style={styles.accountSelector}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={`source-${acc.id}`}
              style={[
                styles.accountOption,
                sourceAccountId === acc.id && styles.accountOptionActive,
                destinationAccountId === acc.id && styles.accountOptionDisabled,
              ]}
              onPress={() => {
                if (acc.id !== destinationAccountId) {
                  setSourceAccountId(acc.id);
                }
              }}
              disabled={acc.id === destinationAccountId}
              accessibilityRole="button"
              accessibilityState={{ selected: sourceAccountId === acc.id }}
              accessibilityLabel={`Cuenta origen: ${acc.name}`}
            >
              <Text
                style={[
                  styles.accountOptionName,
                  sourceAccountId === acc.id && styles.accountOptionNameActive,
                  destinationAccountId === acc.id && styles.accountOptionNameDisabled,
                ]}
              >
                {acc.name}
              </Text>
              <Text
                style={[
                  styles.accountOptionBalance,
                  sourceAccountId === acc.id && styles.accountOptionBalanceActive,
                ]}
              >
                {formatAmount(acc.balance)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Destination Account */}
        <Text style={styles.label}>Cuenta Destino</Text>
        <View style={styles.accountSelector}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={`dest-${acc.id}`}
              style={[
                styles.accountOption,
                destinationAccountId === acc.id && styles.accountOptionActive,
                sourceAccountId === acc.id && styles.accountOptionDisabled,
              ]}
              onPress={() => {
                if (acc.id !== sourceAccountId) {
                  setDestinationAccountId(acc.id);
                }
              }}
              disabled={acc.id === sourceAccountId}
              accessibilityRole="button"
              accessibilityState={{ selected: destinationAccountId === acc.id }}
              accessibilityLabel={`Cuenta destino: ${acc.name}`}
            >
              <Text
                style={[
                  styles.accountOptionName,
                  destinationAccountId === acc.id && styles.accountOptionNameActive,
                  sourceAccountId === acc.id && styles.accountOptionNameDisabled,
                ]}
              >
                {acc.name}
              </Text>
              <Text
                style={[
                  styles.accountOptionBalance,
                  destinationAccountId === acc.id && styles.accountOptionBalanceActive,
                ]}
              >
                {formatAmount(acc.balance)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <Text style={styles.label}>Monto</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          accessibilityLabel="Monto de la transferencia"
        />

        {/* Insufficient Balance Warning */}
        {showInsufficientWarning && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Saldo Insuficiente</Text>
              <Text style={styles.warningMessage}>
                La cuenta origen ({sourceAccount?.name}) tiene un saldo de{' '}
                {formatAmount(sourceAccount?.balance ?? 0)}, que es menor al monto de la transferencia.
              </Text>
            </View>
          </View>
        )}

        {/* Summary */}
        {sourceAccountId && destinationAccountId && amount.trim() && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen</Text>
            <Text style={styles.summaryText}>
              De: {sourceAccount?.name ?? '—'}
            </Text>
            <Text style={styles.summaryText}>
              A: {destinationAccount?.name ?? '—'}
            </Text>
            <Text style={styles.summaryAmount}>
              Monto: {formatAmount(Math.round(parseFloat(amount || '0') * 100))}
            </Text>
          </View>
        )}

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
              {submitting ? 'Transfiriendo...' : 'Transferir'}
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
    color: '#333',
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
    color: '#333',
    backgroundColor: '#fff',
  },
  accountSelector: {
    gap: 8,
  },
  accountOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#fff',
  },
  accountOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#EBF4FF',
  },
  accountOptionDisabled: {
    opacity: 0.4,
  },
  accountOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  accountOptionNameActive: {
    color: colors.primary,
  },
  accountOptionNameDisabled: {
    color: '#AAA',
  },
  accountOptionBalance: {
    fontSize: 14,
    color: '#666',
  },
  accountOptionBalanceActive: {
    color: colors.primary,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 13,
    color: '#795548',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
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
