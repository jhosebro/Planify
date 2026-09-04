import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset } from '@/lib/neumorphic';
import { TrackingService } from '@/services/tracking';
import type { MainStackParamList } from '@/navigation/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const ICON_OPTIONS = ['📋', '🛒', '🏠', '🧴', '🍎', '💊', '🐶', '👶', '🧹', '🔧', '💻', '📱'];
const COLOR_OPTIONS = ['#007DC3', '#2EAD5D', '#F1632A', '#9B59B6', '#E74C3C', '#1ABC9C', '#F39C12', '#34495E'];

interface BudgetOption {
  id: string;
  categoryName: string;
  monthlyLimit: number;
}

function formatAmount(centavos: number): string {
  const amount = centavos / 100;
  return `$${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function AddTrackingListModal() {
  const themeColors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'AddTrackingList'>>();
  const listId = route.params?.listId;
  const isEditing = !!listId;

  const trackingService = useMemo(() => new TrackingService(), []);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📋');
  const [selectedColor, setSelectedColor] = useState('#007DC3');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [budgetOptions, setBudgetOptions] = useState<BudgetOption[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [loadingList, setLoadingList] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Load available budgets
  useEffect(() => {
    (async () => {
      try {
        const userId = useAuthStore.getState().userId;
        if (!userId) return;

        const { data, error } = await supabase
          .from('budgets')
          .select('id, monthly_limit, categories(name)')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (!error && data) {
          setBudgetOptions(
            data.map((row: any) => ({
              id: row.id,
              categoryName: row.categories?.name ?? 'Sin categoría',
              monthlyLimit: row.monthly_limit,
            }))
          );
        }
      } catch (error) {
        console.error('Error loading budgets:', error);
      } finally {
        setLoadingBudgets(false);
      }
    })();
  }, []);

  // Load existing list data for editing
  useEffect(() => {
    if (!isEditing || !listId) return;

    (async () => {
      try {
        const existing = await trackingService.getListById(listId);
        if (existing) {
          setName(existing.name);
          setDescription(existing.description ?? '');
          setSelectedIcon(existing.icon);
          setSelectedColor(existing.color);
          setSelectedBudgetId(existing.linkedBudgetId ?? null);
        }
      } catch (error) {
        console.error('Error loading list for edit:', error);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [isEditing, listId, trackingService]);

  const handleSave = async () => {
    if (!name.trim()) {
      const msg = 'Ingresa un nombre para la lista';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Campo requerido', msg);
      }
      return;
    }

    setSaving(true);
    try {
      if (isEditing && listId) {
        await trackingService.updateList(listId, {
          name: name.trim(),
          description: description.trim() || undefined,
          icon: selectedIcon,
          color: selectedColor,
          linkedBudgetId: selectedBudgetId,
        });
      } else {
        await trackingService.createList({
          name: name.trim(),
          description: description.trim() || undefined,
          icon: selectedIcon,
          color: selectedColor,
          linkedBudgetId: selectedBudgetId ?? undefined,
        });
      }
      navigation.goBack();
    } catch (error: any) {
      const msg = error.message || 'Error al guardar la lista';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingList) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
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
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Nombre *</Text>
        <TextInput
          style={[styles.input, neuInset(scheme), { color: themeColors.textPrimary }]}
          placeholder="Ej: Productos de aseo"
          placeholderTextColor={themeColors.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus={!isEditing}
        />

        {/* Description */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, neuInset(scheme), { color: themeColors.textPrimary }]}
          placeholder="Describe brevemente esta lista"
          placeholderTextColor={themeColors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {/* Linked Budget */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Vincular a presupuesto (opcional)</Text>
        <Text style={[styles.hint, { color: themeColors.textTertiary }]}>
          Vincula esta lista a un presupuesto para comparar el costo de los productos pendientes contra tu límite mensual.
        </Text>

        {loadingBudgets ? (
          <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 12 }} />
        ) : budgetOptions.length === 0 ? (
          <View style={[styles.noBudgetsCard, neuSurface(scheme, 'flat')]}>
            <Ionicons name="information-circle-outline" size={18} color={themeColors.textTertiary} />
            <Text style={[styles.noBudgetsText, { color: themeColors.textTertiary }]}>
              No tienes presupuestos activos. Crea uno primero desde la sección de Presupuestos.
            </Text>
          </View>
        ) : (
          <View style={styles.budgetList}>
            {/* No budget option */}
            <TouchableOpacity
              style={[
                styles.budgetOption,
                neuSurface(scheme, 'flat'),
                selectedBudgetId === null && { backgroundColor: themeColors.primary + '12' },
              ]}
              onPress={() => setSelectedBudgetId(null)}
            >
              <Ionicons
                name={selectedBudgetId === null ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedBudgetId === null ? themeColors.primary : themeColors.textTertiary}
              />
              <Text style={[styles.budgetOptionText, { color: themeColors.textSecondary }]}>
                Sin presupuesto vinculado
              </Text>
            </TouchableOpacity>

            {budgetOptions.map((budget) => (
              <TouchableOpacity
                key={budget.id}
                style={[
                  styles.budgetOption,
                  neuSurface(scheme, 'flat'),
                  selectedBudgetId === budget.id && { backgroundColor: themeColors.primary + '12' },
                ]}
                onPress={() => setSelectedBudgetId(budget.id)}
              >
                <Ionicons
                  name={selectedBudgetId === budget.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedBudgetId === budget.id ? themeColors.primary : themeColors.textTertiary}
                />
                <View style={styles.budgetOptionInfo}>
                  <Text style={[styles.budgetOptionText, { color: themeColors.textPrimary }]}>
                    {budget.categoryName}
                  </Text>
                  <Text style={[styles.budgetOptionLimit, { color: themeColors.textTertiary }]}>
                    Límite: {formatAmount(budget.monthlyLimit)}/mes
                  </Text>
                </View>
                <Ionicons name="pie-chart-outline" size={16} color={themeColors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Icon */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Ícono</Text>
        <View style={styles.optionsGrid}>
          {ICON_OPTIONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[
                styles.iconOption,
                neuSurface(scheme, 'flat'),
                selectedIcon === icon && { backgroundColor: selectedColor + '22', ...neuShadow(scheme, 'pressed') },
              ]}
              onPress={() => setSelectedIcon(icon)}
            >
              <Text style={styles.iconOptionText}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color */}
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Color</Text>
        <View style={styles.optionsGrid}>
          {COLOR_OPTIONS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => setSelectedColor(color)}
            >
              {selectedColor === color && (
                <Text style={styles.colorCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={[styles.previewCard, neuSurface(scheme, 'raised'), { borderRadius: 12 }]}>
          <Text style={[styles.previewLabel, { color: themeColors.textTertiary }]}>Vista previa</Text>
          <View style={styles.previewContent}>
            <View style={[styles.previewIcon, { backgroundColor: selectedColor + '20' }]}>
              <Text style={styles.previewIconText}>{selectedIcon}</Text>
            </View>
            <View>
              <Text style={[styles.previewName, { color: themeColors.textPrimary }]}>
                {name || 'Mi lista'}
              </Text>
              {selectedBudgetId && (
                <Text style={[styles.previewBudget, { color: themeColors.primary }]}>
                  📊 Presupuesto vinculado
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: themeColors.primary }, neuShadow(scheme, 'raised'), saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear lista'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  hint: { fontSize: 12, marginBottom: 12 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  // Budget selector
  noBudgetsCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12 },
  noBudgetsText: { fontSize: 13, flex: 1 },
  budgetList: { gap: 8 },
  budgetOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  budgetOptionInfo: { flex: 1 },
  budgetOptionText: { fontSize: 14, fontWeight: '500' },
  budgetOptionLimit: { fontSize: 12, marginTop: 2 },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconOption: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconOptionText: { fontSize: 22 },
  colorOption: { width: 40, height: 40, borderRadius: 20 },
  colorOptionSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  colorCheck: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 34 },

  previewCard: { marginTop: 24, borderRadius: 12, padding: 16 },
  previewLabel: { fontSize: 12, marginBottom: 10 },
  previewContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewIconText: { fontSize: 22 },
  previewName: { fontSize: 16, fontWeight: '600' },
  previewBudget: { fontSize: 12, marginTop: 2 },

  saveButton: { marginTop: 28, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
