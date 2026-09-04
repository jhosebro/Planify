import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuProgress } from '@/lib/neumorphic';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TrackingService } from '@/services/tracking';
import type { TrackingList, TrackingItem } from '@/services/tracking';
import { TransactionService } from '@/services/transactions/transactionService';
import { AccountService } from '@/services/accounts/accountService';
import { BudgetService } from '@/services/budgets';
import type { BudgetConsumption } from '@/types';
import type { Account } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { BottomModal } from '@/components/BottomModal';
import type { MainStackParamList } from '@/navigation/types';

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function getDaysUntilNextPurchase(item: TrackingItem): { days: number; isOverdue: boolean } | null {
  if (!item.nextPurchaseDate) return null;
  const diff = Math.ceil((item.nextPurchaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { days: Math.abs(diff), isOverdue: diff < 0 };
}

interface LinkedBudgetInfo {
  categoryName: string;
  categoryId: string;
  monthlyLimit: number;
  spent: number;
  percentage: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

export function TrackingListDetailScreen() {
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'TrackingListDetail'>>();
  const { listId } = route.params;
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const trackingService = useMemo(() => new TrackingService(), []);
  const budgetService = useMemo(() => new BudgetService(), []);

  const [list, setList] = useState<TrackingList | null>(null);
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'stocked'>('all');
  const [budgetInfo, setBudgetInfo] = useState<LinkedBudgetInfo | null>(null);

  // Purchase confirmation modal state
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<TrackingItem | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, itemsData] = await Promise.all([
        trackingService.getListById(listId),
        trackingService.getItemsByList(listId),
      ]);
      setList(listData);
      setItems(itemsData);

      // Load linked budget info if exists
      if (listData?.linkedBudgetId) {
        try {
          const consumption = await budgetService.getConsumption(listData.linkedBudgetId);
          const { data: budgetRow } = await supabase
            .from('budgets')
            .select('monthly_limit, category_id, categories(name)')
            .eq('id', listData.linkedBudgetId)
            .single();

          if (budgetRow) {
            setBudgetInfo({
              categoryName: (budgetRow as any).categories?.name ?? 'Sin categoría',
              categoryId: (budgetRow as any).category_id,
              monthlyLimit: consumption.limit,
              spent: consumption.spent,
              percentage: consumption.percentage,
            });
          }
        } catch (err) {
          console.error('Error loading budget info:', err);
          setBudgetInfo(null);
        }
      } else {
        setBudgetInfo(null);
      }
    } catch (error) {
      console.error('Error loading tracking list detail:', error);
    } finally {
      setLoading(false);
    }
  }, [trackingService, budgetService, listId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'pending': return items.filter((i) => i.needsToBuy);
      case 'stocked': return items.filter((i) => !i.needsToBuy);
      default: return items;
    }
  }, [items, filter]);

  const pendingCount = items.filter((i) => i.needsToBuy).length;
  const totalEstimate = items
    .filter((i) => i.needsToBuy)
    .reduce((sum, i) => sum + i.price, 0);

  // Gasto mensual estimado: solo items con averageDurationDays
  // Fórmula: (precio / duración_días) * 30 = costo mensual por producto
  const monthlyEstimate = useMemo(() => {
    return items
      .filter((i) => i.averageDurationDays && i.averageDurationDays > 0)
      .reduce((sum, i) => sum + (i.price / i.averageDurationDays!) * 30, 0);
  }, [items]);

  const handleToggleNeedsToBuy = async (itemId: string) => {
    try {
      const updated = await trackingService.toggleNeedsToBuy(itemId);
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleOpenPurchaseModal = async (item: TrackingItem) => {
    setPurchaseItem(item);
    setPurchaseLoading(false);
    setSelectedAccountId(null);
    setSelectedCategoryId(budgetInfo?.categoryId ?? null);

    // Load accounts and categories
    try {
      const accountService = new AccountService();
      const accs = await accountService.getActiveAccounts();
      setAccounts(accs);

      // If no linked budget, load categories for user to pick
      if (!budgetInfo?.categoryId) {
        const userId = useAuthStore.getState().userId;
        const { data: cats } = await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', userId)
          .order('name', { ascending: true });
        setCategories(cats ?? []);
      }
    } catch (err) {
      console.error('Error loading accounts/categories:', err);
    }

    setPurchaseModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseItem) return;

    if (!selectedAccountId) {
      const msg = 'Selecciona una cuenta para registrar el gasto';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Cuenta requerida', msg);
      return;
    }

    const categoryToUse = selectedCategoryId ?? budgetInfo?.categoryId;
    if (!categoryToUse) {
      const msg = 'Selecciona una categoría para el movimiento';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Categoría requerida', msg);
      return;
    }

    setPurchaseLoading(true);
    try {
      // 1. Create the expense transaction
      const transactionService = new TransactionService();
      await transactionService.create({
        accountId: selectedAccountId,
        type: 'expense',
        amount: purchaseItem.price,
        categoryId: categoryToUse,
        date: new Date(),
        description: `Compra: ${purchaseItem.name}`,
      });

      // 2. Mark item as purchased (updates last_purchase_date, sets needs_to_buy = false)
      const updated = await trackingService.markAsPurchased(purchaseItem.id);
      setItems((prev) => prev.map((i) => (i.id === purchaseItem.id ? updated : i)));

      setPurchaseModalVisible(false);
      setPurchaseItem(null);

      // Reload budget info to reflect new spent
      if (budgetInfo && list?.linkedBudgetId) {
        const consumption = await budgetService.getConsumption(list.linkedBudgetId);
        setBudgetInfo((prev) => prev ? { ...prev, spent: consumption.spent, percentage: consumption.percentage } : null);
      }
    } catch (error: any) {
      const msg = error.message || 'Error al registrar la compra';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const doDelete = async () => {
      try {
        await trackingService.deleteItem(itemId);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('¿Eliminar este producto?')) doDelete();
    } else {
      Alert.alert('Eliminar producto', '¿Estás seguro de que quieres eliminar este producto?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}
        contentContainerStyle={[
          styles.content,
          isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
        ]}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* List info header */}
            <View style={[styles.listHeader, { backgroundColor: list?.color ?? themeColors.primary }, neuShadow(scheme, 'raised')]}>
              <Text style={styles.listHeaderIcon}>{list?.icon ?? '📋'}</Text>
              <Text style={styles.listHeaderName}>{list?.name ?? 'Lista'}</Text>
              {list?.description ? (
                <Text style={styles.listHeaderDesc}>{list.description}</Text>
              ) : null}
              <View style={styles.listHeaderStats}>
                <Text style={styles.listHeaderStat}>
                  {items.length} producto{items.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.listHeaderStatDivider}>•</Text>
                <Text style={styles.listHeaderStat}>
                  {pendingCount} por comprar
                </Text>
                {totalEstimate > 0 && (
                  <>
                    <Text style={styles.listHeaderStatDivider}>•</Text>
                    <Text style={styles.listHeaderStat}>
                      ~{formatAmount(totalEstimate)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Budget info card */}
            {budgetInfo && (
              <BudgetInfoCard
                budgetInfo={budgetInfo}
                monthlyEstimate={monthlyEstimate}
              />
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.addItemButton, { backgroundColor: themeColors.primary, ...neuShadow(scheme, 'raised') }]}
                onPress={() => navigation.navigate('AddTrackingItem', { listId })}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addItemButtonText}>Agregar producto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editListButton, neuSurface(scheme, 'flat')]}
                onPress={() => navigation.navigate('AddTrackingList', { listId })}
              >
                <Ionicons name="pencil" size={16} color={themeColors.primary} />
                <Text style={[styles.editListButtonText, { color: themeColors.primary }]}>Editar lista</Text>
              </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
              {(['all', 'pending', 'stocked'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    neuSurface(scheme, 'flat'),
                    filter === f && { backgroundColor: themeColors.primary, borderColor: themeColors.primary, ...neuShadow(scheme, 'pressed') },
                  ]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: themeColors.textSecondary },
                    filter === f && { color: themeColors.textInverse },
                  ]}>
                    {f === 'all' ? 'Todos' : f === 'pending' ? `Por comprar (${pendingCount})` : 'En stock'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TrackingItemCard
            item={item}
            onToggle={() => handleToggleNeedsToBuy(item.id)}
            onMarkPurchased={() => handleOpenPurchaseModal(item)}
            onDelete={() => handleDeleteItem(item.id)}
            onEdit={() => navigation.navigate('AddTrackingItem', { listId, itemId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              {filter === 'pending' ? 'No tienes productos pendientes' :
               filter === 'stocked' ? 'No tienes productos en stock' :
               'No hay productos en esta lista'}
            </Text>
          </View>
        }
      />

      {/* Purchase Confirmation Modal */}
      <PurchaseConfirmModal
        visible={purchaseModalVisible}
        item={purchaseItem}
        accounts={accounts}
        categories={budgetInfo?.categoryId ? [] : categories}
        linkedCategoryName={budgetInfo?.categoryName}
        selectedAccountId={selectedAccountId}
        selectedCategoryId={selectedCategoryId}
        onSelectAccount={setSelectedAccountId}
        onSelectCategory={setSelectedCategoryId}
        onConfirm={handleConfirmPurchase}
        onCancel={() => { setPurchaseModalVisible(false); setPurchaseItem(null); }}
        loading={purchaseLoading}
      />
    </>
  );
}

// ─── Purchase Confirm Modal ──────────────────────────────────────────────────

function PurchaseConfirmModal({
  visible,
  item,
  accounts,
  categories,
  linkedCategoryName,
  selectedAccountId,
  selectedCategoryId,
  onSelectAccount,
  onSelectCategory,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  item: TrackingItem | null;
  accounts: Account[];
  categories: CategoryOption[];
  linkedCategoryName?: string;
  selectedAccountId: string | null;
  selectedCategoryId: string | null;
  onSelectAccount: (id: string) => void;
  onSelectCategory: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';

  if (!item) return null;

  return (
    <BottomModal
      visible={visible}
      title="Registrar compra"
      subtitle={`${item.name} — ${formatAmount(item.price)}`}
      onClose={onCancel}
    >
      <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
        {/* Account selector */}
        <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>¿De qué cuenta sale?</Text>
        <View style={styles.modalOptions}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.modalOption,
                { borderColor: themeColors.border },
                selectedAccountId === acc.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' },
              ]}
              onPress={() => onSelectAccount(acc.id)}
            >
              <Ionicons
                name={selectedAccountId === acc.id ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={selectedAccountId === acc.id ? themeColors.primary : themeColors.textTertiary}
              />
              <View style={styles.modalOptionInfo}>
                <Text style={[styles.modalOptionName, { color: themeColors.textPrimary }]}>{acc.name}</Text>
                <Text style={[styles.modalOptionMeta, { color: themeColors.textTertiary }]}>
                  {formatAmount(acc.balance)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category - auto from budget or selector */}
        {linkedCategoryName ? (
          <View style={[styles.modalCategoryAuto, { backgroundColor: themeColors.primary + '10' }]}>
            <Ionicons name="pie-chart" size={14} color={themeColors.primary} />
            <Text style={[styles.modalCategoryAutoText, { color: themeColors.primary }]}>
              Categoría: {linkedCategoryName} (del presupuesto)
            </Text>
          </View>
        ) : categories.length > 0 ? (
          <>
            <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>Categoría</Text>
            <View style={styles.modalOptions}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.modalOption,
                    { borderColor: themeColors.border },
                    selectedCategoryId === cat.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' },
                  ]}
                  onPress={() => onSelectCategory(cat.id)}
                >
                  <Ionicons
                    name={selectedCategoryId === cat.id ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selectedCategoryId === cat.id ? themeColors.primary : themeColors.textTertiary}
                  />
                  <Text style={[styles.modalOptionName, { color: themeColors.textPrimary }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.modalConfirmBtn, { backgroundColor: themeColors.greenEarns, ...neuShadow(scheme, 'raised') }, loading && { opacity: 0.6 }]}
        onPress={onConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.modalConfirmText}>✓ Registrar compra</Text>
        )}
      </TouchableOpacity>
    </BottomModal>
  );
}

// ─── Budget Info Card ────────────────────────────────────────────────────────

function BudgetInfoCard({ budgetInfo, monthlyEstimate }: { budgetInfo: LinkedBudgetInfo; monthlyEstimate: number }) {
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const remaining = budgetInfo.monthlyLimit - budgetInfo.spent;
  const monthlyEstimateRounded = Math.round(monthlyEstimate);

  // Porcentaje del estimado mensual vs límite del presupuesto
  const estimateVsLimit = budgetInfo.monthlyLimit > 0
    ? (monthlyEstimateRounded / budgetInfo.monthlyLimit) * 100
    : 0;

  const barWidth = Math.min(100, budgetInfo.percentage);

  const barColor = budgetInfo.percentage >= 100
    ? themeColors.redExpenses
    : budgetInfo.percentage >= 75
      ? themeColors.tertiary
      : themeColors.greenEarns;

  const estimateFits = monthlyEstimateRounded <= budgetInfo.monthlyLimit;

  return (
    <View style={[styles.budgetCard, { backgroundColor: themeColors.cardBackground, ...neuSurface(scheme, 'raised') }]}>
      <View style={styles.budgetCardHeader}>
        <Ionicons name="pie-chart" size={18} color={themeColors.primary} />
        <Text style={[styles.budgetCardTitle, { color: themeColors.textPrimary }]}>
          Presupuesto: {budgetInfo.categoryName}
        </Text>
      </View>

      {/* Gasto actual del mes */}
      <View style={styles.budgetBarContainer}>
        <View style={[styles.budgetBarBg, neuProgress(scheme)]}>
          <View style={[styles.budgetBarFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.budgetBarPercent, { color: barColor }]}>
          {budgetInfo.percentage.toFixed(0)}%
        </Text>
      </View>

      <View style={styles.budgetStats}>
        <View style={styles.budgetStatItem}>
          <Text style={[styles.budgetStatLabel, { color: themeColors.textTertiary }]}>Gastado</Text>
          <Text style={[styles.budgetStatValue, { color: themeColors.textPrimary }]}>
            {formatAmount(budgetInfo.spent)}
          </Text>
        </View>
        <View style={styles.budgetStatItem}>
          <Text style={[styles.budgetStatLabel, { color: themeColors.textTertiary }]}>Límite</Text>
          <Text style={[styles.budgetStatValue, { color: themeColors.textPrimary }]}>
            {formatAmount(budgetInfo.monthlyLimit)}
          </Text>
        </View>
        <View style={styles.budgetStatItem}>
          <Text style={[styles.budgetStatLabel, { color: themeColors.textTertiary }]}>Disponible</Text>
          <Text style={[styles.budgetStatValue, { color: remaining >= 0 ? themeColors.greenEarns : themeColors.redExpenses }]}>
            {formatAmount(Math.max(0, remaining))}
          </Text>
        </View>
      </View>

      {/* Estimado mensual de la lista */}
      {monthlyEstimateRounded > 0 && (
        <View style={[
          styles.budgetWarning,
          { backgroundColor: estimateFits ? themeColors.greenEarns + '10' : themeColors.redExpenses + '10' },
        ]}>
          <Ionicons
            name={estimateFits ? 'checkmark-circle' : 'warning'}
            size={16}
            color={estimateFits ? themeColors.greenEarns : themeColors.redExpenses}
          />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.budgetWarningText,
              { color: estimateFits ? themeColors.greenEarns : themeColors.redExpenses },
            ]}>
              Gasto mensual estimado: {formatAmount(monthlyEstimateRounded)}
            </Text>
            <Text style={[styles.budgetWarningSubtext, { color: themeColors.textTertiary }]}>
              {estimateFits
                ? `Cabe en tu presupuesto (${estimateVsLimit.toFixed(0)}% del límite)`
                : `Excede tu presupuesto por ${formatAmount(monthlyEstimateRounded - budgetInfo.monthlyLimit)}`}
            </Text>
          </View>
        </View>
      )}

      {monthlyEstimateRounded === 0 && (
        <View style={[styles.budgetWarning, { backgroundColor: themeColors.primary + '08' }]}>
          <Ionicons name="information-circle-outline" size={16} color={themeColors.textTertiary} />
          <Text style={[styles.budgetWarningText, { color: themeColors.textTertiary }]}>
            Agrega duración promedio a tus productos para calcular el gasto mensual estimado.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Item Card ───────────────────────────────────────────────────────────────

function TrackingItemCard({
  item,
  onToggle,
  onMarkPurchased,
  onDelete,
  onEdit,
}: {
  item: TrackingItem;
  onToggle: () => void;
  onMarkPurchased: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const nextPurchase = getDaysUntilNextPurchase(item);

  return (
    <View style={[styles.itemCard, { backgroundColor: themeColors.cardBackground, ...neuSurface(scheme, 'flat') }, item.needsToBuy && styles.itemCardPending]}>
      <View style={styles.itemCardMain}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            { borderColor: themeColors.border },
            item.needsToBuy && { borderColor: themeColors.tertiary, backgroundColor: themeColors.tertiary + '20' },
          ]}
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.needsToBuy }}
          accessibilityLabel={`Marcar ${item.name} como ${item.needsToBuy ? 'en stock' : 'por comprar'}`}
        >
          {item.needsToBuy && (
            <Ionicons name="cart" size={14} color={themeColors.tertiary} />
          )}
        </TouchableOpacity>

        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.itemMeta}>
            <Text style={[styles.itemPrice, { color: themeColors.primary }]}>
              {formatAmount(item.price)}
            </Text>
            {item.lastPurchaseDate && (
              <Text style={[styles.itemDate, { color: themeColors.textTertiary }]}>
                Comprado: {formatDate(item.lastPurchaseDate)}
              </Text>
            )}
          </View>
          {item.averageDurationDays && (
            <Text style={[styles.itemDuration, { color: themeColors.textTertiary }]}>
              Dura ~{item.averageDurationDays} días
            </Text>
          )}
          {nextPurchase && (
            <Text style={[
              styles.itemNextPurchase,
              { color: nextPurchase.isOverdue ? themeColors.redExpenses : themeColors.greenEarns },
            ]}>
              {nextPurchase.isOverdue
                ? `⚠️ Vencido hace ${nextPurchase.days} día${nextPurchase.days !== 1 ? 's' : ''}`
                : `🔄 Próxima compra en ${nextPurchase.days} día${nextPurchase.days !== 1 ? 's' : ''}`}
            </Text>
          )}
          {item.notes && (
            <Text style={[styles.itemNotes, { color: themeColors.textTertiary }]} numberOfLines={1}>
              💬 {item.notes}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.itemActions}>
        {item.needsToBuy && (
          <TouchableOpacity
            style={[styles.itemActionBtn, { backgroundColor: themeColors.greenEarns + '15' }]}
            onPress={onMarkPurchased}
            accessibilityLabel="Marcar como comprado"
          >
            <Ionicons name="checkmark-circle" size={18} color={themeColors.greenEarns} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.itemActionBtn, { backgroundColor: themeColors.primary + '10' }]}
          onPress={onEdit}
          accessibilityLabel="Editar producto"
        >
          <Ionicons name="pencil" size={16} color={themeColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.itemActionBtn, { backgroundColor: themeColors.redExpenses + '10' }]}
          onPress={onDelete}
          accessibilityLabel="Eliminar producto"
        >
          <Ionicons name="trash" size={16} color={themeColors.redExpenses} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // List header
  listHeader: { borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  listHeaderIcon: { fontSize: 36, marginBottom: 8 },
  listHeaderName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  listHeaderDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  listHeaderStats: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  listHeaderStat: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  listHeaderStatDivider: { color: 'rgba(255,255,255,0.5)' },

  // Budget card
  budgetCard: { borderRadius: 14, padding: 16, marginBottom: 16 },
  budgetCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  budgetCardTitle: { fontSize: 15, fontWeight: '600' },
  budgetBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  budgetBarBg: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 5 },
  budgetBarPercent: { fontSize: 13, fontWeight: '700', minWidth: 38, textAlign: 'right' },
  budgetStats: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetStatItem: { alignItems: 'center' },
  budgetStatLabel: { fontSize: 11, marginBottom: 2 },
  budgetStatValue: { fontSize: 14, fontWeight: '600' },
  budgetWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, borderRadius: 10 },
  budgetWarningText: { fontSize: 12, fontWeight: '500', flex: 1 },
  budgetWarningSubtext: { fontSize: 11, marginTop: 2 },

  // Actions
  actionsRow: { flexDirection: 'row', marginBottom: 12, gap: 10 },
  addItemButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addItemButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  editListButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  editListButtonText: { fontSize: 14, fontWeight: '500' },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  filterChipText: { fontSize: 13, fontWeight: '500' },

  // Item card
  itemCard: { borderRadius: 12, padding: 14, marginBottom: 10 },
  itemCardPending: { borderLeftWidth: 3, borderLeftColor: '#F1632A' },
  itemCardMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: '600' },
  itemDate: { fontSize: 12 },
  itemDuration: { fontSize: 12, marginTop: 2 },
  itemNextPurchase: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  itemNotes: { fontSize: 12, marginTop: 3, fontStyle: 'italic' },

  // Item actions
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' },
  itemActionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15 },

  // Purchase modal
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  modalOptions: { gap: 8, marginBottom: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5 },
  modalOptionInfo: { flex: 1 },
  modalOptionName: { fontSize: 14, fontWeight: '500' },
  modalOptionMeta: { fontSize: 12, marginTop: 1 },
  modalCategoryAuto: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 16 },
  modalCategoryAutoText: { fontSize: 13, fontWeight: '500', flex: 1 },
  modalConfirmBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
