import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow } from '@/lib/neumorphic';
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
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
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
      <View style={[neuSurface(scheme, 'flat'), styles.filterSection, { borderBottomColor: colors.borderInset }, isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%' }]}>
        <View style={styles.dateFilterRow}>
          {DATE_FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterChip,
                dateFilter === option.key
                  ? { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') }
                  : neuSurface(scheme, 'flat'),
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
                  dateFilter === option.key && { color: colors.textInverse },
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
              style={[
                styles.accountChip,
                !accountFilter
                  ? { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') }
                  : neuSurface(scheme, 'flat'),
              ]}
              onPress={() => setAccountFilter(undefined)}
            >
              <Text style={[styles.accountChipText, { color: colors.textSecondary }, !accountFilter && { color: colors.textInverse }]}>
                Todas
              </Text>
            </TouchableOpacity>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.accountChip,
                  accountFilter === acc.id
                    ? { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') }
                    : neuSurface(scheme, 'flat'),
                ]}
                onPress={() => setAccountFilter(acc.id === accountFilter ? undefined : acc.id)}
              >
                <Text
                  style={[
                    styles.accountChipText,
                    { color: colors.textSecondary },
                    accountFilter === acc.id && { color: colors.textInverse },
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
        style={[styles.fab, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised'), isDesktop && styles.fabDesktop]}
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
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const isTransfer = !!transaction.linkedTransferId;
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const amountColor = isTransfer ? '#607D8B' : isExpense ? colors.redExpenses : colors.greenEarns;
  const accountName = accounts.find((a) => a.id === transaction.accountId)?.name ?? '';

  const handleLongPress = () => {
    const typeLabel = isTransfer ? 'transferencia' : isExpense ? 'gasto' : 'ingreso';
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar este ${typeLabel} de ${formatAmount(transaction.amount)}?`)) {
        onDelete(transaction.id);
      }
    } else {
      Alert.alert(
        'Opciones',
        `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} de ${formatAmount(transaction.amount)}`,
        [
          ...(!isTransfer ? [{ text: 'Editar', onPress: () => onEdit(transaction.id) }] : []),
          { text: 'Eliminar', style: 'destructive' as const, onPress: () => onDelete(transaction.id) },
          { text: 'Cancelar', style: 'cancel' as const },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      style={[neuSurface(scheme, 'flat'), styles.transactionRow]}
      onPress={() => !isTransfer && onEdit(transaction.id)}
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityHint={isTransfer ? 'Mantén presionado para eliminar' : 'Toca para editar, mantén presionado para más opciones'}
    >
      <View style={[styles.transactionIcon, isTransfer && styles.transactionIconTransfer]}>
        <Text style={styles.transactionIconText}>{isTransfer ? '↔' : isExpense ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <View style={styles.transactionTitleRow}>
          <Text style={[styles.transactionDescription, { color: colors.textPrimary }]}>
            {transaction.description || (isTransfer ? 'Transferencia' : isExpense ? 'Gasto' : 'Ingreso')}
          </Text>
          {isTransfer && (
            <View style={styles.transferBadge}>
              <Text style={styles.transferBadgeText}>Transferencia</Text>
            </View>
          )}
        </View>
        <Text style={[styles.transactionMeta, { color: colors.textTertiary }]}>
          {accountName}{accountName ? ' · ' : ''}{formatDate(transaction.date)}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
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
  },
  accountChipText: {
    fontSize: 12,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  transactionRow: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
  transactionIconTransfer: {
    backgroundColor: '#ECEFF1',
  },
  transactionIconText: {
    fontSize: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transferBadge: {
    backgroundColor: '#ECEFF1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  transferBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#607D8B',
    letterSpacing: 0.3,
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
    alignItems: 'center',
    justifyContent: 'center',
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
