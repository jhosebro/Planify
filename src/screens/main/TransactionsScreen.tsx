import React, { useCallback, useMemo, useRef, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow } from '@/lib/neumorphic';
import { ScreenTourModal, type TourSlide } from '@/components/ScreenTourModal';
import { AppIcon } from '@/components/AppIcon';
import { ScreenSkeleton } from '@/components/Skeleton';
import { useScreenTour } from '@/hooks/useScreenTour';
import {
  Alert,
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TransactionService } from '@/services/transactions/transactionService';
import type { TransactionFilter } from '@/services/transactions/transactionService';
import { AccountService } from '@/services/accounts/accountService';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { MainStackParamList } from '@/navigation/types';
import type { Account, Transaction } from '@/types';
import { formatMoney } from '@/utils/money';

type TransactionsNavProp = NativeStackNavigationProp<MainStackParamList>;

type DateFilter = 'all' | 'this_month' | 'last_month' | 'last_3_months';
type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';
type SortMode = 'date' | 'amount';

interface CategoryOption {
  id: string;
  name: string;
}

interface TransactionSection {
  title: string;
  date: Date | null;
  data: Transaction[];
}

const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];


function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatSectionDate(date: Date): string {
  const today = new Date();
  if (isSameDay(date, today)) return 'Hoy';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Ayer';

  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
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

function getTypeFilter(filter: TypeFilter): Pick<TransactionFilter, 'type' | 'isTransfer'> {
  switch (filter) {
    case 'income':
      return { type: 'income', isTransfer: false };
    case 'expense':
      return { type: 'expense', isTransfer: false };
    case 'transfer':
      return { isTransfer: true };
    case 'all':
    default:
      return {};
  }
}

async function fetchCategories(): Promise<CategoryOption[]> {
  const userId = useAuthStore.getState().userId;
  if (!userId) return [];
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .order('name');
  return (data ?? []) as CategoryOption[];
}

const DATE_FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'this_month', label: 'Este mes' },
  { key: 'last_month', label: 'Mes anterior' },
  { key: 'last_3_months', label: '3 meses' },
];

const TYPE_FILTER_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Gastos' },
  { key: 'transfer', label: 'Transferencias' },
];

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'date', label: 'Fecha' },
  { key: 'amount', label: 'Monto' },
];

