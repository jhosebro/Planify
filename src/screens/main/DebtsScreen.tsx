import React, { useCallback, useMemo, useRef, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuProgress } from '@/lib/neumorphic';
import {
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
import { DebtService, summarizeDebts } from '@/services/debts';
import { AccountService } from '@/services/accounts/accountService';
import type { Debt, DebtCategory, DebtSummary } from '@/services/debts';
import type { MainStackParamList } from '@/navigation/types';
import { ScreenTourModal, type TourSlide } from '@/components/ScreenTourModal';
import { useScreenTour } from '@/hooks/useScreenTour';
import { AppIcon, type IconName } from '@/components/AppIcon';
import { ScreenSkeleton } from '@/components/Skeleton';

type DebtsNavProp = NativeStackNavigationProp<MainStackParamList>;

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDate(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const CATEGORY_SINGULAR: Record<DebtCategory, string> = {
  credit_card: 'Tarjeta de crédito',
  installment: 'Deuda en cuotas',
  personal: 'Cuenta personal',
};

const CATEGORY_CONFIG: Record<DebtCategory, { label: string; icon: IconName; color: string }> = {
  credit_card: { label: 'Tarjetas de Crédito', icon: 'credit-card', color: '#007DC3' },
  installment: { label: 'Deudas en Cuotas', icon: 'clipboard-list', color: '#F1632A' },
  personal: { label: 'Cuentas Personales', icon: 'handshake', color: '#2EAD5D' },
};

export function DebtsScreen() {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<DebtsNavProp>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const debtService = useMemo(() => new DebtService(), []);
  const accountService = useMemo(() => new AccountService(), []);

  const { visible: tourVisible, closeTour } = useScreenTour('debts');

  const TOUR_SLIDES: TourSlide[] = [
    {
      icon: 'credit-card',
      title: 'Control de deudas',
      description: 'Gestiona tus tarjetas de crédito, deudas en cuotas y cuentas personales (lo que debes y lo que te deben) en un solo lugar.',
    },
    {
      icon: 'clipboard-list',
      title: 'Tipos de deuda',
      description: 'Tarjetas de crédito registran tus compras y cuotas pendientes. Deudas en cuotas rastrean pagos mensuales. Cuentas personales llevan el saldo entre personas.',
    },
    {
      icon: 'chart-bar',
      title: 'Resumen total',
      description: 'La tarjeta superior muestra el total que debes y el total que te deben, para tener siempre clara tu posición financiera neta.',
    },
    {
      icon: 'plus',
      title: 'Agregar deuda',
      description: 'Presiona "+ Nueva Deuda" para registrar una tarjeta, una compra en cuotas o una cuenta personal. Puedes editar y eliminar en cualquier momento.',
    },
  ];

  const [debts, setDebts] = useState<Debt[]>([]);
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [expandedSections, setExpandedSections] = useState<Record<DebtCategory, boolean>>({
    credit_card: true,
    installment: true,
    personal: true,
  });
  const [showPaid, setShowPaid] = useState(false);

  const loadDebts = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    try {
      // getAll incluye archivadas para que tarjetas viejas sigan mostrando su nombre
      const [allDebts, accounts] = await Promise.all([
        debtService.getAll(),
        accountService.getAll().catch(() => []),
      ]);
      setDebts(allDebts);
      setAccountNames(Object.fromEntries(accounts.map((a) => [a.id, a.name])));
      setSummary(summarizeDebts(allDebts));
      hasLoaded.current = true;
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
    }
  }, [debtService, accountService]);

  useFocusEffect(useCallback(() => { loadDebts(); }, [loadDebts]));

  const activeDebts = useMemo(() => debts.filter((d) => d.status === 'active'), [debts]);
  const paidDebts = useMemo(
    () =>
      debts
        .filter((d) => d.status === 'paid_off')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [debts]
  );
  const paidTotal = useMemo(() => paidDebts.reduce((sum, debt) => sum + debt.totalAmount, 0), [paidDebts]);

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
    return <ScreenSkeleton variant="summary" rows={3} />;
  }

  return (
  <View style={{ flex: 1 }}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}
          onPress={() => navigation.navigate('AddDebt')}
          accessibilityRole="button"
          accessibilityLabel="Agregar nueva deuda"
        >
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      {summary && (
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}>
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
            <View style={styles.summaryBreakdownItem}>
              <AppIcon name="credit-card" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryBreakdownText}>{formatAmount(summary.creditCardDebt)}</Text>
            </View>
            <View style={styles.summaryBreakdownItem}>
              <AppIcon name="clipboard-list" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryBreakdownText}>{formatAmount(summary.installmentDebt)}</Text>
            </View>
            <View style={styles.summaryBreakdownItem}>
              <AppIcon name="handshake" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryBreakdownText}>{formatAmount(summary.personalDebt)}</Text>
            </View>
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
              style={[neuSurface(scheme, 'flat'), styles.sectionHeader]}
              onPress={() => toggleSection(category)}
              accessibilityRole="button"
              accessibilityLabel={`${isExpanded ? 'Colapsar' : 'Expandir'} sección ${config.label}`}
            >
              <View style={styles.sectionHeaderLeft}>
                <AppIcon name={config.icon} size={18} color={config.color} />
                <Text style={[styles.sectionName, { color: colors.textPrimary }]}>{config.label}</Text>
                <View style={[styles.countBadge, { backgroundColor: config.color + '20' }]}>
                  <Text style={[styles.countText, { color: config.color }]}>{categoryDebts.length}</Text>
                </View>
              </View>
              <AppIcon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={16} color={colors.textTertiary} />
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
                    // mainDebt = the general card balance (no installments at all)
                    const mainDebt = debtsGroup.find((d) => !d.totalInstallments);
                    // singleInstallmentDebts = purchases marked as 1 cuota (dinero separado flow)
                    const singleInstallmentDebts = debtsGroup.filter((d) => d.totalInstallments === 1);
                    // multiInstallmentDebts = real installment purchases (2+ cuotas)
                    const multiInstallmentDebts = debtsGroup.filter((d) => !!d.totalInstallments && d.totalInstallments > 1);
                    const cardName = accountNames[accountId] || mainDebt?.name || multiInstallmentDebts[0]?.name?.split(' (')[0] || singleInstallmentDebts[0]?.name?.split(' (')[0] || 'Tarjeta';

                    return (
                      <View key={accountId} style={[styles.ccGroup, { borderLeftColor: config.color }]}>
                        <Text style={[styles.ccGroupTitle, { color: colors.textPrimary }]}>
                          {cardName}
                        </Text>
                        {/* Main debt (the overall card balance) */}
                        {mainDebt && (
                          <DebtCard
                            key={mainDebt.id}
                            debt={mainDebt}
                            onPress={() => navigation.navigate('DebtDetail', { debtId: mainDebt.id })}
                          />
                        )}
                        {/* Single-installment purchases - show as compact summary card */}
                        {singleInstallmentDebts.length > 0 && (
                          <TouchableOpacity
                            style={[neuSurface(scheme, 'flat'), styles.singleInstCard]}
                            onPress={() => navigation.navigate('SingleInstallmentDebts', { linkedAccountId: accountId, cardName })}
                            accessibilityRole="button"
                            accessibilityLabel={`Ver ${singleInstallmentDebts.length} gastos individuales`}
                          >
                            <View style={styles.singleInstCardHeader}>
                              <View style={{ flex: 1 }}>
                                <View style={styles.inlineIconRow}>
                                  <AppIcon name="receipt-text" size={14} color={colors.textPrimary} />
                                  <Text style={[styles.singleInstCardTitle, { color: colors.textPrimary }]}>Gastos individuales</Text>
                                </View>
                                <Text style={[styles.singleInstCardCount, { color: colors.textTertiary }]}>
                                  {singleInstallmentDebts.length} {singleInstallmentDebts.length === 1 ? 'gasto' : 'gastos'}
                                  {singleInstallmentDebts.filter((d) => d.isProvisioned).length > 0 &&
                                    ` • ${singleInstallmentDebts.filter((d) => d.isProvisioned).length} aprovisionados`}
                                </Text>
                              </View>
                              <View style={styles.singleInstCardRight}>
                                <Text style={[styles.singleInstCardAmount, { color: colors.redExpenses }]}>
                                  {formatAmount(singleInstallmentDebts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0))}
                                </Text>
                                <AppIcon name="chevron-right" size={16} color={colors.textTertiary} />
                              </View>
                            </View>
                          </TouchableOpacity>
                        )}
                        {/* Multi-installment debts under this card */}
                        {multiInstallmentDebts.map((debt) => (
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
          <TouchableOpacity
            style={[neuSurface(scheme, 'flat'), styles.paidHeader]}
            onPress={() => setShowPaid((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showPaid }}
            accessibilityLabel={`${showPaid ? 'Ocultar' : 'Mostrar'} ${paidDebts.length} deudas pagadas`}
          >
            <View style={styles.paidHeaderLeft}>
              <View style={[styles.paidHeaderIcon, { backgroundColor: colors.greenEarns + '18' }]}>
                <AppIcon name="circle-check" size={18} color={colors.greenEarns} />
              </View>
              <View style={styles.paidHeaderText}>
                <Text style={[styles.paidTitle, { color: colors.textPrimary }]}>Pagadas</Text>
                <Text style={[styles.paidSubtitle, { color: colors.textTertiary }]}>
                  {paidDebts.length} {paidDebts.length === 1 ? 'deuda cerrada' : 'deudas cerradas'} · {formatAmount(paidTotal)}
                </Text>
              </View>
            </View>
            <AppIcon name={showPaid ? 'chevron-down' : 'chevron-right'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {showPaid && (
            <View style={styles.paidList}>
              {paidDebts.map((debt) => {
                const isReceivable = debt.direction === 'they_owe_me';
                return (
                  <TouchableOpacity
                    key={debt.id}
                    style={[neuSurface(scheme, 'flat'), styles.paidItem]}
                    onPress={() => navigation.navigate('DebtDetail', { debtId: debt.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`${debt.name}, ${isReceivable ? 'cobrada' : 'pagada'}, ${formatAmount(debt.totalAmount)}`}
                  >
                    <View style={[styles.paidCheck, { backgroundColor: colors.greenEarns + '14' }]}>
                      <AppIcon name="check" size={14} color={colors.greenEarns} />
                    </View>
                    <View style={styles.paidItemContent}>
                      <Text numberOfLines={1} style={[styles.paidName, { color: colors.textPrimary }]}>
                        {debt.name}
                      </Text>
                      <Text numberOfLines={1} style={[styles.paidMeta, { color: colors.textTertiary }]}>
                        {CATEGORY_SINGULAR[debt.category]} · {isReceivable ? 'Cobrada' : 'Pagada'} el {formatDate(debt.updatedAt)}
                      </Text>
                    </View>
                    <Text style={[styles.paidAmount, { color: colors.textSecondary }]}>
                      {formatAmount(debt.totalAmount)}
                    </Text>
                    <AppIcon name="chevron-right" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
    <ScreenTourModal visible={tourVisible} slides={TOUR_SLIDES} onClose={closeTour} />
  </View>
  );
}

// ─── Debt Card ───────────────────────────────────────────────────────────────

function DebtCard({ debt, onPress, showProvisioned }: { debt: Debt; onPress: () => void; showProvisioned?: boolean }) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const remaining = debt.totalAmount - debt.paidAmount;
  const progress = debt.totalAmount > 0 ? (debt.paidAmount / debt.totalAmount) * 100 : 0;
  const isReceivable = debt.direction === 'they_owe_me';

  return (
    <TouchableOpacity
      style={[neuSurface(scheme, 'raised'), styles.debtCard, debt.isProvisioned && styles.debtCardProvisioned]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Deuda ${debt.name}, pendiente ${formatAmount(remaining)}`}
    >
      <View style={styles.debtCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.debtNameRow}>
            <Text style={[styles.debtName, { color: colors.textPrimary }]} numberOfLines={1}>
              {debt.name}
            </Text>
            {showProvisioned && debt.isProvisioned && (
              <View style={[styles.provisionedBadge, { backgroundColor: '#2EAD5D20' }]}>
                <View style={styles.inlineIconRow}>
                  <AppIcon name="circle-check" size={11} color="#2EAD5D" />
                  <Text style={styles.provisionedBadgeText}>Separado</Text>
                </View>
              </View>
            )}
          </View>
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
      <View style={[neuProgress(scheme), styles.progressBarBg]}>
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
        <View style={styles.inlineIconRow}>
          <AppIcon name={isReceivable ? 'arrow-down-left' : 'arrow-up-right'} size={11} color={colors.textTertiary} />
          <Text style={[styles.debtDirection, { color: colors.textTertiary }]}>{isReceivable ? 'Me deben' : 'Yo debo'}</Text>
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

  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  addButton: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Summary
  summaryCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 40 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  summaryAmount: { fontSize: 22, fontWeight: '700', color: '#fff' },
  summaryBreakdown: { marginTop: 16, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14 },
  summaryBreakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionName: { fontSize: 16, fontWeight: '600' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '600' },
  sectionBody: { paddingTop: 8 },
  emptySection: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  // Credit card grouping
  ccGroup: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 8 },
  ccGroupTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, paddingTop: 4 },
  singleInstCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  singleInstCardHeader: { flexDirection: 'row', alignItems: 'center' },
  singleInstCardTitle: { fontSize: 14, fontWeight: '600' },
  singleInstCardCount: { fontSize: 12, marginTop: 2 },
  singleInstCardRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  singleInstCardAmount: { fontSize: 15, fontWeight: '700' },

  // Debt Card
  debtCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  debtCardProvisioned: {
    borderWidth: 1,
    borderColor: '#2EAD5D40',
  },
  debtCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  debtNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  debtName: { fontSize: 15, fontWeight: '600' },
  provisionedBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  provisionedBadgeText: { fontSize: 10, fontWeight: '600', color: '#2EAD5D' },
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
  paidSection: { marginTop: 8, gap: 8 },
  paidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  paidHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  paidHeaderIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  paidHeaderText: { flex: 1 },
  paidTitle: { fontSize: 15, fontWeight: '600' },
  paidSubtitle: { fontSize: 12, marginTop: 2 },
  paidList: { paddingTop: 8, gap: 8 },
  paidItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  paidCheck: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  paidItemContent: { flex: 1 },
  paidName: { fontSize: 14, fontWeight: '500' },
  paidMeta: { fontSize: 11, marginTop: 2 },
  paidAmount: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
