import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow } from '@/lib/neumorphic';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { TrackingService } from '@/services/tracking';
import type { TrackingList } from '@/services/tracking';
import type { MainStackParamList } from '@/navigation/types';
import { ScreenTourModal, type TourSlide } from '@/components/ScreenTourModal';
import { useScreenTour } from '@/hooks/useScreenTour';

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function TrackingScreen() {
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const trackingService = useMemo(() => new TrackingService(), []);

  const { visible: tourVisible, openTour, closeTour } = useScreenTour('tracking');

  const TOUR_SLIDES: TourSlide[] = [
    {
      emoji: '📦',
      title: 'Seguimiento de productos',
      description: 'Crea listas para rastrear productos y compras recurrentes. Cada lista muestra cuántos productos tiene y cuántos faltan por comprar.',
    },
    {
      emoji: '📊',
      title: 'Resumen general',
      description: 'La tarjeta superior resume tus listas, productos totales y pendientes por comprar, para que sepas de un vistazo cómo va todo.',
    },
    {
      emoji: '🔗',
      title: 'Vinculación con presupuesto',
      description: 'Una lista puede vincularse a un presupuesto. Cuando marcas productos como comprados, el gasto se registra en la categoría correspondiente.',
    },
    {
      emoji: '➕',
      title: 'Nueva lista',
      description: 'Presiona "+ Nueva lista" para crear una. Agrega productos, defínelos como comprados o pendientes, y relaciónala con un presupuesto si quieres.',
    },
  ];

  const [lists, setLists] = useState<TrackingList[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trackingService.getAllLists();
      setLists(data);
    } catch (error) {
      console.error('Error loading tracking lists:', error);
    } finally {
      setLoading(false);
    }
  }, [trackingService]);

  useFocusEffect(useCallback(() => { loadLists(); }, [loadLists]));

  const totalItems = lists.reduce((sum, l) => sum + l.itemCount, 0);
  const totalPending = lists.reduce((sum, l) => sum + l.pendingCount, 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <FlatList
      style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
      ]}
      data={lists}
      keyExtractor={(item) => item.id}
      numColumns={isDesktop ? 2 : 1}
      key={isDesktop ? 'desktop-2col' : 'mobile-1col'}
      columnWrapperStyle={isDesktop ? { gap: 16 } : undefined}
      ListHeaderComponent={
        <View>
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>📦 Seguimiento</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: themeColors.primary }, neuShadow(scheme, 'raised')]}
              onPress={() => navigation.navigate('AddTrackingList')}
            >
              <Text style={styles.addButtonText}>+ Nueva lista</Text>
            </TouchableOpacity>
          </View>

          {/* Summary */}
          {lists.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: themeColors.primary }, neuShadow(scheme, 'raised')]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{lists.length}</Text>
                  <Text style={styles.summaryLabel}>Lista{lists.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{totalItems}</Text>
                  <Text style={styles.summaryLabel}>Producto{totalItems !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{totalPending}</Text>
                  <Text style={styles.summaryLabel}>Por comprar</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <TrackingListCard
          list={item}
          onPress={() => navigation.navigate('TrackingListDetail', { listId: item.id })}
          isDesktop={isDesktop}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            No tienes listas de seguimiento
          </Text>
          <Text style={[styles.emptySubtext, { color: themeColors.textTertiary }]}>
            Crea una lista para empezar a hacer seguimiento de tus productos y compras recurrentes.
          </Text>
        </View>
      }
    />
    <ScreenTourModal visible={tourVisible} slides={TOUR_SLIDES} onClose={closeTour} />
    </View>
  );
}

// ─── List Card ───────────────────────────────────────────────────────────────

function TrackingListCard({ list, onPress, isDesktop }: { list: TrackingList; onPress: () => void; isDesktop?: boolean }) {
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';

  return (
    <TouchableOpacity
      style={[neuSurface(scheme, 'raised'), styles.listCard, isDesktop && { flex: 1 }]}
      onPress={onPress}
    >
      <View style={styles.listCardHeader}>
        <View style={[styles.listIconContainer, { backgroundColor: list.color + '20' }]}>
          <Text style={styles.listIcon}>{list.icon}</Text>
        </View>
        <View style={styles.listCardInfo}>
          <Text style={[styles.listName, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {list.name}
          </Text>
          {list.description ? (
            <Text style={[styles.listDescription, { color: themeColors.textTertiary }]} numberOfLines={1}>
              {list.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={themeColors.textTertiary} />
      </View>

      <View style={[styles.listCardFooter, { borderTopColor: themeColors.borderInset }]}>
        <View style={styles.listStat}>
          <Ionicons name="cube-outline" size={14} color={themeColors.textSecondary} />
          <Text style={[styles.listStatText, { color: themeColors.textSecondary }]}>
            {list.itemCount} producto{list.itemCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.listCardBadges}>
          {list.linkedBudgetId && (
            <View style={[styles.budgetBadge, { backgroundColor: themeColors.primary + '15' }]}>
              <Ionicons name="pie-chart" size={12} color={themeColors.primary} />
              <Text style={[styles.budgetBadgeText, { color: themeColors.primary }]}>Presupuesto</Text>
            </View>
          )}
          {list.pendingCount > 0 && (
            <View style={[styles.pendingBadge, { backgroundColor: themeColors.tertiary + '20' }]}>
              <Text style={[styles.pendingBadgeText, { color: themeColors.tertiary }]}>
                {list.pendingCount} por comprar
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  addButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Summary
  summaryCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNumber: { fontSize: 24, fontWeight: '700', color: '#fff' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },

  // List card
  listCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  listCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listIcon: { fontSize: 22 },
  listCardInfo: { flex: 1 },
  listName: { fontSize: 16, fontWeight: '600' },
  listDescription: { fontSize: 13, marginTop: 2 },
  listCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  listStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listStatText: { fontSize: 13 },
  pendingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingBadgeText: { fontSize: 12, fontWeight: '600' },
  listCardBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  budgetBadgeText: { fontSize: 11, fontWeight: '600' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, marginBottom: 4 },
  emptySubtext: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