export function TransactionsScreen() {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<TransactionsNavProp>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const transactionService = useMemo(() => new TransactionService(), []);
  const accountService = useMemo(() => new AccountService(), []);

  const { visible: tourVisible, openTour, closeTour } = useScreenTour('transactions');

  const TOUR_SLIDES: TourSlide[] = [
    {
      icon: 'banknote',
      title: 'Tus movimientos',
      description: 'Aquí ves todos tus ingresos y gastos agrupados por fecha de movimiento. Los movimientos marcados como transferencia son movimientos entre cuentas.',
    },
    {
      icon: 'search',
      title: 'Filtros',
      description: 'Filtra por período, cuenta, tipo y categoría para encontrar rápidamente cualquier movimiento. Puedes ordenarlos por fecha o por monto.',
    },
    {
      icon: 'pencil',
      title: 'Editar y eliminar',
      description: 'Toca un movimiento para editarlo. Mantén presionado para ver opciones de edición y eliminación.',
    },
    {
      icon: 'plus',
      title: 'Nuevo movimiento',
      description: 'Presiona el botón + para registrar un ingreso o gasto. Asigna categoría, cuenta, monto y descripción.',
    },
  ];

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const loadedFilterKey = useRef<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [accountFilter, setAccountFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount =
    (dateFilter !== 'all' ? 1 : 0) +
    (accountFilter ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (categoryFilter ? 1 : 0);

  const clearFilters = useCallback(() => {
    setDateFilter('all');
    setAccountFilter(undefined);
    setTypeFilter('all');
    setCategoryFilter(undefined);
  }, []);

  const loadData = useCallback(async () => {
    const filterKey = `${dateFilter}|${accountFilter ?? ''}|${typeFilter}|${categoryFilter ?? ''}`;
    const filtersChanged = loadedFilterKey.current !== null && loadedFilterKey.current !== filterKey;
    if (!hasLoaded.current || filtersChanged) setLoading(true);
    try {
      const [accountList, history, categoryList] = await Promise.all([
        accountService.getActiveAccounts(),
        transactionService.getHistory({
          accountId: accountFilter,
          categoryId: categoryFilter,
          ...getTypeFilter(typeFilter),
          ...getDateRange(dateFilter),
        }),
        fetchCategories(),
      ]);

      setAccounts(accountList);
      setTransactions(history);
      setCategories(categoryList);
      loadedFilterKey.current = filterKey;
      hasLoaded.current = true;
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [transactionService, accountService, dateFilter, accountFilter, typeFilter, categoryFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const sections = useMemo<TransactionSection[]>(() => {
    if (sortMode === 'amount') {
      const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
      return sorted.length > 0 ? [{ title: '', date: null, data: sorted }] : [];
    }

    const sorted = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
    const byDay = new Map<string, TransactionSection>();

    for (const transaction of sorted) {
      const key = `${transaction.date.getFullYear()}-${transaction.date.getMonth()}-${transaction.date.getDate()}`;
      const existing = byDay.get(key);
      if (existing) {
        existing.data.push(transaction);
      } else {
        byDay.set(key, {
          title: formatSectionDate(transaction.date),
          date: transaction.date,
          data: [transaction],
        });
      }
    }

    return Array.from(byDay.values());
  }, [transactions, sortMode]);

  const categoryNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) map.set(category.id, category.name);
    return map;
  }, [categories]);

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
      {/* Filters */}
      <View style={[neuSurface(scheme, 'flat'), styles.filterSection, { borderBottomColor: colors.borderInset }, isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%' }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {DATE_FILTER_OPTIONS.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              active={dateFilter === option.key}
              onPress={() => setDateFilter(option.key)}
            />
          ))}
        </ScrollView>

        <View style={styles.filterActionsRow}>
          <TouchableOpacity
            style={[
              styles.filtersToggle,
              showFilters ? neuSurface(scheme, 'pressed') : neuSurface(scheme, 'flat'),
            ]}
            onPress={() => setShowFilters((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showFilters }}
            accessibilityLabel="Mostrar filtros avanzados"
          >
            <Text style={[styles.filtersToggleText, { color: colors.textSecondary }]}>
              Filtros{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </Text>
            <AppIcon name={showFilters ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.sortGroup}>
            <Text style={[styles.sortLabel, { color: colors.textTertiary }]}>Orden</Text>
            {SORT_OPTIONS.map((option) => (
              <FilterChip
                key={option.key}
                label={option.label}
                active={sortMode === option.key}
                onPress={() => setSortMode(option.key)}
                compact
              />
            ))}
          </View>
        </View>

        {showFilters && (
          <View style={styles.advancedFilters}>
            {accounts.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: colors.textTertiary }]}>Cuenta</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  <FilterChip
                    label="Todas"
                    active={!accountFilter}
                    onPress={() => setAccountFilter(undefined)}
                    compact
                  />
                  {accounts.map((account) => (
                    <FilterChip
                      key={account.id}
                      label={account.name}
                      active={accountFilter === account.id}
                      onPress={() => setAccountFilter(account.id === accountFilter ? undefined : account.id)}
                      compact
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.filterGroup}>
              <Text style={[styles.filterGroupLabel, { color: colors.textTertiary }]}>Tipo</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {TYPE_FILTER_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.key}
                    label={option.label}
                    active={typeFilter === option.key}
                    onPress={() => setTypeFilter(option.key)}
                    compact
                  />
                ))}
              </ScrollView>
            </View>

            {categories.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: colors.textTertiary }]}>Categoría</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  <FilterChip
                    label="Todas"
                    active={!categoryFilter}
                    onPress={() => setCategoryFilter(undefined)}
                    compact
                  />
                  {categories.map((category) => (
                    <FilterChip
                      key={category.id}
                      label={category.name}
                      active={categoryFilter === category.id}
                      onPress={() => setCategoryFilter(category.id === categoryFilter ? undefined : category.id)}
                      compact
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
                accessibilityRole="button"
                accessibilityLabel="Limpiar filtros"
              >
                <Text style={[styles.clearButtonText, { color: colors.primary }]}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Transaction List */}
      {loading ? (
        <ScreenSkeleton variant="rows" rows={7} />
      ) : (
        <SectionList<Transaction, TransactionSection>
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
          ]}
          renderSectionHeader={({ section }) =>
            section.date ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionHeaderDate, { color: colors.textPrimary }]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionHeaderCount, { color: colors.textTertiary }]}>
                  {section.data.length} {section.data.length === 1 ? 'movimiento' : 'movimientos'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              accounts={accounts}
              categoryNames={categoryNames}
              onDelete={handleDeleteTransaction}
              onEdit={(id) => navigation.navigate('AddTransaction', { transactionId: id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeFilterCount > 0
                  ? 'No hay movimientos con estos filtros.'
                  : 'No hay movimientos registrados.'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {activeFilterCount > 0
                  ? 'Prueba con otros filtros o límpialos.'
                  : 'Crea un movimiento para comenzar.'}
              </Text>
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

      <ScreenTourModal visible={tourVisible} slides={TOUR_SLIDES} onClose={closeTour} />
    </View>
  );
}

// ─── Filter Chip ─────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}

function FilterChip({ label, active, onPress, compact }: FilterChipProps) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';

  return (
    <TouchableOpacity
      style={[
        compact ? styles.chipCompact : styles.filterChip,
        active
          ? { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') }
          : neuSurface(scheme, 'flat'),
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filtrar por ${label}`}
    >
      <Text
        style={[
          compact ? styles.chipCompactText : styles.filterChipText,
          { color: active ? colors.textInverse : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Transaction Item ────────────────────────────────────────────────────────

interface TransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
  categoryNames: Map<string, string>;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function TransactionItem({ transaction, accounts, categoryNames, onDelete, onEdit }: TransactionItemProps) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const isTransfer = !!transaction.linkedTransferId;
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const amountColor = isTransfer ? '#607D8B' : isExpense ? colors.redExpenses : colors.greenEarns;
  const accountName = accounts.find((a) => a.id === transaction.accountId)?.name ?? '';
  const categoryName = categoryNames.get(transaction.categoryId) ?? '';
  const meta = [accountName, categoryName].filter(Boolean).join(' · ');

  const handleLongPress = () => {
    const typeLabel = isTransfer ? 'transferencia' : isExpense ? 'gasto' : 'ingreso';
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar este ${typeLabel} de ${formatMoney(transaction.amount)}?`)) {
        onDelete(transaction.id);
      }
    } else {
      Alert.alert(
        'Opciones',
        `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} de ${formatMoney(transaction.amount)}`,
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
        <AppIcon
          name={isTransfer ? 'arrow-left-right' : isExpense ? 'arrow-down' : 'arrow-up'}
          size={18}
          color={isTransfer ? '#607D8B' : isExpense ? colors.redExpenses : colors.greenEarns}
        />
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
          {meta ? `${meta} · ` : ''}{formatDate(transaction.date)}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
        {sign}{formatMoney(transaction.amount)}
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
          <AppIcon name="trash" size={16} color={colors.textTertiary} />
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
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipCompact: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipCompactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filtersToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  advancedFilters: {
    marginTop: 12,
    gap: 10,
  },
  filterGroup: {
    gap: 6,
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderCount: {
    fontSize: 11,
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
