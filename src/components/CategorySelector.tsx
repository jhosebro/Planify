import React, { useCallback, useEffect, useState } from 'react';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuInset, neuShadow, neuSurface } from '@/lib/neumorphic';
import { ClayChip } from '@/components/clay';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface CategoryRow {
  id: string;
  name: string;
}

interface CategorySelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CATEGORY_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#7BC67E', '#95A5A6'];

export function CategorySelector({ selectedId, onSelect }: CategorySelectorProps) {
  const themeColors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadCategories = useCallback(async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .order('name');

    const cats = data ?? [];
    setCategories(cats);

    // Auto-select first if nothing selected
    if (cats.length > 0 && !selectedId) {
      onSelect(cats[0].id);
    }
  }, [selectedId, onSelect]);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'El nombre de la categoría es obligatorio.');
      return;
    }

    const userId = useAuthStore.getState().userId;
    if (!userId) return;

    setCreating(true);
    try {
      const randomColor = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name: newName.trim(),
          icon: '📌',
          color: randomColor,
          is_default: false,
        })
        .select('id, name')
        .single();

      if (error) throw new Error(error.message);

      if (data) {
        setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        onSelect(data.id);
        setNewName('');
        setShowCreate(false);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la categoría.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View>
      <View style={styles.container}>
        {categories.map((cat) => (
          <ClayChip
            key={cat.id}
            label={cat.name}
            active={selectedId === cat.id}
            onPress={() => onSelect(cat.id)}
            style={styles.chip}
          />
        ))}

        <TouchableOpacity
          style={[styles.addChip, neuSurface(scheme, 'flat'), { borderColor: themeColors.primary }]}
          onPress={() => setShowCreate(true)}
          accessibilityRole="button"
          accessibilityLabel="Crear nueva categoría"
        >
          <Text style={[styles.addChipText, { color: themeColors.primary }]}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={styles.createRow}>
          <TextInput
            style={[styles.createInput, { ...neuInset(scheme), color: themeColors.textPrimary }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nombre de categoría"
            placeholderTextColor={themeColors.textTertiary}
            autoFocus
            accessibilityLabel="Nombre de la nueva categoría"
          />
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: themeColors.primary, ...neuShadow(scheme, 'raised') }, creating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={creating}
          >
            <Text style={styles.createButtonText}>{creating ? '...' : '✓'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, neuSurface(scheme, 'flat')]}
            onPress={() => { setShowCreate(false); setNewName(''); }}
          >
            <Text style={[styles.cancelButtonText, { color: themeColors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginVertical: 4,
  },
  addChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  addChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  createInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
