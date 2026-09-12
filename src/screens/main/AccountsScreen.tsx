import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset } from '@/lib/neumorphic';
import { ScreenTourModal, type TourSlide } from '@/components/ScreenTourModal';
import { useScreenTour } from '@/hooks/useScreenTour';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { AccountService } from '@/services/accounts/accountService';
import type { MainStackParamList } from '@/navigation/types';
import type { Account, AccountType } from '@/types';

type AccountsNavProp = NativeStackNavigationProp<MainStackParamList>;

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de Crédito',
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash: '💵',
  bank: '🏦',
  credit_card: '💳',
};

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AccountsScreen() {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<AccountsNavProp>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const accountService = useMemo(() => new AccountService(), []);

  const { visible: tourVisible, openTour, closeTour } = useScreenTour('accounts');

  const TOUR_SLIDES: TourSlide[] = [
    {
      emoji: '🏦',
      title: 'Tus cuentas',
      description: 'Aquí gestionas todas tus cuentas financieras: banco, efectivo y tarjetas de crédito. El saldo total se calcula automáticamente.',
    },
    {
      emoji: '➕',
      title: 'Crear cuenta',
      description: 'Toca el botón + para crear una nueva cuenta. Elige el tipo, el nombre y el saldo inicial.',
    },
    {
      emoji: '↔️',
      title: 'Transferencias',
      description: 'Usa el botón de transferencia para mover dinero entre tus cuentas. Los saldos se actualizan automáticamente.',
    },
    {
      emoji: '📋',
      title: 'Detalle de cuenta',
      description: 'Toca cualquier cuenta para ver su historial completo de movimientos y transferir dinero directamente desde ahí.',
    },
  ];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const [allAccounts, total] = await Promise.all([
        accountService.getActiveAccounts(),
        accountService.getTotalBalance(),
      ]);
      setAccounts(allAccounts);
      setTotalBalance(total);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [accountService]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  const handleAccountPress = (accountId: string) => {
    navigation.navigate('AccountDetail', { accountId });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando cuentas...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
      {/* Total Balance Header */}
      <View style={[
        styles.balanceCard,
        { backgroundColor: colors.primary },
        neuShadow(scheme, 'raised'),
        isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
      ]}>
        <Text style={styles.balanceLabel}>Saldo Total</Text>
        <Text style={[styles.balanceAmount, totalBalance < 0 && styles.negativeAmount]}>
          {formatAmount(totalBalance)}
        </Text>
        <Text style={styles.balanceSubtext}>
          {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} activa{accounts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Account List */}
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
        ]}
        numColumns={isDesktop ? 2 : 1}
        key={isDesktop ? 'desktop-2col' : 'mobile-1col'}
        columnWrapperStyle={isDesktop ? { gap: 16 } : undefined}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[neuSurface(scheme, 'raised'), styles.accountCard, isDesktop && { flex: 1 }]}
            onPress={() => handleAccountPress(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Cuenta ${item.name}, saldo ${formatAmount(item.balance)}`}
          >
            <View style={styles.accountRow}>
              <View style={[styles.accountIcon, { backgroundColor: colors.primary + '15' }]}>
                <Text style={styles.accountIconText}>{ACCOUNT_TYPE_ICONS[item.type]}</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.accountType, { color: colors.textTertiary }]}>{ACCOUNT_TYPE_LABELS[item.type]}</Text>
              </View>
            </View>
            <Text style={[styles.accountBalance, { color: colors.textPrimary }, item.balance < 0 && { color: colors.redExpenses }]}>
              {formatAmount(item.balance)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏦</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tienes cuentas registradas.</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Crea tu primera cuenta para comenzar a registrar tus movimientos.</Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]} onPress={() => setShowCreateForm(true)}>
              <Text style={styles.emptyButtonText}>Crear Cuenta</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create Account Form */}
      {showCreateForm && (
        <CreateAccountForm
          accountService={accountService}
          onCreated={() => {
            setShowCreateForm(false);
            loadAccounts();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* FABs: Transfer + Create account */}
      {!showCreateForm && accounts.length > 0 && (
        <View style={styles.fabGroup}>
          {accounts.length >= 2 && (
            <TouchableOpacity
              style={[neuSurface(scheme, 'raised'), styles.fab, styles.fabSecondary, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate('AddTransfer')}
              accessibilityRole="button"
              accessibilityLabel="Nueva transferencia"
            >
              <MaterialCommunityIcons name="bank-transfer" size={26} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised')]}
            onPress={() => setShowCreateForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Crear nueva cuenta"
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScreenTourModal visible={tourVisible} slides={TOUR_SLIDES} onClose={closeTour} />
    </View>
  );
}

// ─── Create Account Form ─────────────────────────────────────────────────────

interface CreateAccountFormProps {
  accountService: AccountService;
  onCreated: () => void;
  onCancel: () => void;
}

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function CreateAccountForm({ accountService, onCreated, onCancel }: CreateAccountFormProps) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [initialBalance, setInitialBalance] = useState('');
  const [displayBalance, setDisplayBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formatWithThousands = (value: string): string => {
    const clean = value.replace(/[^0-9]/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleBalanceChange = (text: string) => {
    const raw = text.replace(/\./g, '');
    setInitialBalance(raw);
    setDisplayBalance(formatWithThousands(raw));
  };

  const handleSubmit = async () => {
    console.log('[AccountsScreen] handleSubmit called', { name, type, initialBalance });

    if (!name.trim()) {
      showAlert('Error', 'El nombre de la cuenta es obligatorio.');
      return;
    }

    const numericValue = parseInt(initialBalance || '0', 10);
    const balanceCentavos = numericValue * 100;
    if (isNaN(balanceCentavos)) {
      showAlert('Error', 'El saldo inicial debe ser un número válido.');
      return;
    }

    setSubmitting(true);
    try {
      await accountService.create({
        name: name.trim(),
        type,
        initialBalance: balanceCentavos,
      });
      onCreated();
    } catch (error: any) {
      console.error('Error creating account:', error);
      showAlert('Error', error.message ?? 'No se pudo crear la cuenta. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.formOverlay, { backgroundColor: colors.overlay }]}>
      <View style={[neuSurface(scheme, 'raised'), styles.formCard]}>
        <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Nueva Cuenta</Text>

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre</Text>
        <TextInput
          style={[neuInset(scheme), styles.input, { color: colors.textPrimary, borderRadius: 12 }]}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Cuenta de ahorros"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Nombre de la cuenta"
        />

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tipo</Text>
        <View style={styles.typeSelector}>
          {(['bank', 'cash', 'credit_card'] as AccountType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                neuSurface(scheme, 'flat'),
                styles.typeButton,
                type === t && { backgroundColor: colors.primary, ...neuShadow(scheme, 'pressed') },
              ]}
              onPress={() => setType(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: type === t }}
            >
              <Text style={styles.typeIcon}>{ACCOUNT_TYPE_ICONS[t]}</Text>
              <Text style={[styles.typeButtonText, { color: colors.textSecondary }, type === t && { color: colors.textInverse }]}>
                {ACCOUNT_TYPE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Saldo Inicial ($)</Text>
        <TextInput
          style={[neuInset(scheme), styles.input, { color: colors.textPrimary, borderRadius: 12 }]}
          value={displayBalance}
          onChangeText={handleBalanceChange}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
          accessibilityLabel="Saldo inicial"
        />

        <View style={styles.formButtons}>
          <TouchableOpacity style={[neuSurface(scheme, 'flat'), styles.cancelButton]} onPress={onCancel}>
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
          </TouchableOpacity>
          <Pressable
            style={[styles.submitButton, { backgroundColor: colors.primary }, neuShadow(scheme, 'raised'), submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Creando...' : 'Crear Cuenta'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  // Balance Card
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    margin: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  negativeAmount: {
    color: '#FFCDD2',
  },
  balanceSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },

  // Account List
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  accountCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountIconText: {
    fontSize: 18,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    fontSize: 13,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  fabGroup: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSecondary: {
    borderWidth: 2,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '400',
    marginTop: -2,
  },
  fabSecondaryText: {
    fontSize: 22,
    fontWeight: '600',
  },

  // Form Overlay
  formOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  formCard: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 440,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  typeIcon: {
    fontSize: 18,
  },
  typeButtonText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
