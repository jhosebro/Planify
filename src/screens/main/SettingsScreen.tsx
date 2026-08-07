import React from 'react';
import { colors } from '@/theme';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';
import type { MainStackParamList } from '@/navigation/types';
import type { SyncStatus } from '@/types';

type SettingsNavProp = NativeStackNavigationProp<MainStackParamList, 'Tabs'>;

// ─── Sync Status Config ──────────────────────────────────────────────────────

interface SyncStatusConfig {
  label: string;
  color: string;
}

const SYNC_STATUS_MAP: Record<SyncStatus, SyncStatusConfig> = {
  synced: { label: 'Sincronizado', color: colors.greenEarns },
  syncing: { label: 'Sincronizando', color: colors.tertiary },
  pending: { label: 'Pendiente', color: colors.redExpenses },
  conflict: { label: 'Conflicto', color: '#8E44AD' },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Pantalla de configuración.
 * Muestra estado de sincronización, datos de cuenta, opciones de exportación y logout.
 *
 * Requisitos: 7.5, 9.1, 9.4
 */
export function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const { status, lastSyncAt, pendingCount } = useSyncStore();
  const { userId, clearAuth } = useAuthStore();

  const syncConfig = SYNC_STATUS_MAP[status] ?? SYNC_STATUS_MAP.pending;

  const handleExportData = () => {
    navigation.navigate('GenerateReport');
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            clearAuth();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[
      styles.contentContainer,
      isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
    ]}>
      {/* Sync Status Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Estado de Sincronización</Text>
        <SyncStatusIndicator
          status={status}
          label={syncConfig.label}
          color={syncConfig.color}
          lastSyncAt={lastSyncAt}
          pendingCount={pendingCount}
        />
      </View>

      {/* Account Info Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{userId ?? 'No disponible'}</Text>
        </View>
      </View>

      {/* Export Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Exportar Datos</Text>
        <Text style={styles.sectionDescription}>
          Genera reportes en PDF o CSV con los movimientos de tu cuenta.
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleExportData}
          accessibilityRole="button"
          accessibilityLabel="Generar reporte"
        >
          <Text style={styles.actionButtonText}>Generar Reporte</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Section */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Sync Status Indicator ───────────────────────────────────────────────────

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  label: string;
  color: string;
  lastSyncAt: Date | null;
  pendingCount: number;
}

function SyncStatusIndicator({ status, label, color, lastSyncAt, pendingCount }: SyncStatusIndicatorProps) {
  return (
    <View style={styles.syncContainer}>
      <View style={styles.syncStatusRow}>
        <View style={[styles.syncDot, { backgroundColor: color }]} />
        <Text style={[styles.syncLabel, { color }]}>{label}</Text>
      </View>

      {lastSyncAt && (
        <Text style={styles.syncDetail}>
          Última sincronización: {formatSyncTime(lastSyncAt)}
        </Text>
      )}

      {!lastSyncAt && (
        <Text style={styles.syncDetail}>Sin sincronizar aún</Text>
      )}

      {pendingCount > 0 && (
        <Text style={styles.syncPending}>
          {pendingCount} {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
        </Text>
      )}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSyncTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Justo ahora';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;

  return date.toLocaleDateString('es', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },

  // Sync Indicator
  syncContainer: {
    gap: 8,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  syncLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  syncDetail: {
    fontSize: 13,
    color: '#999',
    marginLeft: 20,
  },
  syncPending: {
    fontSize: 13,
    color: colors.redExpenses,
    marginLeft: 20,
    fontWeight: '500',
  },

  // Action Button
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Logout Button
  logoutButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.redExpenses,
  },
  logoutButtonText: {
    color: colors.redExpenses,
    fontSize: 15,
    fontWeight: '600',
  },
});
