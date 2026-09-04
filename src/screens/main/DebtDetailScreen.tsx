import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset, neuProgress } from '@/lib/neumorphic';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DebtService } from '@/services/debts';
import type { Debt, DebtPayment, DebtDirection } from '@/services/debts';
import type { MainStackParamList } from '@/navigation/types';

type DetailNavProp = NativeStackNavigationProp<MainStackParamList>;
type DetailRouteProp = RouteProp<MainStackParamList, 'DebtDetail'>;

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CATEGORY_LABELS: Record<string, string> = {
  credit_card: '💳 Tarjeta de Crédito',
  installment: '📋 Deuda en Cuotas',
  personal: '🤝 Cuenta Personal',
};

export function DebtDetailScreen() {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<DetailNavProp>();
  const route = useRoute<DetailRouteProp>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const debtService = useMemo(() => new DebtService(), []);

  const [debt, setDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editCounterparty, setEditCounterparty] = useState('');
  const [editTotalInstallments, setEditTotalInstallments] = useState('');
  const [editInstallmentAmount, setEditInstallmentAmount] = useState('');
  const [editDirection, setEditDirection] = useState<'i_owe' | 'they_owe_me'>('i_owe');
  const [editSaving, setEditSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [debtData, paymentsData] = await Promise.all([
        debtService.getById(route.params.debtId),
        debtService.getPayments(route.params.debtId),
      ]);
      setDebt(debtData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading debt detail:', error);
    } finally {
      setLoading(false);
    }
  }, [debtService, route.params.debtId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const startEditing = () => {
    if (!debt) return;
    setEditName(debt.name);
    setEditDescription(debt.description ?? '');
    setEditTotalAmount((debt.totalAmount / 100).toString());
    setEditCounterparty(debt.counterparty ?? '');
    setEditTotalInstallments(debt.totalInstallments?.toString() ?? '');
    setEditInstallmentAmount(debt.installmentAmount ? (debt.installmentAmount / 100).toString() : '');
    setEditDirection(debt.direction);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('El nombre es obligatorio');
      } else {
        Alert.alert('Error', 'El nombre es obligatorio');
      }
      return;
    }

    setEditSaving(true);
    try {
      const totalAmountNum = parseFloat(editTotalAmount.replace(/,/g, '') || '0');
      const installments = editTotalInstallments ? parseInt(editTotalInstallments, 10) : undefined;
      const instAmount = editInstallmentAmount
        ? Math.round(parseFloat(editInstallmentAmount.replace(/,/g, '')) * 100)
        : undefined;

      await debtService.update(route.params.debtId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        totalAmount: Math.round(totalAmountNum * 100),
        counterparty: editCounterparty.trim() || undefined,
        totalInstallments: installments,
        installmentAmount: instAmount,
        direction: editDirection,
      });

      setEditing(false);
      await loadData();
    } catch (error: any) {
      const msg = error.message ?? 'No se pudo actualizar la deuda';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddPayment = async () => {
    const amountNum = parseFloat(paymentAmount.replace(/,/g, ''));
    if (!amountNum || amountNum <= 0) {
      if (Platform.OS === 'web') {
        window.alert('Ingresa un monto válido');
      } else {
        Alert.alert('Error', 'Ingresa un monto válido');
      }
      return;
    }

    setSaving(true);
    try {
      const amountCentavos = Math.round(amountNum * 100);
      await debtService.addPayment(
        route.params.debtId,
        amountCentavos,
        paymentNote.trim() || undefined
      );
      setPaymentAmount('');
      setPaymentNote('');
      setShowPaymentForm(false);
      await loadData();
    } catch (error: any) {
      const msg = error.message ?? 'No se pudo registrar el pago';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaidOff = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que esta deuda ha sido completamente pagada?');
      if (confirmed) {
        debtService.markAsPaidOff(route.params.debtId).then(() => navigation.goBack());
      }
    } else {
      Alert.alert(
        'Marcar como pagada',
        '¿Estás seguro de que esta deuda ha sido completamente pagada?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, pagada',
            onPress: async () => {
              await debtService.markAsPaidOff(route.params.debtId);
              navigation.goBack();
            },
          },
        ]
      );
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro? Esta acción no se puede deshacer.');
      if (confirmed) {
        debtService.deleteDebt(route.params.debtId).then(() => navigation.goBack());
      }
    } else {
      Alert.alert(
        'Eliminar deuda',
        '¿Estás seguro? Esta acción no se puede deshacer.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              await debtService.deleteDebt(route.params.debtId);
              navigation.goBack();
            },
          },
        ]
      );
    }
  };

  if (loading || !debt) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const remaining = debt.totalAmount - debt.paidAmount;
  const progress = debt.totalAmount > 0 ? (debt.paidAmount / debt.totalAmount) * 100 : 0;
  const isReceivable = debt.direction === 'they_owe_me';
  const isPaidOff = debt.status === 'paid_off';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: 700, width: '100%', alignSelf: 'center' },
      ]}
    >
      {/* Header info */}
      <View style={[styles.headerCard, { backgroundColor: colors.cardBackground, ...neuSurface(scheme, 'flat') }]}>
        <View style={styles.headerCardTop}>
          <Text style={[styles.categoryLabel, { color: colors.textTertiary }]}>
            {CATEGORY_LABELS[debt.category]}
          </Text>
          {!isPaidOff && !editing && (
            <TouchableOpacity onPress={startEditing} accessibilityRole="button" accessibilityLabel="Editar deuda">
              <Text style={[styles.editLink, { color: colors.primary }]}>✏️ Editar</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.debtTitle, { color: colors.textPrimary }]}>{debt.name}</Text>
        {debt.description && (
          <Text style={[styles.debtDescription, { color: colors.textSecondary }]}>{debt.description}</Text>
        )}

        <View style={styles.directionBadge}>
          <Text style={[styles.directionText, { color: isReceivable ? colors.greenEarns : colors.redExpenses }]}>
            {isReceivable ? '↙️ Me deben' : '↗️ Yo debo'}
          </Text>
          {debt.counterparty && (
            <Text style={[styles.counterpartyText, { color: colors.textSecondary }]}>
              {' '}• {debt.counterparty}
            </Text>
          )}
        </View>

        {/* Provisioned badge */}
        {debt.isProvisioned && (
          <View style={[styles.provisionedBanner, { backgroundColor: '#2EAD5D15' }]}>
            <Text style={styles.provisionedBannerText}>✅ Dinero ya separado</Text>
          </View>
        )}
      </View>

      {/* Edit form */}
      {editing && (
        <View style={[styles.editForm, { backgroundColor: colors.cardBackground, ...neuSurface(scheme, 'flat') }]}>
          <Text style={[styles.editFormTitle, { color: colors.textPrimary }]}>Editar Deuda</Text>

          <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Nombre</Text>
          <TextInput
            style={[styles.input, { ...neuInset(scheme), color: colors.textPrimary }]}
            value={editName}
            onChangeText={setEditName}
            placeholder="Nombre de la deuda"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Descripción</Text>
          <TextInput
            style={[styles.input, { ...neuInset(scheme), color: colors.textPrimary }]}
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Opcional"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Monto total</Text>
          <TextInput
            style={[styles.input, { ...neuInset(scheme), color: colors.textPrimary }]}
            value={editTotalAmount}
            onChangeText={setEditTotalAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Dirección</Text>
          <View style={styles.editDirectionRow}>
            <TouchableOpacity
              style={[styles.editDirChip, neuSurface(scheme, 'flat'), editDirection === 'i_owe' && { borderColor: colors.primary, backgroundColor: colors.primary + '15', ...neuShadow(scheme, 'pressed') }]}
              onPress={() => setEditDirection('i_owe')}
            >
              <Text style={[styles.editDirChipText, { color: colors.textSecondary }, editDirection === 'i_owe' && { color: colors.primary, fontWeight: '600' }]}>Yo debo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editDirChip, neuSurface(scheme, 'flat'), editDirection === 'they_owe_me' && { borderColor: colors.primary, backgroundColor: colors.primary + '15', ...neuShadow(scheme, 'pressed') }]}
              onPress={() => setEditDirection('they_owe_me')}
            >
              <Text style={[styles.editDirChipText, { color: colors.textSecondary }, editDirection === 'they_owe_me' && { color: colors.primary, fontWeight: '600' }]}>Me deben</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Persona/Entidad</Text>
          <TextInput
            style={[styles.input, { ...neuInset(scheme), color: colors.textPrimary }]}
            value={editCounterparty}
            onChangeText={setEditCounterparty}
            placeholder="Opcional"
            placeholderTextColor={colors.textTertiary}
          />

          {debt.category === 'installment' && (
            <>
              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Número de cuotas</Text>
              <TextInput
                style={[styles.input, { ...neuInset(scheme), color: colors.textPrimary }]}
                value={editTotalInstallments}
                onChangeText={setEditTotalInstallments}
                placeholder="Ej: 12"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
              />

              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Monto por cuota</Text>
              <TextInput
                style={[styles.input, { ...neuInset(scheme), color: colors.textPrimary }]}
                value={editInstallmentAmount}
                onChangeText={setEditInstallmentAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </>
          )}

          <View style={styles.editFormButtons}>
            <TouchableOpacity
              style={[styles.editCancelBtn, { ...neuSurface(scheme, 'flat') }]}
              onPress={() => setEditing(false)}
            >
              <Text style={[styles.editCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editSaveBtn, { backgroundColor: colors.primary, ...neuShadow(scheme, 'raised') }, editSaving && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={editSaving}
            >
              <Text style={styles.editSaveText}>{editSaving ? 'Guardando...' : 'Guardar Cambios'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Progress card */}
      <View style={[styles.progressCard, { backgroundColor: colors.cardBackground, ...neuSurface(scheme, 'flat') }]}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>Pendiente</Text>
            <Text style={[styles.progressAmount, { color: isReceivable ? colors.greenEarns : colors.redExpenses }]}>
              {formatAmount(remaining)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>Total</Text>
            <Text style={[styles.progressTotal, { color: colors.textPrimary }]}>{formatAmount(debt.totalAmount)}</Text>
          </View>
        </View>

        <View style={[styles.progressBarBg, { ...neuProgress(scheme) }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, progress)}%`, backgroundColor: isPaidOff ? colors.greenEarns : colors.primary },
            ]}
          />
        </View>

        <View style={styles.progressFooter}>
          <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>
            {progress.toFixed(0)}% pagado • {formatAmount(debt.paidAmount)} abonado
          </Text>
        </View>

        {debt.totalInstallments && (
          <View style={[styles.installmentInfo, { borderTopColor: colors.borderInset }]}>
            <Text style={[styles.installmentText, { color: colors.textSecondary }]}>
              📅 Cuota {debt.paidInstallments ?? 0} de {debt.totalInstallments}
            </Text>
            {debt.installmentAmount && (
              <Text style={[styles.installmentText, { color: colors.textSecondary }]}>
                💰 {formatAmount(debt.installmentAmount)} / cuota
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Provisioned toggle */}
      {!isPaidOff && debt.category === 'credit_card' && (!debt.totalInstallments || debt.totalInstallments === 1) && (
        <TouchableOpacity
          style={[
            styles.provisionedToggle,
            { borderColor: colors.borderInset, backgroundColor: colors.cardBackground, ...neuSurface(scheme, 'flat') },
            debt.isProvisioned && { borderColor: '#2EAD5D', backgroundColor: '#2EAD5D10' },
          ]}
          onPress={async () => {
            try {
              await debtService.update(route.params.debtId, { isProvisioned: !debt.isProvisioned });
              await loadData();
            } catch (error) {
              console.error('Error toggling provisioned:', error);
            }
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: debt.isProvisioned }}
          accessibilityLabel="Marcar dinero como separado"
        >
          <Text style={styles.provisionedToggleIcon}>{debt.isProvisioned ? '✅' : '💰'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.provisionedToggleLabel, { color: colors.textPrimary }]}>
              {debt.isProvisioned ? 'Dinero ya separado' : 'Marcar dinero como separado'}
            </Text>
            <Text style={[styles.provisionedToggleHint, { color: colors.textTertiary }]}>
              {debt.isProvisioned
                ? 'Esta compra no suma al total que debes'
                : 'Indica que ya apartaste el dinero para esta compra'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Actions */}
      {!isPaidOff && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary, ...neuShadow(scheme, 'raised') }]}
            onPress={() => setShowPaymentForm(!showPaymentForm)}
            accessibilityRole="button"
            accessibilityLabel="Registrar pago"
          >
            <Text style={styles.actionButtonText}>
              {showPaymentForm ? 'Cancelar' : '💰 Registrar Pago'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButtonSecondary, { borderColor: colors.greenEarns, ...neuSurface(scheme, 'flat') }]}
            onPress={handleMarkPaidOff}
            accessibilityRole="button"
            accessibilityLabel="Marcar como pagada"
          >
            <Text style={[styles.actionButtonSecondaryText, { color: colors.greenEarns }]}>✅ Pagada</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment form */}
      {showPaymentForm && (
        <View style={[styles.paymentForm, { backgroundColor: colors.cardBackground, ...neuSurface(scheme, 'flat') }]}>
          <Text style={[styles.paymentFormTitle, { color: colors.textPrimary }]}>Registrar Pago</Text>
          <TextInput
            style={[styles.input, { ...neuInset(scheme), color: colors.textPrimary }]}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            placeholder={debt.installmentAmount ? `Sugerido: ${(debt.installmentAmount / 100).toFixed(2)}` : '0.00'}
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            autoFocus
          />
          <TextInput
            style={[styles.input, { ...neuInset(scheme), color: colors.textPrimary }]}
            value={paymentNote}
            onChangeText={setPaymentNote}
            placeholder="Nota (opcional)"
            placeholderTextColor={colors.textTertiary}
          />
          <TouchableOpacity
            style={[styles.savePaymentButton, { ...neuShadow(scheme, 'raised') }, saving && { opacity: 0.6 }]}
            onPress={handleAddPayment}
            disabled={saving}
          >
            <Text style={styles.savePaymentButtonText}>{saving ? 'Guardando...' : 'Guardar Pago'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payments history */}
      <View style={styles.paymentsSection}>
        <Text style={[styles.paymentsSectionTitle, { color: colors.textPrimary }]}>
          Historial de Pagos ({payments.length})
        </Text>
        {payments.length === 0 ? (
          <Text style={[styles.emptyPayments, { color: colors.textTertiary }]}>
            No hay pagos registrados aún
          </Text>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={[styles.paymentItem, { borderBottomColor: colors.borderInset }]}>
              <View>
                <Text style={[styles.paymentAmount, { color: colors.greenEarns }]}>
                  +{formatAmount(payment.amount)}
                </Text>
                {payment.note && (
                  <Text style={[styles.paymentNote, { color: colors.textTertiary }]}>{payment.note}</Text>
                )}
              </View>
              <Text style={[styles.paymentDate, { color: colors.textTertiary }]}>
                {formatDate(payment.createdAt)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Eliminar deuda"
      >
        <Text style={styles.deleteButtonText}>🗑️ Eliminar Deuda</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  headerCard: { borderRadius: 14, padding: 20, marginBottom: 16 },
  headerCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  editLink: { fontSize: 14, fontWeight: '500' },
  categoryLabel: { fontSize: 12, fontWeight: '500' },
  debtTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  debtDescription: { fontSize: 14, marginBottom: 10 },
  directionBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  directionText: { fontSize: 13, fontWeight: '600' },
  counterpartyText: { fontSize: 13 },

  // Edit form
  editForm: { borderRadius: 14, padding: 20, marginBottom: 16 },
  editFormTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  editLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  editDirectionRow: { flexDirection: 'row', gap: 10 },
  editDirChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  editDirChipText: { fontSize: 14 },
  editFormButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  editCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  editCancelText: { fontSize: 14, fontWeight: '500' },
  editSaveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  editSaveText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Progress
  progressCard: { borderRadius: 14, padding: 20, marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  progressLabel: { fontSize: 12, marginBottom: 4 },
  progressAmount: { fontSize: 24, fontWeight: '700' },
  progressTotal: { fontSize: 16, fontWeight: '600' },
  progressBarBg: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressFooter: { marginBottom: 4 },
  progressPercent: { fontSize: 13 },
  installmentInfo: { borderTopWidth: 1, marginTop: 14, paddingTop: 14, gap: 6 },
  installmentText: { fontSize: 13 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  actionButtonSecondary: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  actionButtonSecondaryText: { fontSize: 14, fontWeight: '600' },

  // Payment form
  paymentForm: { borderRadius: 14, padding: 20, marginBottom: 16 },
  paymentFormTitle: { fontSize: 16, fontWeight: '600', marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  savePaymentButton: { backgroundColor: colors.greenEarns, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  savePaymentButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Payments list
  paymentsSection: { marginTop: 8, marginBottom: 24 },
  paymentsSectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  emptyPayments: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  paymentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  paymentAmount: { fontSize: 15, fontWeight: '600' },
  paymentNote: { fontSize: 12, marginTop: 2 },
  paymentDate: { fontSize: 12 },

  // Delete
  deleteButton: { alignItems: 'center', paddingVertical: 14, marginBottom: 20 },
  deleteButtonText: { color: colors.redExpenses, fontSize: 14, fontWeight: '500' },

  // Provisioned
  provisionedBanner: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  provisionedBannerText: { fontSize: 13, fontWeight: '600', color: '#2EAD5D' },
  provisionedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  provisionedToggleIcon: { fontSize: 20 },
  provisionedToggleLabel: { fontSize: 14, fontWeight: '600' },
  provisionedToggleHint: { fontSize: 11, marginTop: 2 },
});
