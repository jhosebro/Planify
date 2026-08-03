import React, { useEffect, useMemo, useState } from 'react';
import { colors } from '@/theme';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReportService } from '@/services/reports/reportService';
import type { MainStackParamList } from '@/navigation/types';
import type { ReportFormat, GeneratedReport } from '@/types/reports';

type GenerateReportNavProp = NativeStackNavigationProp<MainStackParamList, 'GenerateReport'>;

interface AccountRow {
  id: string;
  name: string;
}

interface CategoryRow {
  id: string;
  name: string;
}

/**
 * Modal para generar reportes financieros.
 * Permite seleccionar formato (PDF/CSV), rango de fechas y filtros opcionales.
 * Al generar exitosamente, ofrece opciones de compartir.
 *
 * Requisitos: 9.1, 9.4
 */
export function GenerateReportModal() {
  const navigation = useNavigation<GenerateReportNavProp>();
  const reportService = useMemo(() => new ReportService(), []);

  // Form state
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Data
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadFilterOptions();
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateFrom(formatDateToInput(firstDay));
    setDateTo(formatDateToInput(lastDay));
  }, []);

  const loadFilterOptions = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { useAuthStore } = await import('@/store/authStore');
      const userId = useAuthStore.getState().userId!;

      const { data: accountRows } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('name');
      setAccounts(accountRows ?? []);

      const { data: categoryRows } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .order('name');
      setCategories(categoryRows ?? []);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleGenerate = async () => {
    // Validate date range
    if (!dateFrom.trim() || !dateTo.trim()) {
      Alert.alert('Error', 'Debes seleccionar un rango de fechas.');
      return;
    }

    const parsedFrom = new Date(dateFrom);
    const parsedTo = new Date(dateTo);

    if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
      Alert.alert('Error', 'Las fechas ingresadas no son válidas. Usa formato AAAA-MM-DD.');
      return;
    }

    if (parsedFrom > parsedTo) {
      Alert.alert('Error', 'La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    setGenerating(true);
    try {
      const report = await reportService.generate({
        format,
        dateFrom: parsedFrom,
        dateTo: parsedTo,
        accountId: selectedAccountId ?? undefined,
        categoryId: selectedCategoryId ?? undefined,
      });
      setGeneratedReport(report);
    } catch (error) {
      Alert.alert(
        'Error al generar reporte',
        error instanceof Error ? error.message : 'Ocurrió un error inesperado. Intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async (method: 'email' | 'save' | 'share') => {
    if (!generatedReport) return;

    setSharing(true);
    try {
      await reportService.share(generatedReport.id, method);
      if (method === 'save') {
        Alert.alert('Éxito', 'El reporte se guardó correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el reporte. Intenta de nuevo.');
    } finally {
      setSharing(false);
    }
  };

  // If a report was generated, show the share options screen
  if (generatedReport) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Reporte Generado</Text>

          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>¡Reporte listo!</Text>
            <Text style={styles.successDetail}>
              {generatedReport.format.toUpperCase()} • {generatedReport.fileName}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Compartir</Text>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => handleShare('email')}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel="Enviar por email"
          >
            <Text style={styles.shareOptionIcon}>✉</Text>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>Enviar por email</Text>
              <Text style={styles.shareOptionDescription}>
                Comparte el reporte via correo electrónico
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => handleShare('save')}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel="Guardar en dispositivo"
          >
            <Text style={styles.shareOptionIcon}>💾</Text>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>Guardar en dispositivo</Text>
              <Text style={styles.shareOptionDescription}>
                Almacena el reporte localmente
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => handleShare('share')}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel="Compartir con otras apps"
          >
            <Text style={styles.shareOptionIcon}>↗</Text>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>Compartir</Text>
              <Text style={styles.shareOptionDescription}>
                Comparte con otras aplicaciones del dispositivo
              </Text>
            </View>
          </TouchableOpacity>

          {sharing && (
            <ActivityIndicator style={styles.sharingIndicator} size="small" color={colors.primary} />
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setGeneratedReport(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>Generar otro</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Generar Reporte</Text>

        {/* Format Selector */}
        <Text style={styles.label}>Formato</Text>
        <View style={styles.formatRow}>
          <TouchableOpacity
            style={[styles.formatButton, format === 'pdf' && styles.formatButtonActive]}
            onPress={() => setFormat('pdf')}
            accessibilityRole="button"
            accessibilityState={{ selected: format === 'pdf' }}
            accessibilityLabel="Formato PDF"
          >
            <Text style={[styles.formatButtonText, format === 'pdf' && styles.formatButtonTextActive]}>
              PDF
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.formatButton, format === 'csv' && styles.formatButtonActive]}
            onPress={() => setFormat('csv')}
            accessibilityRole="button"
            accessibilityState={{ selected: format === 'csv' }}
            accessibilityLabel="Formato CSV"
          >
            <Text style={[styles.formatButtonText, format === 'csv' && styles.formatButtonTextActive]}>
              CSV
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Range */}
        <Text style={styles.label}>Fecha inicial (AAAA-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dateFrom}
          onChangeText={setDateFrom}
          placeholder="2024-01-01"
          placeholderTextColor="#999"
          accessibilityLabel="Fecha inicial del reporte"
        />

        <Text style={styles.label}>Fecha final (AAAA-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dateTo}
          onChangeText={setDateTo}
          placeholder="2024-01-31"
          placeholderTextColor="#999"
          accessibilityLabel="Fecha final del reporte"
        />

        {/* Optional Account Filter */}
        <Text style={styles.label}>Cuenta (opcional)</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedAccountId === null && styles.filterChipActive]}
            onPress={() => setSelectedAccountId(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedAccountId === null }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedAccountId === null && styles.filterChipTextActive,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[styles.filterChip, selectedAccountId === acc.id && styles.filterChipActive]}
              onPress={() => setSelectedAccountId(acc.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedAccountId === acc.id }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedAccountId === acc.id && styles.filterChipTextActive,
                ]}
              >
                {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional Category Filter */}
        <Text style={styles.label}>Categoría (opcional)</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategoryId === null && styles.filterChipActive]}
            onPress={() => setSelectedCategoryId(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategoryId === null }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategoryId === null && styles.filterChipTextActive,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, selectedCategoryId === cat.id && styles.filterChipActive]}
              onPress={() => setSelectedCategoryId(cat.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategoryId === cat.id }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategoryId === cat.id && styles.filterChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, generating && styles.submitButtonDisabled]}
            onPress={handleGenerate}
            disabled={generating}
            accessibilityRole="button"
            accessibilityLabel="Generar reporte"
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Generar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateToInput(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },

  // Format selector
  formatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  formatButtonActive: {
    backgroundColor: '#EBF4FF',
    borderColor: colors.primary,
  },
  formatButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  formatButtonTextActive: {
    color: colors.primary,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EBF4FF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primary,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },

  // Success state
  successCard: {
    backgroundColor: '#ECFDF0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.greenEarns,
  },
  successIcon: {
    fontSize: 32,
    color: colors.greenEarns,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.greenEarns,
    marginBottom: 4,
  },
  successDetail: {
    fontSize: 14,
    color: '#555',
  },

  // Share options
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  shareOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  shareOptionContent: {
    flex: 1,
  },
  shareOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  shareOptionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sharingIndicator: {
    marginTop: 12,
  },
});
