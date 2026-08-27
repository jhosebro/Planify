import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '@/theme';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AccountService } from '@/services/accounts/accountService';
import { TransactionService } from '@/services/transactions/transactionService';
import { useAccountStore } from '@/store/accountStore';
import type { MainStackParamList } from '@/navigation/types';
import type { Account, AccountType, Transaction } from '@/types';

type AccountDetailNavProp = NativeStackNavigationProp<MainStackParamList, 'AccountDetail'>;
type AccountDetailRouteProp = RouteProp<MainStackParamList, 'AccountDetail'>;

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de Crédito',
};

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

export function AccountDetailScreen() {
  const navigation = useNavigation<AccountDetailNavProp>();
  const route = useRoute<AccountDetailRouteProp>();
  const { accountId } = route.params;

  const accountService = useMemo(() => new AccountService(), []);
  const transactionService = useMemo(() => new TransactionService(), []);
  const storeAccounts = useAccountStore((s) => s.accounts);

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Count of other active accounts (to decide if transfer button is useful)
  const hasOtherAccounts = storeAccounts.filter((a) => !a.isArchived && a.id !== accountId).length > 0;

  const loadData = useCallback(async () => {
    try {
      const [accountData, history] = await Promise.all([
        accountService.getById(accountId),
        transactionService.getHistory({ accountId }),
      ]);
      setAccount(accountData);
      setTransactions(history);
    } catch (error) {
      console.error('Error loading account detail:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, accountService, transactionService]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando cuenta...</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Cuenta no encontrada.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Account Header */}
      <View style={styles.headerCard}>
        <Text style={styles.accountName}>{account.name}</Text>
        <Text style={styles.accountType}>{ACCOUNT_TYPE_LABELS[account.type]}</Text>
        <Text style={[styles.accountBalance, account.balance < 0 && styles.negativeBalance]}>
          {formatAmount(account.balance)}
        </Text>
        {hasOtherAccounts && (
          <TouchableOpacity
            style={styles.transferButton}
            onPress={() => navigation.navigate('AddTransfer', { sourceAccountId: accountId })}
            accessibilityRole="button"
            accessibilityLabel="Nueva transferencia desde esta cuenta"
          >
            <MaterialCommunityIcons name="bank-transfer" size={20} color="#fff" />
            <Text style={styles.transferButtonText}>Transferir</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Transaction History */}
      <Text style={styles.sectionTitle}>Movimientos</Text>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyListText}>No hay movimientos en esta cuenta.</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Transaction Item ────────────────────────────────────────────────────────

interface TransactionItemProps {
  transaction: Transaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const isTransfer = !!transaction.linkedTransferId;
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const amountColor = isTransfer ? '#607D8B' : isExpense ? colors.redExpenses : colors.greenEarns;

  return (
    <View style={styles.transactionRow}>
      <View style={[styles.transactionIcon, isTransfer && styles.transactionIconTransfer]}>
        <Text style={styles.transactionIconText}>{isTransfer ? '↔' : isExpense ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <View style={styles.transactionTitleRow}>
          <Text style={styles.transactionDescription}>
            {transaction.description || (isTransfer ? 'Transferencia' : isExpense ? 'Gasto' : 'Ingreso')}
          </Text>
          {isTransfer && (
            <View style={styles.transferBadge}>
              <Text style={styles.transferBadgeText}>Transferencia</Text>
            </View>
          )}
        </View>
        <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
      </View>
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
        {sign}{formatAmount(transaction.amount)}
      </Text>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.backgroundPrimary,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  accountBalance: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  negativeBalance: {
    color: '#FFCDD2',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyListText: {
    fontSize: 14,
    color: '#999',
  },
});
