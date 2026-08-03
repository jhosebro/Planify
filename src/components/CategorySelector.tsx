import React, { useCallback, useEffect, useState } from 'react';
import { colors } from '@/theme';
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
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selectedId === cat.id && styles.chipActive]}
            onPress={() => onSelect(cat.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedId === cat.id }}
          >
            <Text style={[styles.chipText, selectedId === cat.id && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.addChip}
          onPress={() => setShowCreate(true)}
          accessibilityRole="button"
          accessibilityLabel="Crear nueva categoría"
        >
          <Text style={styles.addChipText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={styles.createRow}>
          <TextInput
            style={styles.createInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nombre de categoría"
            placeholderTextColor="#999"
            autoFocus
            accessibilityLabel="Nombre de la nueva categoría"
          />
          <TouchableOpacity
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={creating}
          >
            <Text style={styles.createButtonText}>{creating ? '...' : '✓'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => { setShowCreate(false); setNewName(''); }}
          >
            <Text style={styles.cancelButtonText}>✕</Text>
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#E6F4FF',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primary,
  },
  addChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: '#fff',
  },
  addChipText: {
    fontSize: 13,
    color: colors.primary,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    color: colors.secondary,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
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
    borderRadius: 18,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '700',
  },
});
