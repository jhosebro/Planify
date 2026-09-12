import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuShadow, neuSurface } from '@/lib/neumorphic';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DesktopSidebar } from './DesktopSidebar';
import { DashboardScreen } from '@/screens/main/DashboardScreen';
import { TransactionsScreen } from '@/screens/main/TransactionsScreen';
import { AccountsScreen } from '@/screens/main/AccountsScreen';
import { DebtsScreen } from '@/screens/main/DebtsScreen';
import { BudgetsScreen } from '@/screens/main/BudgetsScreen';
import { GoalsScreen } from '@/screens/main/GoalsScreen';
import { TrackingScreen } from '@/screens/main/TrackingScreen';
import { SettingsScreen } from '@/screens/main/SettingsScreen';
import { MoreScreen } from '@/screens/main/MoreScreen';
import { TourHeaderButton } from '@/components/TourHeaderButton';
import { useTourStore } from '@/store/tourStore';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Back button that returns to the "More" tab.
 * Shown in the header of hidden tabs (Debts, Goals, Tracking, Settings) on mobile.
 */
function BackToMore() {
  const themeColors = useThemeColors();
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={{ marginLeft: 12, padding: 4 }}
      onPress={() => navigation.navigate('More')}
      accessibilityLabel="Volver a Más"
    >
      <Ionicons name="chevron-back" size={22} color={themeColors.primary} />
    </TouchableOpacity>
  );
}

const TAB_ICONS: Record<keyof TabParamList, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: 'home', unfocused: 'home-outline' },
  Transactions: { focused: 'swap-vertical', unfocused: 'swap-vertical-outline' },
  Accounts: { focused: 'wallet', unfocused: 'wallet-outline' },
  Budgets: { focused: 'pie-chart', unfocused: 'pie-chart-outline' },
  More: { focused: 'ellipsis-horizontal', unfocused: 'ellipsis-horizontal-outline' },
  Debts: { focused: 'card', unfocused: 'card-outline' },
  Goals: { focused: 'trophy', unfocused: 'trophy-outline' },
  Tracking: { focused: 'cube', unfocused: 'cube-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

const SCREENS: Record<keyof TabParamList, React.ComponentType> = {
  Dashboard: DashboardScreen,
  Transactions: TransactionsScreen,
  Accounts: AccountsScreen,
  Budgets: BudgetsScreen,
  More: MoreScreen,
  Debts: DebtsScreen,
  Goals: GoalsScreen,
  Tracking: TrackingScreen,
  Settings: SettingsScreen,
};

const SCREEN_TITLES: Record<keyof TabParamList, string> = {
  Dashboard: 'Inicio',
  Transactions: 'Movimientos',
  Accounts: 'Cuentas',
  Budgets: 'Presupuestos',
  More: 'Más',
  Debts: 'Deudas',
  Goals: 'Metas',
  Tracking: 'Seguimiento',
  Settings: 'Ajustes',
};

/**
 * Desktop layout: sidebar + content area.
 * Shows all sections in the sidebar — no need for "More" tab.
 */
function DesktopTabLayout() {
  const colors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const openCurrentTour = useTourStore((s) => s.openCurrentTour);
  const TOUR_TABS = new Set(['Dashboard', 'Transactions', 'Accounts', 'Budgets', 'Debts', 'Goals', 'Tracking', 'Settings']);
  const [currentRoute, setCurrentRoute] = useState<keyof TabParamList>(() => {
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
        <View
          style={[
            desktopStyles.header,
            { backgroundColor: colors.surface, ...neuShadow(scheme, 'flat') },
          ]}
        >
          <Text style={[desktopStyles.headerTitle, { color: colors.textPrimary }]}>{SCREEN_TITLES[currentRoute]}</Text>
          {TOUR_TABS.has(currentRoute) && openCurrentTour && (
            <TourHeaderButton onPress={openCurrentTour} />
          )}
        </View>
        <View style={desktopStyles.screenContainer}>
          <ActiveScreen />
        </View>
      </View>
    </View>
  );
}

/**
 * Mobile/Tablet layout: 5 visible bottom tabs.
 * Debts, Goals, Tracking, and Settings are hidden tabs accessible from "More".
 */
function MobileTabLayout() {
  const colors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' },
        headerTintColor: colors.textPrimary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          ...neuShadow(scheme, 'raised'),
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.quaternary,
        tabBarShowLabel: false,
      })}
    >
      {/* ─── Visible tabs (5) ─── */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Inicio', headerRight: () => <TourHeaderButton onPress={() => useTourStore.getState().openCurrentTour?.()} /> }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: 'Movimientos', headerRight: () => <TourHeaderButton onPress={() => useTourStore.getState().openCurrentTour?.()} /> }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ title: 'Cuentas', headerRight: () => <TourHeaderButton onPress={() => useTourStore.getState().openCurrentTour?.()} /> }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ title: 'Presupuestos', headerRight: () => <TourHeaderButton onPress={() => useTourStore.getState().openCurrentTour?.()} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ title: 'Más' }}
      />

      {/* ─── Hidden tabs (accessible from More screen) ─── */}
      <Tab.Screen
        name="Debts"
        component={DebtsScreen}
        options={{
          title: 'Deudas',
          tabBarItemStyle: { display: 'none' },
          headerLeft: () => <BackToMore />,
          headerRight: () => <TourHeaderButton onPress={() => useTourStore.getState().openCurrentTour?.()} />,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          title: 'Metas',
          tabBarItemStyle: { display: 'none' },
          headerLeft: () => <BackToMore />,
          headerRight: () => <TourHeaderButton onPress={() => useTourStore.getState().openCurrentTour?.()} />,
        }}
      />
      <Tab.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{
          title: 'Seguimiento',
          tabBarItemStyle: { display: 'none' },
          headerLeft: () => <BackToMore />,
          headerRight: () => <TourHeaderButton onPress={() => useTourStore.getState().openCurrentTour?.()} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Ajustes',
          tabBarItemStyle: { display: 'none' },
          headerLeft: () => <BackToMore />,
          headerRight: () => <TourHeaderButton onPress={() => useTourStore.getState().openCurrentTour?.()} />,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Responsive tab navigator that switches between sidebar (desktop web)
 * and bottom tabs (mobile/tablet).
 */
export function TabNavigator() {
  const { isDesktop, width } = useResponsiveLayout();

  // Only use sidebar layout on web with enough width (≥1200px)
  if (Platform.OS === 'web' && isDesktop && width >= 1200) {
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
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 32,
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
