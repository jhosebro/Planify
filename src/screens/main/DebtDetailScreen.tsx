import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset, neuProgress } from '@/lib/neumorphic';
import { AppIcon, type IconName } from '@/components/AppIcon';
import { ScreenSkeleton } from '@/components/Skeleton';
import {
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
  return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Mismo formato que AddDebtModal: pesos enteros con '.' como separador de miles
function formatWithThousands(value: string): string {
  return value.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function pesosToCentavos(display: string): number {
  return (parseInt(display.replace(/\./g, ''), 10) || 0) * 100;
}

function centavosToDisplay(centavos: number): string {
  return formatWithThousands(String(Math.round(centavos / 100)));
}

function showError(msg: string) {
  if (Platform.OS === 'web') window.alert(msg);
  else Alert.alert('Error', msg);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CATEGORY_LABELS: Record<string, string> = {
  credit_card: 'Tarjeta de Crédito',
  installment: 'Deuda en Cuotas',
  personal: 'Cuenta Personal',
};

const CATEGORY_ICONS: Record<string, IconName> = {
  credit_card: 'credit-card',
  installment: 'clipboard-list',
  personal: 'handshake',
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
    setEditTotalAmount(centavosToDisplay(debt.totalAmount));
    setEditCounterparty(debt.counterparty ?? '');
    setEditTotalInstallments(debt.totalInstallments?.toString() ?? '');
    setEditInstallmentAmount(debt.installmentAmount ? centavosToDisplay(debt.installmentAmount) : '');
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

    const totalAmount = pesosToCentavos(editTotalAmount);
    if (totalAmount <= 0) {
      showError('El monto total debe ser mayor a cero');
      return;
    }

    setEditSaving(true);
    try {
      const installments = parseInt(editTotalInstallments, 10) || null;
      const instAmount = pesosToCentavos(editInstallmentAmount) || null;

      await debtService.update(route.params.debtId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        totalAmount,
        counterparty: editCounterparty.trim() || undefined,
        // null = el usuario vació el campo; solo aplica a deudas en cuotas
        ...(debt?.category === 'installment' && { totalInstallments: installments, installmentAmount: instAmount }),
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
    const amountCentavos = pesosToCentavos(paymentAmount);
    if (amountCentavos <= 0) {
      showError('Ingresa un monto válido');
      return;
    }

    setSaving(true);
    try {
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

  const runAndGoBack = async (action: () => Promise<void>) => {
    try {
      await action();
      navigation.goBack();
    } catch (error: any) {
      showError(error?.message ?? 'No se pudo completar la acción');
    }
  };

  const handleMarkPaidOff = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que esta deuda ha sido completamente pagada?');
      if (confirmed) runAndGoBack(() => debtService.markAsPaidOff(route.params.debtId));
    } else {
      Alert.alert(
        'Marcar como pagada',
        '¿Estás seguro de que esta deuda ha sido completamente pagada?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, pagada',
            onPress: () => runAndGoBack(() => debtService.markAsPaidOff(route.params.debtId)),
          },
        ]
      );
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro? Esta acción no se puede deshacer.');
      if (confirmed) runAndGoBack(() => debtService.deleteDebt(route.params.debtId));
    } else {
      Alert.alert(
        'Eliminar deuda',
        '¿Estás seguro? Esta acción no se puede deshacer.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => runAndGoBack(() => debtService.deleteDebt(route.params.debtId)),
          },
        ]
      );
    }
  };

  if (loading || !debt) {
    return <ScreenSkeleton variant="summary" rows={4} />;
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
          <View style={styles.inlineIconRow}>
            <AppIcon name={CATEGORY_ICONS[debt.category] ?? 'credit-card'} size={13} color={colors.textTertiary} />
            <Text style={[styles.categoryLabel, { color: colors.textTertiary }]}>
              {CATEGORY_LABELS[debt.category]}
            </Text>
          </View>
          {!isPaidOff && !editing && (
            <TouchableOpacity onPress={startEditing} accessibilityRole="button" accessibilityLabel="Editar deuda">
              <View style={styles.inlineIconRow}>
                <AppIcon name="pencil" size={13} color={colors.primary} />
                <Text style={[styles.editLink, { color: colors.primary }]}>Editar</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.debtTitle, { color: colors.textPrimary }]}>{debt.name}</Text>
        {debt.description && (
          <Text style={[styles.debtDescription, { color: colors.textSecondary }]}>{debt.description}</Text>
        )}

        <View style={styles.directionBadge}>
          <View style={styles.inlineIconRow}>
            <AppIcon name={isReceivable ? 'arrow-down-left' : 'arrow-up-right'} size={13} color={isReceivable ? colors.greenEarns : colors.redExpenses} />
            <Text style={[styles.directionText, { color: isReceivable ? colors.greenEarns : colors.redExpenses }]}>
              {isReceivable ? 'Me deben' : 'Yo debo'}
            </Text>
          </View>
          {debt.counterparty && (
            <Text style={[styles.counterpartyText, { color: colors.textSecondary }]}>
              {' '}• {debt.counterparty}
            </Text>
          )}
        </View>

        {/* Provisioned badge */}
        {debt.isProvisioned && (
          <View style={[styles.provisionedBanner, { backgroundColor: '#2EAD5D15' }]}>
            <View style={styles.inlineIconRow}>
              <AppIcon name="circle-check" size={14} color="#2EAD5D" />
              <Text style={styles.provisionedBannerText}>Dinero ya separado</Text>
            </View>
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
            onChangeText={(t) => setEditTotalAmount(formatWithThousands(t))}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
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
                onChangeText={(t) => setEditInstallmentAmount(formatWithThousands(t))}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
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
            <View style={styles.inlineIconRow}>
              <AppIcon name="calendar" size={14} color={colors.textSecondary} />
              <Text style={[styles.installmentText, { color: colors.textSecondary }]}>
                Cuota {debt.paidInstallments ?? 0} de {debt.totalInstallments}
              </Text>
            </View>
            {debt.installmentAmount && (
              <View style={styles.inlineIconRow}>
                <AppIcon name="banknote" size={14} color={colors.textSecondary} />
                <Text style={[styles.installmentText, { color: colors.textSecondary }]}>
                  {formatAmount(debt.installmentAmount)} / cuota
                </Text>
              </View>
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
          <AppIcon name={debt.isProvisioned ? 'circle-check' : 'banknote'} size={20} color="#2EAD5D" />
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
            <View style={styles.inlineIconRow}>
              <AppIcon name={showPaymentForm ? 'x' : 'banknote'} size={16} color="#fff" />
              <Text style={styles.actionButtonText}>{showPaymentForm ? 'Cancelar' : 'Registrar Pago'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButtonSecondary, { borderColor: colors.greenEarns, ...neuSurface(scheme, 'flat') }]}
            onPress={handleMarkPaidOff}
            accessibilityRole="button"
            accessibilityLabel="Marcar como pagada"
          >
            <View style={styles.inlineIconRow}>
              <AppIcon name="circle-check" size={16} color={colors.greenEarns} />
              <Text style={[styles.actionButtonSecondaryText, { color: colors.greenEarns }]}>Pagada</Text>
            </View>
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
            onChangeText={(t) => setPaymentAmount(formatWithThousands(t))}
            placeholder={`${debt.installmentAmount ? `Sugerido: ${centavosToDisplay(debt.installmentAmount)} · ` : ''}Máx: ${centavosToDisplay(debt.totalAmount - debt.paidAmount)}`}
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
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
        <View style={styles.inlineIconRow}>
          <AppIcon name="trash" size={16} color={colors.redExpenses} />
          <Text style={styles.deleteButtonText}>Eliminar Deuda</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inlineIconRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
