import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  ActivityIndicator,
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
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DebtService } from '@/services/debts';
import type { Debt } from '@/services/debts';
import type { MainStackParamList } from '@/navigation/types';

type NavProp = NativeStackNavigationProp<MainStackParamList>;
type RoutePropType = RouteProp<MainStackParamList, 'SingleInstallmentDebts'>;

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SingleInstallmentDebtsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const debtService = useMemo(() => new DebtService(), []);

  const { linkedAccountId, cardName } = route.params;

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const allDebts = await debtService.getAll();
      // Filter: credit_card, same linkedAccountId, 1 installment, active
      const filtered = allDebts.filter(
        (d) =>
          d.category === 'credit_card' &&
          d.linkedAccountId === linkedAccountId &&
          d.totalInstallments === 1 &&
          d.status === 'active'
      );
      setDebts(filtered);
    } catch (error) {
      console.error('Error loading single installment debts:', error);
    } finally {
      setLoading(false);
    }
  }, [debtService, linkedAccountId]);

  useFocusEffect(useCallback(() => { loadDebts(); }, [loadDebts]));

  const totalAmount = useMemo(
    () => debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
    [debts]
  );
  const provisionedAmount = useMemo(
    () => debts.filter((d) => d.isProvisioned).reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
    [debts]
  );
  const unprovisionedAmount = totalAmount - provisionedAmount;

  const handleToggleProvisioned = async (debtId: string, current: boolean) => {
    try {
      await debtService.update(debtId, { isProvisioned: !current });
      setDebts((prev) =>
        prev.map((d) => (d.id === debtId ? { ...d, isProvisioned: !current } : d))
      );
    } catch (error) {
      console.error('Error toggling provisioned:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: 700, width: '100%', alignSelf: 'center' },
      ]}
    >
      {/* Header */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        🧾 Gastos individuales
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {cardName}
      </Text>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Total pendiente</Text>
            <Text style={[styles.summaryValue, { color: colors.redExpenses }]}>
              {formatAmount(totalAmount)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Sin separar</Text>
            <Text style={[styles.summaryValue, { color: colors.redExpenses }]}>
              {formatAmount(unprovisionedAmount)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Ya separado</Text>
            <Text style={[styles.summaryValue, { color: '#2EAD5D' }]}>
              {formatAmount(provisionedAmount)}
            </Text>
          </View>
        </View>
      </View>

      {/* Info text */}
      <Text style={[styles.infoText, { color: colors.textTertiary }]}>
        Marca los gastos para los que ya separaste el dinero. Estos no sumarán al total que debes.
      </Text>

      {/* Debt list */}
      {debts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No hay gastos registrados en esta tarjeta.
        </Text>
      ) : (
        debts.map((debt) => {
          const remaining = debt.totalAmount - debt.paidAmount;
          return (
            <View
              key={debt.id}
              style={[
                styles.debtItem,
                { backgroundColor: colors.cardBackground },
                debt.isProvisioned && styles.debtItemProvisioned,
              ]}
            >
              <TouchableOpacity
                style={styles.debtItemContent}
                onPress={() => navigation.navigate('DebtDetail', { debtId: debt.id })}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalle de ${debt.name}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.debtName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {debt.name}
                  </Text>
                  {debt.description && (
                    <Text style={[styles.debtDescription, { color: colors.textTertiary }]} numberOfLines={1}>
                      {debt.description}
                    </Text>
                  )}
                </View>
                <Text style={[styles.debtAmount, { color: debt.isProvisioned ? '#2EAD5D' : colors.redExpenses }]}>
                  {formatAmount(remaining)}
                </Text>
              </TouchableOpacity>

              {/* Provisioned toggle */}
              <TouchableOpacity
                style={[
                  styles.provisionedBtn,
                  { borderColor: colors.border },
                  debt.isProvisioned && styles.provisionedBtnActive,
                ]}
                onPress={() => handleToggleProvisioned(debt.id, debt.isProvisioned)}
                accessibilityRole="switch"
                accessibilityState={{ checked: debt.isProvisioned }}
                accessibilityLabel={debt.isProvisioned ? 'Desmarcar dinero separado' : 'Marcar dinero separado'}
              >
                <Text style={styles.provisionedBtnText}>
                  {debt.isProvisioned ? '✅ Separado' : '💰 Separar'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },

  // Summary
  summaryCard: { borderRadius: 14, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 36 },
  summaryLabel: { fontSize: 11, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700' },

  infoText: { fontSize: 12, marginBottom: 16, lineHeight: 18 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 32 },

  // Debt item
  debtItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  debtItemProvisioned: {
    borderWidth: 1,
    borderColor: '#2EAD5D40',
  },
  debtItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  debtName: { fontSize: 15, fontWeight: '600' },
  debtDescription: { fontSize: 12, marginTop: 2 },
  debtAmount: { fontSize: 16, fontWeight: '700', marginLeft: 12 },

  // Provisioned button
  provisionedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  provisionedBtnActive: {
    borderColor: '#2EAD5D',
    backgroundColor: '#2EAD5D10',
  },
  provisionedBtnText: { fontSize: 13, fontWeight: '600', color: '#2EAD5D' },
});
