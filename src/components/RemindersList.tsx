import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '@/theme';
import {
  Alert,
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

  const pendingReminders = useMemo(
    () => reminders.filter((r) => !r.isOverdue && !r.isPaid),
    [reminders]
  );

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

  if (overdueReminders.length === 0 && pendingReminders.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No hay recordatorios pendientes.</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Overdue reminders */}
      {overdueReminders.length > 0 && (
        <View style={styles.groupContainer}>
          <Text style={styles.groupTitle}>⚠️ Vencidos</Text>
          {overdueReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              isOverdue
              onMarkAsPaid={() => handleMarkAsPaid(reminder)}
              onEdit={() => navigation.navigate('AddReminder', { reminderId: reminder.id })}
            />
          ))}
        </View>
      )}

      {/* Pending reminders */}
      {pendingReminders.length > 0 && (
        <View style={styles.groupContainer}>
          <Text style={styles.groupTitle}>📋 Pendientes</Text>
          {pendingReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              isOverdue={false}
              onMarkAsPaid={() => handleMarkAsPaid(reminder)}
              onEdit={() => navigation.navigate('AddReminder', { reminderId: reminder.id })}
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
              style={styles.pickerOption}
              onPress={() => handleSelectAccount(account.id)}
              disabled={paying}
            >
              <Text style={styles.pickerOptionName}>{account.name}</Text>
              <Text style={styles.pickerOptionBalance}>{formatAmount(account.balance)}</Text>
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
}

function ReminderItem({ reminder, isOverdue, onMarkAsPaid, onEdit }: ReminderItemProps) {
  return (
    <View style={[styles.reminderCard, isOverdue && styles.overdueCard]}>
      <TouchableOpacity style={styles.reminderInfo} onPress={onEdit} accessibilityLabel={`Editar ${reminder.description}`}>
        <Text style={styles.reminderDescription}>{reminder.description}</Text>
        <View style={styles.reminderDetails}>
          <Text style={styles.reminderAmount}>{formatAmount(reminder.amount)}</Text>
          <Text style={styles.reminderDot}>•</Text>
          <Text style={styles.reminderDate}>{formatDate(reminder.dueDate)}</Text>
          <Text style={styles.reminderDot}>•</Text>
          <Text style={styles.reminderFrequency}>{getFrequencyLabel(reminder.frequency)}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.reminderActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${reminder.description}`}
        >
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.paidButton, isOverdue && styles.overduePaidButton]}
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
    color: '#333',
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
    color: colors.primary,
  },
  reminderDot: {
    fontSize: 13,
    color: '#CCC',
    marginHorizontal: 6,
  },
  reminderDate: {
    fontSize: 13,
    color: '#666',
  },
  reminderFrequency: {
    fontSize: 13,
    color: '#999',
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
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.backgroundPrimary,
    marginBottom: 8,
  },
  pickerOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.secondary,
  },
  pickerOptionBalance: {
    fontSize: 14,
    color: '#666',
  },
});
