import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset } from '@/lib/neumorphic';
import { TrackingService } from '@/services/tracking';
import type { TrackingItem } from '@/services/tracking';
import type { MainStackParamList } from '@/navigation/types';

export function AddTrackingItemModal() {
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'AddTrackingItem'>>();
  const { listId, itemId } = route.params;
  const isEditing = !!itemId;

  const trackingService = useMemo(() => new TrackingService(), []);

  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [lastPurchaseDateText, setLastPurchaseDateText] = useState('');
  const [durationDaysText, setDurationDaysText] = useState('');
  const [needsToBuy, setNeedsToBuy] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingItem, setLoadingItem] = useState(isEditing);

  // Load existing item for editing
  useEffect(() => {
    if (!isEditing) return;

    (async () => {
      try {
        const items = await trackingService.getItemsByList(listId);
        const existing = items.find((i) => i.id === itemId);
        if (existing) {
          setName(existing.name);
          setPriceText(String(existing.price / 100));
          if (existing.lastPurchaseDate) {
            setLastPurchaseDateText(formatDateForInput(existing.lastPurchaseDate));
          }
          if (existing.averageDurationDays) {
            setDurationDaysText(String(existing.averageDurationDays));
          }
          setNeedsToBuy(existing.needsToBuy);
          setNotes(existing.notes ?? '');
        }
      } catch (error) {
        console.error('Error loading item for edit:', error);
      } finally {
        setLoadingItem(false);
      }
    })();
  }, [isEditing, itemId, listId, trackingService]);

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Campo requerido', 'Ingresa el nombre del producto');
      return;
    }

    const price = Math.round(parseFloat(priceText || '0') * 100);
    if (price <= 0) {
      showAlert('Campo requerido', 'Ingresa un precio válido');
      return;
    }

    const durationDays = durationDaysText ? parseInt(durationDaysText, 10) : undefined;
    const lastPurchaseDate = parseDateInput(lastPurchaseDateText);

    setSaving(true);
    try {
      if (isEditing && itemId) {
        await trackingService.updateItem(itemId, {
          name: name.trim(),
          price,
          lastPurchaseDate: lastPurchaseDate ?? null,
          averageDurationDays: durationDays ?? null,
          needsToBuy,
          notes: notes.trim() || null,
        });
      } else {
        await trackingService.createItem({
          listId,
          name: name.trim(),
          price,
          lastPurchaseDate: lastPurchaseDate ?? undefined,
          averageDurationDays: durationDays,
          needsToBuy,
          notes: notes.trim() || undefined,
        });
      }
      navigation.goBack();
    } catch (error: any) {
      showAlert('Error', error.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  if (loadingItem) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}
        contentContainerStyle={styles.content}
      >
        {/* Name */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Nombre del producto *</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: themeColors.textPrimary }]}
          placeholder="Ej: Detergente líquido"
          placeholderTextColor={themeColors.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus={!isEditing}
        />

        {/* Price */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Precio *</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: themeColors.textPrimary }]}
          placeholder="Ej: 15000"
          placeholderTextColor={themeColors.textTertiary}
          value={priceText}
          onChangeText={setPriceText}
          keyboardType="numeric"
        />

        {/* Last purchase date */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Última fecha de compra</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: themeColors.textPrimary }]}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={themeColors.textTertiary}
          value={lastPurchaseDateText}
          onChangeText={setLastPurchaseDateText}
          keyboardType="numeric"
        />
        <Text style={[styles.hint, { color: themeColors.textTertiary }]}>
          Formato: día/mes/año (ej: 15/08/2026)
        </Text>

        {/* Average duration */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Duración promedio (días)</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: themeColors.textPrimary }]}
          placeholder="Ej: 30"
          placeholderTextColor={themeColors.textTertiary}
          value={durationDaysText}
          onChangeText={setDurationDaysText}
          keyboardType="numeric"
        />
        <Text style={[styles.hint, { color: themeColors.textTertiary }]}>
          Cuántos días dura el producto aproximadamente. Se usará para calcular cuándo necesitas comprarlo de nuevo.
        </Text>

        {/* Needs to buy toggle */}
        <View style={[styles.toggleRow, neuSurface(scheme, 'flat')]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: themeColors.textPrimary }]}>Necesito comprarlo</Text>
            <Text style={[styles.toggleHint, { color: themeColors.textTertiary }]}>
              Marcarlo como pendiente de compra
            </Text>
          </View>
          <Switch
            value={needsToBuy}
            onValueChange={setNeedsToBuy}
            trackColor={{ true: themeColors.primary, false: themeColors.border }}
          />
        </View>

        {/* Notes */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: themeColors.inputBackground, color: themeColors.textPrimary, borderColor: themeColors.border }]}
          placeholder="Marca preferida, tamaño, dónde comprarlo..."
          placeholderTextColor={themeColors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: themeColors.primary }, neuShadow(scheme, 'raised'), saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Agregar producto'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function formatDateForInput(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseDateInput(text: string): Date | undefined {
  if (!text) return undefined;
  const parts = text.split('/');
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return undefined;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return undefined;
  return date;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  loadingText: { textAlign: 'center', marginTop: 40, fontSize: 15 },

  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, marginTop: 4 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12 },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  toggleHint: { fontSize: 12, marginTop: 2 },

  saveButton: { marginTop: 28, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
