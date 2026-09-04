import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset } from '@/lib/neumorphic';
import { useProfileStore } from '@/store/profileStore';
import { ProfileService } from '@/services/profile';
import type { Currency } from '@/types';
import type { MainStackParamList } from '@/navigation/types';

type NavProp = NativeStackNavigationProp<MainStackParamList>;

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'COP', label: '🇨🇴 COP' },
  { value: 'USD', label: '🇺🇸 USD' },
  { value: 'EUR', label: '🇪🇺 EUR' },
  { value: 'MXN', label: '🇲🇽 MXN' },
  { value: 'ARS', label: '🇦🇷 ARS' },
  { value: 'PEN', label: '🇵🇪 PEN' },
  { value: 'CLP', label: '🇨🇱 CLP' },
  { value: 'BRL', label: '🇧🇷 BRL' },
];

export function EditProfileModal() {
  const navigation = useNavigation<NavProp>();
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const { profile, setProfile } = useProfileStore();
  const profileService = useMemo(() => new ProfileService(), []);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState<Currency>('COP');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '');
      setPhone(profile.phone ?? '');
      setCurrency(profile.currency);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }

    setSaving(true);
    try {
      const updated = await profileService.update({
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        currency,
      });
      setProfile(updated);
      navigation.goBack();
    } catch (error) {
      console.error('[EditProfileModal] save error:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>✏️ Editar Perfil</Text>

        {/* Display Name */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Nombre</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: themeColors.textPrimary }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tu nombre"
          placeholderTextColor={themeColors.textTertiary}
          autoCapitalize="words"
        />

        {/* Phone */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Teléfono (opcional)</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: themeColors.textPrimary }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+57 300 123 4567"
          placeholderTextColor={themeColors.textTertiary}
          keyboardType="phone-pad"
        />

        {/* Currency */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Moneda principal</Text>
        <View style={styles.currencyGrid}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[
                styles.currencyChip,
                neuSurface(scheme, 'flat'),
                { borderRadius: 20 },
                currency === c.value && { backgroundColor: themeColors.primary, ...neuShadow(scheme, 'pressed') },
              ]}
              onPress={() => setCurrency(c.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: currency === c.value }}
            >
              <Text
                style={[
                  styles.currencyChipText,
                  { color: currency === c.value ? themeColors.textInverse : themeColors.textSecondary },
                  currency === c.value && { fontWeight: '700' },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: themeColors.primary }, neuShadow(scheme, 'raised'), saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Guardar perfil"
        >
          <Text style={styles.submitText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  currencyChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  cancelText: { fontSize: 16, fontWeight: '500' },
});
