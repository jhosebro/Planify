import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { TabParamList } from '@/navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

interface MoreMenuItem {
  key: keyof TabParamList;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MENU_ITEMS: MoreMenuItem[] = [
  {
    key: 'Debts',
    label: 'Deudas',
    subtitle: 'Tarjetas, créditos y préstamos',
    icon: 'card-outline',
    color: '#E74C3C',
  },
  {
    key: 'Goals',
    label: 'Metas',
    subtitle: 'Objetivos de ahorro',
    icon: 'trophy-outline',
    color: '#F39C12',
  },
  {
    key: 'Tracking',
    label: 'Seguimiento',
    subtitle: 'Listas de productos y compras',
    icon: 'cube-outline',
    color: '#2EAD5D',
  },
  {
    key: 'Settings',
    label: 'Ajustes',
    subtitle: 'Perfil, tema y preferencias',
    icon: 'settings-outline',
    color: '#7B7B7B',
  },
];

export function MoreScreen() {
  const themeColors = useThemeColors();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}
      contentContainerStyle={styles.content}
    >
      {MENU_ITEMS.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.menuItem, { backgroundColor: themeColors.cardBackground }]}
          onPress={() => navigation.navigate(item.key)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Ir a ${item.label}`}
        >
          <View style={[styles.iconContainer, { backgroundColor: item.color + '12' }]}>
            <Ionicons name={item.icon} size={22} color={item.color} />
          </View>
          <View style={styles.menuItemText}>
            <Text style={[styles.menuItemLabel, { color: themeColors.textPrimary }]}>{item.label}</Text>
            <Text style={[styles.menuItemSubtitle, { color: themeColors.textTertiary }]}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeColors.textTertiary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 12, gap: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: { flex: 1 },
  menuItemLabel: { fontSize: 16, fontWeight: '600' },
  menuItemSubtitle: { fontSize: 13, marginTop: 2 },
});
