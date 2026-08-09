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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DebtService } from '@/services/debts';
import type { Debt, DebtCategory, DebtSummary } from '@/services/debts';
import type { MainStackParamList } from '@/navigation/types';

type DebtsNavProp = NativeStackNavigationProp<MainStackParamList>;

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const CATEGORY_CONFIG: Record<DebtCategory, { label: string; icon: string; color: string }> = {
  credit_card: { label: 'Tarjetas de Crédito', icon: '💳', color: '#007DC3' },
  installment: { label: 'Deudas en Cuotas', icon: '📋', color: '#F1632A' },
  personal: { label: 'Cuentas Personales', icon: '🤝', color: '#2EAD5D' },
};

export function DebtsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<DebtsNavProp>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const debtService = useMemo(() => new DebtService(), []);

  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<DebtCategory, boolean>>({
    credit_card: true,
    installment: true,
    personal: true,
  });

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const [allDebts, debtSummary] = await Promise.all([
        debtService.getAll(),
        debtService.getSummary(),
      ]);
      setDebts(allDebts);
      setSummary(debtSummary);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
    }
  }, [debtService]);

  useFocusEffect(useCallback(() => { loadDebts(); }, [loadDebts]));

  const activeDebts = useMemo(() => debts.filter((d) => d.status === 'active'), [debts]);
  const paidDebts = useMemo(() => debts.filter((d) => d.status === 'paid_off'), [debts]);

  const debtsByCategory = useMemo(() => {
    const grouped: Record<DebtCategory, Debt[]> = { credit_card: [], installment: [], personal: [] };
    for (const debt of activeDebts) {
      grouped[debt.category].push(debt);
    }
    return grouped;
  }, [activeDebts]);

  const toggleSection = (cat: DebtCategory) => {
    setExpandedSections((prev) => ({ ...prev, [cat]: !prev[cat] }));
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
        isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>📊 Mis Deudas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddDebt')}
          accessibilityRole="button"
          accessibilityLabel="Agregar nueva deuda"
        >
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      {summary && (
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Yo debo</Text>
              <Text style={styles.summaryAmount}>{formatAmount(summary.totalIOwe)}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Me deben</Text>
              <Text style={[styles.summaryAmount, { color: '#A8F0C0' }]}>{formatAmount(summary.totalTheyOweMe)}</Text>
            </View>
          </View>
          <View style={styles.summaryBreakdown}>
            <Text style={styles.summaryBreakdownText}>
              💳 {formatAmount(summary.creditCardDebt)}  •  📋 {formatAmount(summary.installmentDebt)}  •  🤝 {formatAmount(summary.personalDebt)}
            </Text>
          </View>
        </View>
      )}

      {/* Debt Sections */}
      {(['credit_card', 'installment', 'personal'] as DebtCategory[]).map((category) => {
        const config = CATEGORY_CONFIG[category];
        const categoryDebts = debtsByCategory[category];
        const isExpanded = expandedSections[category];

        // For credit cards, group by linkedAccountId
        let groupedCCDebts: Record<string, Debt[]> | null = null;
        if (category === 'credit_card' && categoryDebts.length > 0) {
          groupedCCDebts = {};
          for (const debt of categoryDebts) {
            const key = debt.linkedAccountId || debt.id;
            if (!groupedCCDebts[key]) groupedCCDebts[key] = [];
            groupedCCDebts[key].push(debt);
          }
        }

        return (
          <View key={category} style={styles.sectionContainer}>
            <TouchableOpacity
              style={[styles.sectionHeader, { backgroundColor: colors.cardBackground }]}
              onPress={() => toggleSection(category)}
              accessibilityRole="button"
              accessibilityLabel={`${isExpanded ? 'Colapsar' : 'Expandir'} sección ${config.label}`}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionIcon}>{config.icon}</Text>
                <Text style={[styles.sectionName, { color: colors.textPrimary }]}>{config.label}</Text>
                <View style={[styles.countBadge, { backgroundColor: config.color + '20' }]}>
                  <Text style={[styles.countText, { color: config.color }]}>{categoryDebts.length}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, { color: colors.textTertiary }]}>{isExpanded ? '▾' : '▸'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.sectionBody}>
                {categoryDebts.length === 0 ? (
                  <Text style={[styles.emptySection, { color: colors.textTertiary }]}>
                    No hay {category === 'personal' ? 'cuentas personales' : 'deudas'} registradas
                  </Text>
                ) : category === 'credit_card' && groupedCCDebts ? (
                  // Render credit card debts grouped by card
                  Object.entries(groupedCCDebts).map(([accountId, debtsGroup]) => {
                    const mainDebt = debtsGroup.find((d) => !d.totalInstallments);
                    const installmentDebts = debtsGroup.filter((d) => !!d.totalInstallments);
                    const cardName = mainDebt?.name || installmentDebts[0]?.name?.split(' (')[0] || 'Tarjeta';

                    return (
                      <View key={accountId} style={[styles.ccGroup, { borderLeftColor: config.color }]}>
                        {/* Card header / main debt */}
                        {mainDebt ? (
                          <DebtCard
                            key={mainDebt.id}
                            debt={mainDebt}
                            onPress={() => navigation.navigate('DebtDetail', { debtId: mainDebt.id })}
                          />
                        ) : (
                          <Text style={[styles.ccGroupTitle, { color: colors.textPrimary }]}>
                            {cardName}
                          </Text>
                        )}
                        {/* Installment debts under this card */}
                        {installmentDebts.map((debt) => (
                          <DebtCard
                            key={debt.id}
                            debt={debt}
                            onPress={() => navigation.navigate('DebtDetail', { debtId: debt.id })}
                          />
                        ))}
                      </View>
                    );
                  })
                ) : (
                  categoryDebts.map((debt) => (
                    <DebtCard
                      key={debt.id}
                      debt={debt}
                      onPress={() => navigation.navigate('DebtDetail', { debtId: debt.id })}
                    />
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Paid off section */}
      {paidDebts.length > 0 && (
        <View style={styles.paidSection}>
          <Text style={[styles.paidTitle, { color: colors.textSecondary }]}>
            ✅ Pagadas ({paidDebts.length})
          </Text>
          {paidDebts.map((debt) => (
            <View key={debt.id} style={[styles.paidItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.paidName, { color: colors.textTertiary }]}>{debt.name}</Text>
              <Text style={[styles.paidAmount, { color: colors.textTertiary }]}>{formatAmount(debt.totalAmount)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Debt Card ───────────────────────────────────────────────────────────────

function DebtCard({ debt, onPress }: { debt: Debt; onPress: () => void }) {
  const colors = useThemeColors();
  const remaining = debt.totalAmount - debt.paidAmount;
  const progress = debt.totalAmount > 0 ? (debt.paidAmount / debt.totalAmount) * 100 : 0;
  const isReceivable = debt.direction === 'they_owe_me';

  return (
    <TouchableOpacity
      style={[styles.debtCard, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Deuda ${debt.name}, pendiente ${formatAmount(remaining)}`}
    >
      <View style={styles.debtCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.debtName, { color: colors.textPrimary }]} numberOfLines={1}>
            {debt.name}
          </Text>
          {debt.counterparty && (
            <Text style={[styles.debtCounterparty, { color: colors.textTertiary }]}>
              {isReceivable ? 'Debe:' : 'A:'} {debt.counterparty}
            </Text>
          )}
        </View>
        <View style={styles.debtAmountCol}>
          <Text style={[styles.debtRemaining, { color: isReceivable ? colors.greenEarns : colors.redExpenses }]}>
            {isReceivable ? '+' : '-'}{formatAmount(remaining)}
          </Text>
          <Text style={[styles.debtTotal, { color: colors.textTertiary }]}>
            de {formatAmount(debt.totalAmount)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(100, progress)}%`, backgroundColor: isReceivable ? colors.greenEarns : colors.primary },
          ]}
        />
      </View>

      {/* Footer info */}
      <View style={styles.debtCardFooter}>
        {debt.totalInstallments ? (
          <Text style={[styles.debtMeta, { color: colors.textSecondary }]}>
            Cuota {debt.paidInstallments ?? 0}/{debt.totalInstallments}
            {debt.installmentAmount ? ` • ${formatAmount(debt.installmentAmount)}/cuota` : ''}
          </Text>
        ) : (
          <Text style={[styles.debtMeta, { color: colors.textSecondary }]}>
            {progress.toFixed(0)}% pagado
          </Text>
        )}
        <Text style={[styles.debtDirection, { color: colors.textTertiary }]}>
          {isReceivable ? '↙️ Me deben' : '↗️ Yo debo'}
        </Text>
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
  addButton: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Summary
  summaryCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 40 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  summaryAmount: { fontSize: 22, fontWeight: '700', color: '#fff' },
  summaryBreakdown: { marginTop: 16, alignItems: 'center' },
  summaryBreakdownText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  // Sections
  sectionContainer: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { fontSize: 18 },
  sectionName: { fontSize: 16, fontWeight: '600' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '600' },
  chevron: { fontSize: 16 },
  sectionBody: { paddingTop: 8 },
  emptySection: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  // Credit card grouping
  ccGroup: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 8 },
  ccGroupTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, paddingTop: 4 },

  // Debt Card
  debtCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  debtCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  debtName: { fontSize: 15, fontWeight: '600' },
  debtCounterparty: { fontSize: 12, marginTop: 2 },
  debtAmountCol: { alignItems: 'flex-end' },
  debtRemaining: { fontSize: 16, fontWeight: '700' },
  debtTotal: { fontSize: 11, marginTop: 2 },

  // Progress
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressBarFill: { height: '100%', borderRadius: 3 },

  // Footer
  debtCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  debtMeta: { fontSize: 12 },
  debtDirection: { fontSize: 11 },

  // Paid section
  paidSection: { marginTop: 24 },
  paidTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  paidItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  paidName: { fontSize: 14, textDecorationLine: 'line-through' },
  paidAmount: { fontSize: 14 },
});
