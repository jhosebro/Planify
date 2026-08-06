import React from 'react';
import { colors } from '@/theme';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '@/screens/main/DashboardScreen';
import { TransactionsScreen } from '@/screens/main/TransactionsScreen';
import { AccountsScreen } from '@/screens/main/AccountsScreen';
import { BudgetsScreen } from '@/screens/main/BudgetsScreen';
import { GoalsScreen } from '@/screens/main/GoalsScreen';
import { SettingsScreen } from '@/screens/main/SettingsScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: 'home', unfocused: 'home-outline' },
  Transactions: { focused: 'swap-vertical', unfocused: 'swap-vertical-outline' },
  Accounts: { focused: 'wallet', unfocused: 'wallet-outline' },
  Budgets: { focused: 'pie-chart', unfocused: 'pie-chart-outline' },
  Goals: { focused: 'trophy', unfocused: 'trophy-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.quaternary,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Inicio' }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: 'Movimientos' }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ title: 'Cuentas' }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ title: 'Presupuestos' }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: 'Metas' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Ajustes' }}
      />
    </Tab.Navigator>
  );
}
