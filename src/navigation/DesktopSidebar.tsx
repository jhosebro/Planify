import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BrandLogo } from '@/components/BrandLogo';
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

  if (Platform.OS !== 'web') return null;

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      {/* Brand */}
      <View style={styles.brandContainer}>
        <BrandLogo size={32} />
        <Text style={[styles.brandText, { color: colors.textPrimary }]}>Planify</Text>
      </View>

      {/* Navigation Items */}
      <View style={styles.navItems} accessibilityRole="menu">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = currentRoute === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onNavigate(item.key)}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
              style={(state) => {
                // react-native-web añade `hovered` al estado del Pressable
                const hovered = (state as { hovered?: boolean }).hovered;
                return [
                  styles.navItem,
                  isActive
                    ? { backgroundColor: colors.primary + '1F' }
                    : hovered && { backgroundColor: colors.surfacePressed },
                ];
              }}
            >
              <View style={[styles.activeBar, isActive && { backgroundColor: colors.primary }]} />
              <AppIcon
                name={item.icon}
                size={20}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text style={[
                styles.navLabel,
                { color: isActive ? colors.primary : colors.textSecondary },
                isActive && { fontWeight: '700' },
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.sidebarFooter}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>© {new Date().getFullYear()} Planify</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 232,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 28,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  navItems: {
    flex: 1,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sidebarFooter: {
    paddingTop: 16,
    paddingHorizontal: 10,
  },
  footerText: {
    fontSize: 12,
  },
});
