import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '@/theme';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AccountService } from '@/services/accounts/accountService';
import type { MainStackParamList } from '@/navigation/types';
import type { Account, AccountType } from '@/types';

type AccountsNavProp = NativeStackNavigationProp<MainStackParamList>;

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de Crédito',
};

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AccountsScreen() {
  const navigation = useNavigation<AccountsNavProp>();
  const accountService = useMemo(() => new AccountService(), []);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const [allAccounts, total] = await Promise.all([
        accountService.getActiveAccounts(),
        accountService.getTotalBalance(),
      ]);
      setAccounts(allAccounts);
      setTotalBalance(total);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [accountService]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  const handleAccountPress = (accountId: string) => {
    navigation.navigate('AccountDetail', { accountId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando cuentas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Total Balance Header */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Total</Text>
        <Text style={[styles.balanceAmount, totalBalance < 0 && styles.negativeAmount]}>
          {formatAmount(totalBalance)}
        </Text>
      </View>

      {/* Account List */}
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.accountCard}
            onPress={() => handleAccountPress(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Cuenta ${item.name}, saldo ${formatAmount(item.balance)}`}
          >
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{item.name}</Text>
              <Text style={styles.accountType}>{ACCOUNT_TYPE_LABELS[item.type]}</Text>
            </View>
            <Text style={[styles.accountBalance, item.balance < 0 && styles.negativeBalance]}>
              {formatAmount(item.balance)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes cuentas registradas.</Text>
            <Text style={styles.emptySubtext}>Crea tu primera cuenta para comenzar.</Text>
          </View>
        }
      />

      {/* Create Account Form */}
      {showCreateForm && (
        <CreateAccountForm
          accountService={accountService}
          onCreated={() => {
            setShowCreateForm(false);
            loadAccounts();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* FAB to create account */}
      {!showCreateForm && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateForm(true)}
          accessibilityRole="button"
          accessibilityLabel="Crear nueva cuenta"
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Create Account Form ─────────────────────────────────────────────────────

interface CreateAccountFormProps {
  accountService: AccountService;
  onCreated: () => void;
  onCancel: () => void;
}

function CreateAccountForm({ accountService, onCreated, onCancel }: CreateAccountFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [initialBalance, setInitialBalance] = useState('');
  const [displayBalance, setDisplayBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formatWithThousands = (value: string): string => {
    // Remove all non-numeric characters except decimal point
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const integerPart = parts[0] ?? '';
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
    // Add thousand separators
    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return formatted + decimalPart;
  };

  const handleBalanceChange = (text: string) => {
    // Strip formatting to get raw number
    const raw = text.replace(/\./g, '').replace(',', '.');
    setInitialBalance(raw);
    setDisplayBalance(formatWithThousands(text.replace(/\./g, '')));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la cuenta es obligatorio.');
      return;
    }

    const numericValue = parseFloat(initialBalance || '0');
    const balanceCentavos = Math.round(numericValue * 100);
    if (isNaN(balanceCentavos)) {
      Alert.alert('Error', 'El saldo inicial debe ser un número válido.');
      return;
    }

    setSubmitting(true);
    try {
      await accountService.create({
        name: name.trim(),
        type,
        initialBalance: balanceCentavos,
      });
      onCreated();
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la cuenta. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formOverlay}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Nueva Cuenta</Text>

        <Text style={styles.inputLabel}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Cuenta de ahorros"
          placeholderTextColor="#999"
          accessibilityLabel="Nombre de la cuenta"
        />

        <Text style={styles.inputLabel}>Tipo</Text>
        <View style={styles.typeSelector}>
          {(['bank', 'cash', 'credit_card'] as AccountType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeButton, type === t && styles.typeButtonActive]}
              onPress={() => setType(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: type === t }}
            >
              <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                {ACCOUNT_TYPE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Saldo Inicial</Text>
        <TextInput
          style={styles.input}
          value={displayBalance}
          onChangeText={handleBalanceChange}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
          accessibilityLabel="Saldo inicial"
        />

        <View style={styles.formButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Creando...' : 'Crear'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
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
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    margin: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  negativeAmount: {
    color: '#FFCDD2',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  accountType: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  negativeBalance: {
    color: colors.redExpenses,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '400',
    marginTop: -2,
  },

  // Form styles
  formOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
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
