import React, { useCallback, useEffect, useMemo } from 'react';
import { colors } from '@/theme';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow } from '@/lib/neumorphic';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import { authService } from '@/services/auth';
import { ProfileService } from '@/services/profile';
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
 * Muestra perfil del usuario, estado de sincronización, opciones de exportación y logout.
 *
 * Requisitos: 7.5, 9.1, 9.4
 */
export function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;
  const { status, lastSyncAt, pendingCount } = useSyncStore();
  const { userId, clearAuth } = useAuthStore();
  const { profile, setProfile, setLoading } = useProfileStore();
  const { mode, setMode } = useThemeStore();

  const profileService = useMemo(() => new ProfileService(), []);
  const syncConfig = SYNC_STATUS_MAP[status] ?? SYNC_STATUS_MAP.pending;

  // Load profile on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    profileService
      .get()
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch((err) => { console.error('[Settings] profile load error:', err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleExportData = () => {
    navigation.navigate('GenerateReport');
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleLogout = () => {
    const doLogout = async () => {
      try {
        await authService.logout();
      } catch {
        // Force clear even if Supabase signOut fails (e.g. offline)
        clearAuth();
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        'Cerrar sesión',
        '¿Estás seguro de que deseas cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  const memberSince = profile?.createdAt
    ? profile.createdAt.toLocaleDateString('es', { month: 'long', year: 'numeric' })
    : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]} contentContainerStyle={[
      styles.contentContainer,
      isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
    ]}>
      {/* Profile Card */}
      <View style={[neuSurface(scheme, 'raised'), styles.profileCard]}>
        <View style={styles.profileHeader}>
          <ProfileAvatar
            displayName={profile?.displayName}
            themeColors={themeColors}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: themeColors.textPrimary }]}>
              {profile?.displayName ?? 'Sin nombre'}
            </Text>
            <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>
              {userId ?? 'No disponible'}
            </Text>
            {profile?.phone ? (
              <Text style={[styles.profileDetail, { color: themeColors.textTertiary }]}>
                📱 {profile.phone}
              </Text>
            ) : null}
            {memberSince ? (
              <Text style={[styles.profileDetail, { color: themeColors.textTertiary }]}>
                📅 Miembro desde {memberSince}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Quick info chips */}
        <View style={styles.chipRow}>
          {profile?.currency ? (
            <View style={[styles.infoChip, { backgroundColor: themeColors.primary + '12' }]}>
              <Text style={[styles.infoChipText, { color: themeColors.primary }]}>
                💰 {profile.currency}
              </Text>
            </View>
          ) : null}
          <View style={[styles.infoChip, { backgroundColor: themeColors.primary + '12' }]}>
            <Text style={[styles.infoChipText, { color: themeColors.primary }]}>
              🌐 Español
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[neuSurface(scheme, 'flat'), styles.editProfileBtn, { borderColor: themeColors.primary }]}
          onPress={handleEditProfile}
          accessibilityRole="button"
          accessibilityLabel="Editar perfil"
        >
          <Text style={[styles.editProfileBtnText, { color: themeColors.primary }]}>Editar Perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Status Section */}
      <View style={[neuSurface(scheme, 'raised'), styles.sectionCard]}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Estado de Sincronización</Text>
        <SyncStatusIndicator
          status={status}
          label={syncConfig.label}
          color={syncConfig.color}
          lastSyncAt={lastSyncAt}
          pendingCount={pendingCount}
        />
      </View>

      {/* Theme Section */}
      <View style={[neuSurface(scheme, 'raised'), styles.sectionCard]}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Apariencia</Text>
        <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
          Elige el tema de la aplicación.
        </Text>
        <View style={styles.themeRow}>
          <ThemeOption
            label="☀️ Claro"
            isActive={mode === 'light'}
            onPress={() => setMode('light')}
            themeColors={themeColors}
          />
          <ThemeOption
            label="🌙 Oscuro"
            isActive={mode === 'dark'}
            onPress={() => setMode('dark')}
            themeColors={themeColors}
          />
          <ThemeOption
            label="📱 Sistema"
            isActive={mode === 'system'}
            onPress={() => setMode('system')}
            themeColors={themeColors}
          />
        </View>
      </View>

      {/* Export Section */}
      <View style={[neuSurface(scheme, 'raised'), styles.sectionCard]}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Exportar Datos</Text>
        <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
          Genera reportes en PDF o CSV con los movimientos de tu cuenta.
        </Text>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.primary }, neuShadow(scheme, 'raised')]}
          onPress={handleExportData}
          accessibilityRole="button"
          accessibilityLabel="Generar reporte"
        >
          <Text style={styles.actionButtonText}>Generar Reporte</Text>
        </TouchableOpacity>
      </View>

      {/* Export for AI Section */}
      <View style={[neuSurface(scheme, 'raised'), styles.sectionCard]}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Asesoría con IA</Text>
        <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
          Exporta tus datos financieros con un prompt listo para pegar en ChatGPT y recibir asesoría personalizada.
        </Text>
        <TouchableOpacity
          style={[styles.actionButton, styles.aiButton, { backgroundColor: themeColors.tertiary }, neuShadow(scheme, 'raised')]}
          onPress={() => navigation.navigate('ExportForAI')}
          accessibilityRole="button"
          accessibilityLabel="Exportar para ChatGPT"
        >
          <Text style={styles.actionButtonText}>Exportar para ChatGPT</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Section */}
      <View style={[neuSurface(scheme, 'raised'), styles.sectionCard]}>
        <TouchableOpacity
          style={[neuSurface(scheme, 'flat'), styles.logoutButton, { borderColor: themeColors.redExpenses }]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Text style={[styles.logoutButtonText, { color: themeColors.redExpenses }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Profile Avatar ──────────────────────────────────────────────────────────

interface ProfileAvatarProps {
  displayName: string | null | undefined;
  themeColors: any;
}

function ProfileAvatar({ displayName, themeColors }: ProfileAvatarProps) {
  const initials = getInitials(displayName ?? '');

  return (
    <View style={[styles.avatar, { backgroundColor: themeColors.primary + '20' }]}>
      <Text style={[styles.avatarText, { color: themeColors.primary }]}>
        {initials || '👤'}
      </Text>
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
  const themeColors = useThemeColors();

  return (
    <View style={styles.syncContainer}>
      <View style={styles.syncStatusRow}>
        <View style={[styles.syncDot, { backgroundColor: color }]} />
        <Text style={[styles.syncLabel, { color }]}>{label}</Text>
      </View>

      {lastSyncAt && (
        <Text style={[styles.syncDetail, { color: themeColors.textTertiary }]}>
          Última sincronización: {formatSyncTime(lastSyncAt)}
        </Text>
      )}

      {!lastSyncAt && (
        <Text style={[styles.syncDetail, { color: themeColors.textTertiary }]}>Sin sincronizar aún</Text>
      )}

      {pendingCount > 0 && (
        <Text style={[styles.syncPending, { color: themeColors.redExpenses }]}>
          {pendingCount} {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
        </Text>
      )}
    </View>
  );
}

// ─── Theme Option ────────────────────────────────────────────────────────────

interface ThemeOptionProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  themeColors: any;
}

function ThemeOption({ label, isActive, onPress, themeColors }: ThemeOptionProps) {
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  return (
    <TouchableOpacity
      style={[
        neuSurface(scheme, 'flat'),
        styles.themeOption,
        isActive && { backgroundColor: themeColors.primary, ...neuShadow(scheme, 'pressed') },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Tema ${label}`}
    >
      <Text style={[
        styles.themeOptionText,
        { color: isActive ? themeColors.textInverse : themeColors.textSecondary },
        isActive && { fontWeight: '700' },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },

  // Profile Card
  profileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  profileDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  infoChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editProfileBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  editProfileBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Section Card
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
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
    marginLeft: 20,
  },
  syncPending: {
    fontSize: 13,
    marginLeft: 20,
    fontWeight: '500',
  },

  // Action Button
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  aiButton: {
},

  // Theme Section
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Logout Button
  logoutButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
