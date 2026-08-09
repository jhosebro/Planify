import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TransactionService } from '@/services/transactions/transactionService';
import { AccountService } from '@/services/accounts/accountService';
import type { MainStackParamList } from '@/navigation/types';
import type { Account, Transaction } from '@/types';

type TransactionsNavProp = NativeStackNavigationProp<MainStackParamList>;

type DateFilter = 'all' | 'this_month' | 'last_month' | 'last_3_months';

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getDateRange(filter: DateFilter): { dateFrom?: Date; dateTo?: Date } {
  const now = new Date();

  switch (filter) {
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { dateFrom: from, dateTo: to };
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { dateFrom: from, dateTo: to };
    }
    case 'last_3_months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { dateFrom: from, dateTo: to };
    }
    case 'all':
    default:
      return {};
  }
}

const DATE_FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'this_month', label: 'Este mes' },
  { key: 'last_month', label: 'Mes anterior' },
  { key: 'last_3_months', label: '3 meses' },
];

export function TransactionsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<TransactionsNavProp>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const transactionService = useMemo(() => new TransactionService(), []);
  const accountService = useMemo(() => new AccountService(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [accountFilter, setAccountFilter] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accountList, history] = await Promise.all([
        accountService.getActiveAccounts(),
        transactionService.getHistory({
          accountId: accountFilter,
          ...getDateRange(dateFilter),
        }),
      ]);
      setAccounts(accountList);
      setTransactions(history);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [transactionService, accountService, dateFilter, accountFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction');
  };

  const handleDeleteTransaction = useCallback(async (id: string) => {
    try {
      await transactionService.delete(id);
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el movimiento.');
    }
  }, [transactionService, loadData]);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundPrimary }, isDesktop && { alignItems: 'center' }]}>
      {/* Date Filter */}
      <View style={[styles.filterSection, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }, isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%' }]}>
        <View style={styles.dateFilterRow}>
          {DATE_FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterChip,
                { backgroundColor: colors.border },
                dateFilter === option.key && styles.filterChipActive,
              ]}
              onPress={() => setDateFilter(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: dateFilter === option.key }}
              accessibilityLabel={`Filtrar por ${option.label}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  dateFilter === option.key && styles.filterChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Filter */}
        {accounts.length > 0 && (
          <View style={styles.accountFilterRow}>
            <TouchableOpacity
              style={[styles.accountChip, { borderColor: colors.border, backgroundColor: colors.cardBackground }, !accountFilter && styles.accountChipActive]}
              onPress={() => setAccountFilter(undefined)}
            >
              <Text style={[styles.accountChipText, { color: colors.textSecondary }, !accountFilter && styles.accountChipTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.accountChip, { borderColor: colors.border, backgroundColor: colors.cardBackground }, accountFilter === acc.id && styles.accountChipActive]}
                onPress={() => setAccountFilter(acc.id === accountFilter ? undefined : acc.id)}
              >
                <Text
                  style={[
                    styles.accountChipText,
                    { color: colors.textSecondary },
                    accountFilter === acc.id && styles.accountChipTextActive,
                  ]}
                >
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
          ]}
          renderItem={({ item }) => <TransactionItem transaction={item} accounts={accounts} onDelete={handleDeleteTransaction} onEdit={(id) => navigation.navigate('AddTransaction', { transactionId: id })} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay movimientos registrados.</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Crea un movimiento para comenzar.</Text>
            </View>
          }
        />
      )}

      {/* FAB to add transaction */}
      <TouchableOpacity
        style={[styles.fab, isDesktop && styles.fabDesktop]}
        onPress={handleAddTransaction}
        accessibilityRole="button"
        accessibilityLabel="Agregar movimiento"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Transaction Item ────────────────────────────────────────────────────────

interface TransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function TransactionItem({ transaction, accounts, onDelete, onEdit }: TransactionItemProps) {
  const colors = useThemeColors();
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const color = isExpense ? colors.redExpenses : colors.greenEarns;
  const accountName = accounts.find((a) => a.id === transaction.accountId)?.name ?? '';

  const handleLongPress = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar este ${isExpense ? 'gasto' : 'ingreso'} de ${formatAmount(transaction.amount)}?`)) {
        onDelete(transaction.id);
      }
    } else {
      Alert.alert(
        'Opciones',
        `${isExpense ? 'Gasto' : 'Ingreso'} de ${formatAmount(transaction.amount)}`,
        [
          { text: 'Editar', onPress: () => onEdit(transaction.id) },
          { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(transaction.id) },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      style={[styles.transactionRow, { backgroundColor: colors.cardBackground }]}
      onPress={() => onEdit(transaction.id)}
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityHint="Toca para editar, mantén presionado para más opciones"
    >
      <View style={styles.transactionIcon}>
        <Text style={styles.transactionIconText}>{isExpense ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDescription, { color: colors.textPrimary }]}>
          {transaction.description || (isExpense ? 'Gasto' : 'Ingreso')}
        </Text>
        <Text style={[styles.transactionMeta, { color: colors.textTertiary }]}>
          {accountName}{accountName ? ' · ' : ''}{formatDate(transaction.date)}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color }]}>
        {sign}{formatAmount(transaction.amount)}
      </Text>
      {Platform.OS === 'web' && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            if (window.confirm('¿Eliminar este movimiento?')) {
              onDelete(transaction.id);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Eliminar movimiento"
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  accountFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  accountChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#fff',
  },
  accountChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EBF4FF',
  },
  accountChipText: {
    fontSize: 12,
    color: '#666',
  },
  accountChipTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  transactionRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transactionMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 6,
    opacity: 0.6,
  },
  deleteBtnText: {
    fontSize: 14,
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
  fabDesktop: {
    bottom: 32,
    right: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});
