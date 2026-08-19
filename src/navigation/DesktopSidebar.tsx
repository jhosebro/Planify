import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { TabParamList } from './types';

interface SidebarItem {
  key: keyof TabParamList;
  label: string;
  iconFocused: keyof typeof Ionicons.glyphMap;
  iconUnfocused: keyof typeof Ionicons.glyphMap;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'Dashboard', label: 'Inicio', iconFocused: 'home', iconUnfocused: 'home-outline' },
  { key: 'Transactions', label: 'Movimientos', iconFocused: 'swap-vertical', iconUnfocused: 'swap-vertical-outline' },
  { key: 'Accounts', label: 'Cuentas', iconFocused: 'wallet', iconUnfocused: 'wallet-outline' },
  { key: 'Budgets', label: 'Presupuestos', iconFocused: 'pie-chart', iconUnfocused: 'pie-chart-outline' },
  { key: 'Debts', label: 'Deudas', iconFocused: 'card', iconUnfocused: 'card-outline' },
  { key: 'Goals', label: 'Metas', iconFocused: 'trophy', iconUnfocused: 'trophy-outline' },
  { key: 'Tracking', label: 'Seguimiento', iconFocused: 'cube', iconUnfocused: 'cube-outline' },
  { key: 'Settings', label: 'Ajustes', iconFocused: 'settings', iconUnfocused: 'settings-outline' },
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

  if (Platform.OS !== 'web') return null;

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.cardBackground, borderRightColor: colors.border }]}>
      {/* Brand */}
      <View style={[styles.brandContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.brandText, { color: colors.primary }]}>Planify</Text>
      </View>

      {/* Navigation Items */}
      <View style={styles.navItems}>
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = currentRoute === item.key;
          const iconName = isActive ? item.iconFocused : item.iconUnfocused;

          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && [styles.navItemActive, { backgroundColor: colors.primary + '15' }],
              ]}
              onPress={() => onNavigate(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text style={[
                styles.navLabel,
                { color: colors.textSecondary },
                isActive && { color: colors.primary, fontWeight: '600' },
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={[styles.sidebarFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>© 2025 Planify</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  brandContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  navItems: {
    flex: 1,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemActive: {},
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  sidebarFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
