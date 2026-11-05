import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuShadow, neuSurface } from '@/lib/neumorphic';
import { AppIcon, type IconName } from '@/components/AppIcon';
import type { TabParamList } from './types';

interface SidebarItem {
  key: keyof TabParamList;
  label: string;
  icon: IconName;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'Dashboard', label: 'Inicio', icon: 'house' },
  { key: 'Transactions', label: 'Movimientos', icon: 'arrow-left-right' },
  { key: 'Accounts', label: 'Cuentas', icon: 'wallet' },
  { key: 'Budgets', label: 'Presupuestos', icon: 'chart-pie' },
  { key: 'Debts', label: 'Deudas', icon: 'credit-card' },
  { key: 'Goals', label: 'Metas', icon: 'trophy' },
  { key: 'Tracking', label: 'Seguimiento', icon: 'package' },
  { key: 'Settings', label: 'Ajustes', icon: 'settings' },
];

interface DesktopSidebarProps {
  currentRoute: keyof TabParamList;
  onNavigate: (route: keyof TabParamList) => void;
}

/**
 * Desktop sidebar navigation component.
 * Renders a vertical nav bar for screens wider than 1024px on web.
 */
export function DesktopSidebar({ currentRoute, onNavigate }: DesktopSidebarProps) {
  const colors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';

  if (Platform.OS !== 'web') return null;

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface }]}>
      {/* Brand */}
      <View style={[styles.brandContainer, { backgroundColor: colors.surfacePressed, ...neuShadow(scheme, 'flat') }]}>
        <Text style={[styles.brandText, { color: colors.primary }]}>Planify</Text>
      </View>

      {/* Navigation Items */}
      <View style={styles.navItems}>
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = currentRoute === item.key;
          const itemStyle = isActive
            ? [
                styles.navItem,
                neuSurface(scheme, 'pressed'),
                { backgroundColor: colors.primary },
              ]
            : [styles.navItem, neuSurface(scheme, 'flat')];

          return (
            <TouchableOpacity
              key={item.key}
              style={itemStyle}
              onPress={() => onNavigate(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              <AppIcon
                name={item.icon}
                size={22}
                color={isActive ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[
                styles.navLabel,
                { color: isActive ? colors.textInverse : colors.textSecondary },
                isActive && { fontWeight: '600' },
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={[styles.sidebarFooter]}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>© 2025 Planify</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    paddingVertical: 24,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  brandContainer: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  navItems: {
    flex: 1,
    gap: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navItemActive: {},
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  sidebarFooter: {
    paddingTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
