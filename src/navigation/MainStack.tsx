import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { AddTransactionModal } from '@/screens/modals/AddTransactionModal';
import { AddTransferModal } from '@/screens/modals/AddTransferModal';
import { AddBudgetModal } from '@/screens/modals/AddBudgetModal';
import { AddReminderModal } from '@/screens/modals/AddReminderModal';
import { AddGoalModal } from '@/screens/modals/AddGoalModal';
import { AddDebtModal } from '@/screens/modals/AddDebtModal';
import { GenerateReportModal } from '@/screens/modals/GenerateReportModal';
import { ExportForAIModal } from '@/screens/modals/ExportForAIModal';
import { AccountDetailScreen } from '@/screens/main/AccountDetailScreen';
import { TransactionDetailScreen } from '@/screens/main/TransactionDetailScreen';
import { BudgetDetailScreen } from '@/screens/main/BudgetDetailScreen';
import { GoalDetailScreen } from '@/screens/main/GoalDetailScreen';
import { DebtDetailScreen } from '@/screens/main/DebtDetailScreen';
import { SingleInstallmentDebtsScreen } from '@/screens/main/SingleInstallmentDebtsScreen';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />

      {/* Modal Stack */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionModal}
          options={{ title: 'Nuevo Movimiento' }}
        />
        <Stack.Screen
          name="AddTransfer"
          component={AddTransferModal}
          options={{ title: 'Nueva Transferencia' }}
        />
        <Stack.Screen
          name="AddBudget"
          component={AddBudgetModal}
          options={{ title: 'Nuevo Presupuesto' }}
        />
        <Stack.Screen
          name="AddReminder"
          component={AddReminderModal}
          options={{ title: 'Nuevo Recordatorio' }}
        />
        <Stack.Screen
          name="AddGoal"
          component={AddGoalModal}
          options={{ title: 'Nueva Meta' }}
        />
        <Stack.Screen
          name="AddDebt"
          component={AddDebtModal}
          options={{ title: 'Nueva Deuda' }}
        />
        <Stack.Screen
          name="GenerateReport"
          component={GenerateReportModal}
          options={{ title: 'Generar Reporte' }}
        />
        <Stack.Screen
          name="ExportForAI"
          component={ExportForAIModal}
          options={{ title: 'Exportar para ChatGPT' }}
        />
      </Stack.Group>

      {/* Detail Stack */}
      <Stack.Group>
        <Stack.Screen
          name="AccountDetail"
          component={AccountDetailScreen}
          options={{ title: 'Detalle de Cuenta' }}
        />
        <Stack.Screen
          name="GoalDetail"
          component={GoalDetailScreen}
          options={{ title: 'Detalle de Meta' }}
        />
        <Stack.Screen
          name="TransactionDetail"
          component={TransactionDetailScreen}
          options={{ title: 'Detalle de Movimiento' }}
        />
        <Stack.Screen
          name="BudgetDetail"
          component={BudgetDetailScreen}
          options={{ title: 'Detalle de Presupuesto' }}
        />
        <Stack.Screen
          name="DebtDetail"
          component={DebtDetailScreen}
          options={{ title: 'Detalle de Deuda' }}
        />
        <Stack.Screen
          name="SingleInstallmentDebts"
          component={SingleInstallmentDebtsScreen}
          options={{ title: 'Compras a 1 Cuota' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
