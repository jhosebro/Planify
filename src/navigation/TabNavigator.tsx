import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DesktopSidebar } from './DesktopSidebar';
import { DashboardScreen } from '@/screens/main/DashboardScreen';
import { TransactionsScreen } from '@/screens/main/TransactionsScreen';
import { AccountsScreen } from '@/screens/main/AccountsScreen';
import { DebtsScreen } from '@/screens/main/DebtsScreen';
import { BudgetsScreen } from '@/screens/main/BudgetsScreen';
import { GoalsScreen } from '@/screens/main/GoalsScreen';
import { SettingsScreen } from '@/screens/main/SettingsScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: 'home', unfocused: 'home-outline' },
  Transactions: { focused: 'swap-vertical', unfocused: 'swap-vertical-outline' },
  Accounts: { focused: 'wallet', unfocused: 'wallet-outline' },
  Debts: { focused: 'card', unfocused: 'card-outline' },
  Budgets: { focused: 'pie-chart', unfocused: 'pie-chart-outline' },
  Goals: { focused: 'trophy', unfocused: 'trophy-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

const SCREENS: Record<keyof TabParamList, React.ComponentType> = {
  Dashboard: DashboardScreen,
  Transactions: TransactionsScreen,
  Accounts: AccountsScreen,
  Debts: DebtsScreen,
  Budgets: BudgetsScreen,
  Goals: GoalsScreen,
  Settings: SettingsScreen,
};

const SCREEN_TITLES: Record<keyof TabParamList, string> = {
  Dashboard: 'Inicio',
  Transactions: 'Movimientos',
  Accounts: 'Cuentas',
  Debts: 'Deudas',
  Budgets: 'Presupuestos',
  Goals: 'Metas',
  Settings: 'Ajustes',
};

/**
 * Desktop layout: sidebar + content area.
 * Replaces bottom tabs with a persistent sidebar on wide screens.
 */
function DesktopTabLayout() {
  const colors = useThemeColors();
  const [currentRoute, setCurrentRoute] = useState<keyof TabParamList>(() => {
    // Restore last active tab from sessionStorage on web
    if (Platform.OS === 'web') {
      try {
        const saved = window.sessionStorage.getItem('planify_active_tab');
        if (saved && saved in SCREENS) return saved as keyof TabParamList;
      } catch {}
    }
    return 'Dashboard';
  });

  const handleNavigate = useCallback((route: keyof TabParamList) => {
    setCurrentRoute(route);
    if (Platform.OS === 'web') {
      try { window.sessionStorage.setItem('planify_active_tab', route); } catch {}
    }
  }, []);

  const ActiveScreen = SCREENS[currentRoute];

  return (
    <View style={desktopStyles.container}>
      <DesktopSidebar currentRoute={currentRoute} onNavigate={handleNavigate} />
      <View style={[desktopStyles.mainContent, { backgroundColor: colors.backgroundPrimary }]}>
        {/* Desktop Header Bar */}
        <View style={[desktopStyles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <Text style={[desktopStyles.headerTitle, { color: colors.textPrimary }]}>{SCREEN_TITLES[currentRoute]}</Text>
        </View>
        {/* Screen Content */}
        <View style={desktopStyles.screenContainer}>
          <ActiveScreen />
        </View>
      </View>
    </View>
  );
}

/**
 * Mobile/Tablet layout: standard bottom tab navigator.
 */
function MobileTabLayout() {
  const colors = useThemeColors();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.cardBackground },
        headerTintColor: colors.textPrimary,
        tabBarStyle: { backgroundColor: colors.cardBackground, borderTopColor: colors.border },
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
        name="Debts"
        component={DebtsScreen}
        options={{ title: 'Deudas' }}
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

/**
 * Responsive tab navigator that switches between sidebar (desktop web)
 * and bottom tabs (mobile/tablet).
 */
export function TabNavigator() {
  const { isDesktop } = useResponsiveLayout();

  if (Platform.OS === 'web' && isDesktop) {
    return <DesktopTabLayout />;
  }

  return <MobileTabLayout />;
}

const desktopStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    height: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    justifyContent: 'center',
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
  },
  screenContainer: {
    flex: 1,
  },
});
