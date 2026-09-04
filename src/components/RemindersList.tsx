import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuShadow, neuSurface } from '@/lib/neumorphic';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReminderService } from '@/services/reminders';
import { AccountService } from '@/services/accounts';
import { BottomModal } from '@/components/BottomModal';
import type { Account, Reminder } from '@/types';
import type { MainStackParamList } from '@/navigation/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'once':
      return 'Una vez';
    case 'weekly':
      return 'Semanal';
    case 'biweekly':
      return 'Quincenal';
    case 'monthly':
      return 'Mensual';
    case 'yearly':
      return 'Anual';
    default:
      return frequency;
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface RemindersListProps {
  reminders: Reminder[];
  onRefresh: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RemindersList({ reminders, onRefresh }: RemindersListProps) {
  const colors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const reminderService = useMemo(() => new ReminderService(), []);
  const accountService = useMemo(() => new AccountService(), []);

  // Account picker state
  const [payingReminder, setPayingReminder] = useState<Reminder | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [paying, setPaying] = useState(false);

  const overdueReminders = useMemo(
    () => reminders.filter((r) => r.isOverdue && !r.isPaid),
    [reminders]
  );

  // Separate pending reminders: current month vs next months
  const { currentMonthReminders, upcomingReminders } = useMemo(() => {
    const pending = reminders.filter((r) => !r.isOverdue && !r.isPaid);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const current: Reminder[] = [];
    const upcoming: Reminder[] = [];

    for (const r of pending) {
      const due = r.dueDate instanceof Date ? r.dueDate : new Date(r.dueDate);
      if (due.getFullYear() === currentYear && due.getMonth() === currentMonth) {
        current.push(r);
      } else {
        upcoming.push(r);
      }
    }

    return { currentMonthReminders: current, upcomingReminders: upcoming };
  }, [reminders]);

  const handleMarkAsPaid = useCallback(
    async (reminder: Reminder) => {
      try {
        const accounts = await accountService.getActiveAccounts();
        if (accounts.length === 0) {
          Alert.alert('Error', 'No tienes cuentas activas para registrar el pago.');
          return;
        }
        setAvailableAccounts(accounts);
        setPayingReminder(reminder);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron obtener las cuentas.');
      }
    },
    [accountService]
  );

  const handleSelectAccount = useCallback(
    async (accountId: string) => {
      if (!payingReminder) return;
      setPaying(true);
      try {
        await reminderService.markAsPaid(payingReminder.id, accountId);
        setPayingReminder(null);
        onRefresh();
      } catch (error) {
        Alert.alert('Error', 'No se pudo marcar como pagado.');
      } finally {
        setPaying(false);
      }
    },
    [payingReminder, reminderService, onRefresh]
  );

  const handleDelete = useCallback(
    (reminder: Reminder) => {
      const doDelete = async () => {
        try {
          await reminderService.delete(reminder.id);
          onRefresh();
        } catch (error) {
          if (Platform.OS === 'web') {
            window.alert('No se pudo eliminar el recordatorio.');
          } else {
            Alert.alert('Error', 'No se pudo eliminar el recordatorio.');
          }
        }
      };

      if (Platform.OS === 'web') {
        if (window.confirm(`¿Eliminar el recordatorio "${reminder.description}"?`)) {
          doDelete();
        }
      } else {
        Alert.alert(
          'Eliminar recordatorio',
          `¿Eliminar "${reminder.description}"?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: doDelete },
          ]
        );
      }
    },
    [reminderService, onRefresh]
  );

  if (overdueReminders.length === 0 && currentMonthReminders.length === 0 && upcomingReminders.length === 0) {
    return (
      <View style={[neuSurface(scheme, 'flat'), styles.emptyCard]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No hay recordatorios pendientes.</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Overdue reminders */}
      {overdueReminders.length > 0 && (
        <View style={styles.groupContainer}>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>⚠️ Vencidos</Text>
          {overdueReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              isOverdue
              onMarkAsPaid={() => handleMarkAsPaid(reminder)}
              onEdit={() => navigation.navigate('AddReminder', { reminderId: reminder.id })}
              onDelete={() => handleDelete(reminder)}
            />
          ))}
        </View>
      )}

      {/* Current month reminders */}
      {currentMonthReminders.length > 0 && (
        <View style={styles.groupContainer}>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>📅 Este mes</Text>
          {currentMonthReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              isOverdue={false}
              onMarkAsPaid={() => handleMarkAsPaid(reminder)}
              onEdit={() => navigation.navigate('AddReminder', { reminderId: reminder.id })}
              onDelete={() => handleDelete(reminder)}
            />
          ))}
        </View>
      )}

      {/* Upcoming reminders (next months) */}
      {upcomingReminders.length > 0 && (
        <View style={styles.groupContainer}>
          <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>📋 Próximos meses</Text>
          {upcomingReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              isOverdue={false}
              onMarkAsPaid={() => handleMarkAsPaid(reminder)}
              onEdit={() => navigation.navigate('AddReminder', { reminderId: reminder.id })}
              onDelete={() => handleDelete(reminder)}
            />
          ))}
        </View>
      )}

      {/* Account Picker Modal */}
      {payingReminder && (
        <BottomModal
          visible={!!payingReminder}
          title="Seleccionar cuenta"
          subtitle={`Se registrará un gasto de ${formatAmount(payingReminder.amount)} por "${payingReminder.description}"`}
          onClose={() => setPayingReminder(null)}
        >
          {availableAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[neuSurface(scheme, 'flat'), styles.pickerOption]}
              onPress={() => handleSelectAccount(account.id)}
              disabled={paying}
            >
              <Text style={[styles.pickerOptionName, { color: colors.textPrimary }]}>{account.name}</Text>
              <Text style={[styles.pickerOptionBalance, { color: colors.textSecondary }]}>{formatAmount(account.balance)}</Text>
            </TouchableOpacity>
          ))}
        </BottomModal>
      )}
    </View>
  );
}

// ─── Reminder Item ───────────────────────────────────────────────────────────

interface ReminderItemProps {
  reminder: Reminder;
  isOverdue: boolean;
  onMarkAsPaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ReminderItem({ reminder, isOverdue, onMarkAsPaid, onEdit, onDelete }: ReminderItemProps) {
  const colors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';

  return (
    <View style={[neuSurface(scheme, 'flat'), styles.reminderCard, isOverdue && styles.overdueCard]}>
      <TouchableOpacity style={styles.reminderInfo} onPress={onEdit} accessibilityLabel={`Editar ${reminder.description}`}>
        <Text style={[styles.reminderDescription, { color: colors.textPrimary }]}>{reminder.description}</Text>
        <View style={styles.reminderDetails}>
          <Text style={[styles.reminderAmount, { color: colors.primary }]}>{formatAmount(reminder.amount)}</Text>
          <Text style={[styles.reminderDot, { color: colors.textTertiary }]}>•</Text>
          <Text style={[styles.reminderDate, { color: colors.textSecondary }]}>{formatDate(reminder.dueDate)}</Text>
          <Text style={[styles.reminderDot, { color: colors.textTertiary }]}>•</Text>
          <Text style={[styles.reminderFrequency, { color: colors.textTertiary }]}>{getFrequencyLabel(reminder.frequency)}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.reminderActions}>
        <TouchableOpacity
          style={[neuSurface(scheme, 'flat'), styles.deleteReminderBtn]}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${reminder.description}`}
        >
          <Text style={styles.deleteReminderBtnText}>🗑️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[neuSurface(scheme, 'flat'), styles.editButton]}
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${reminder.description}`}
        >
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.paidButton, neuShadow(scheme, 'raised'), isOverdue && styles.overduePaidButton]}
          onPress={onMarkAsPaid}
          accessibilityRole="button"
          accessibilityLabel={`Marcar ${reminder.description} como pagado`}
        >
          <Text style={styles.paidButtonText}>Pagar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  separatorLine: {
    height: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  reminderCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overdueCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.redExpenses,
  },
  reminderInfo: {
    flex: 1,
    marginRight: 12,
  },
  reminderDescription: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  reminderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  reminderAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  reminderDot: {
    fontSize: 13,
    marginHorizontal: 6,
  },
  reminderDate: {
    fontSize: 13,
  },
  reminderFrequency: {
    fontSize: 13,
  },
  paidButton: {
    backgroundColor: colors.greenEarns,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  overduePaidButton: {
    backgroundColor: colors.redExpenses,
  },
  paidButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
  },
  deleteReminderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteReminderBtnText: {
    fontSize: 14,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  pickerOptionName: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerOptionBalance: {
    fontSize: 14,
  },
});
