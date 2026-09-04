import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow } from '@/lib/neumorphic';
import { ExportForAIService, type AIExportData } from '@/services/export/exportForAIService';

/**
 * Modal para exportar datos financieros con prompt integrado para ChatGPT.
 * Genera un JSON con toda la información relevante y un prompt de sistema
 * para que ChatGPT pueda dar asesoría financiera personalizada.
 */
export function ExportForAIModal() {
  const navigation = useNavigation();
  const service = useMemo(() => new ExportForAIService(), []);
  const scheme = useIsDarkTheme() ? 'dark' : 'light';

  const [loading, setLoading] = useState(false);
  const [exportData, setExportData] = useState<AIExportData | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const data = await service.generate();
      setExportData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [service]);

  const handleCopy = useCallback(async () => {
    if (!exportData) return;

    const text = service.formatForClipboard(exportData);

    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // Fallback: select a textarea
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } else {
      // React Native: use Share as clipboard fallback
      // expo-clipboard is not installed, so we'll use Share
      await Share.share({
        message: text,
        title: 'Datos financieros para ChatGPT',
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }, [exportData, service]);

  const handleShare = useCallback(async () => {
    if (!exportData) return;
    const text = service.formatForClipboard(exportData);

    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({ title: 'Datos financieros para ChatGPT', text });
      } else {
        // Fallback to copy
        await handleCopy();
      }
    } else {
      await Share.share({
        message: text,
        title: 'Datos financieros para ChatGPT',
      });
    }
  }, [exportData, service, handleCopy]);

  // Summary stats for preview
  const summary = exportData
    ? {
        cuentas: exportData.cuentas.length,
        transacciones: exportData.transacciones_últimos_3_meses.length,
        presupuestos: exportData.presupuestos.length,
        deudas: exportData.deudas.length,
        metas: exportData.metas_financieras.length,
        recordatorios: exportData.recordatorios_pendientes.length,
      }
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header explanation */}
      <View style={[styles.headerCard, neuSurface(scheme, 'raised'), { borderRadius: 12 }]}>
        <Ionicons name="sparkles" size={32} color={colors.primary} />
        <Text style={styles.headerTitle}>Exportar para ChatGPT</Text>
        <Text style={styles.headerDescription}>
          Genera un archivo con toda tu información financiera y un prompt especializado.
          Solo pégalo en ChatGPT para recibir asesoría financiera personalizada.
        </Text>
      </View>

      {/* What's included */}
      <View style={[styles.card, neuSurface(scheme, 'raised'), { borderRadius: 12 }]}>
        <Text style={styles.cardTitle}>¿Qué se incluye?</Text>
        <View style={styles.featureList}>
          <FeatureItem icon="wallet-outline" text="Cuentas y saldos" />
          <FeatureItem icon="swap-vertical-outline" text="Transacciones (últimos 3 meses)" />
          <FeatureItem icon="pie-chart-outline" text="Presupuestos y consumo" />
          <FeatureItem icon="card-outline" text="Deudas, cuotas y cuentas por cobrar" />
          <FeatureItem icon="trophy-outline" text="Metas de ahorro y progreso" />
          <FeatureItem icon="alarm-outline" text="Pagos pendientes" />
          <FeatureItem icon="chatbubble-ellipses-outline" text="Prompt de asesoría incluido" />
        </View>
      </View>

      {/* Generate button */}
      {!exportData && (
        <TouchableOpacity
          style={[styles.generateButton, neuShadow(scheme, 'raised'), loading && styles.disabledButton]}
          onPress={handleGenerate}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Generar exportación para ChatGPT"
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generar Exportación</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={colors.redExpenses} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {exportData && summary && (
        <>
          <View style={[styles.card, neuSurface(scheme, 'raised'), { borderRadius: 12 }]}>
            <Text style={styles.cardTitle}>Resumen generado</Text>
            <View style={styles.statsGrid}>
              <StatBadge label="Cuentas" value={summary.cuentas} />
              <StatBadge label="Transacciones" value={summary.transacciones} />
              <StatBadge label="Presupuestos" value={summary.presupuestos} />
              <StatBadge label="Deudas" value={summary.deudas} />
              <StatBadge label="Metas" value={summary.metas} />
              <StatBadge label="Recordatorios" value={summary.recordatorios} />
            </View>
            <Text style={styles.balanceText}>
              Balance total: {exportData.resumen_general.balance_total}
            </Text>
            <Text style={styles.periodText}>
              Tasa de ahorro mes actual: {exportData.resumen_general.tasa_ahorro}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, neuShadow(scheme, 'raised'), copied && styles.actionButtonSuccess]}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Copiado' : 'Copiar al portapapeles'}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={20}
                color={copied ? colors.greenEarns : '#fff'}
              />
              <Text style={[styles.actionButtonText, copied && styles.actionButtonTextSuccess]}>
                {copied ? '¡Copiado!' : 'Copiar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, neuShadow(scheme, 'raised')]}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Compartir exportación"
            >
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Compartir</Text>
            </TouchableOpacity>
          </View>

          {/* Regenerate */}
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={handleGenerate}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Regenerar exportación"
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.regenerateText}>Regenerar</Text>
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>¿Cómo usar?</Text>
            <Text style={styles.instructionStep}>1. Presiona "Copiar"</Text>
            <Text style={styles.instructionStep}>2. Abre ChatGPT (o tu IA preferida)</Text>
            <Text style={styles.instructionStep}>3. Pega el texto y envíalo</Text>
            <Text style={styles.instructionStep}>4. Recibe tu asesoría financiera personalizada</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  return (
    <View style={[styles.statBadge, neuSurface(scheme, 'flat'), { borderRadius: 8 }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header
  headerCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Cards
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  // Features
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
  },

  // Generate button
  generateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error
  errorCard: {
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.redExpenses,
    fontSize: 14,
    flex: 1,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statBadge: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },

  balanceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  periodText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonSuccess: {
    backgroundColor: '#E8F8EF',
    borderWidth: 1,
    borderColor: colors.greenEarns,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonTextSuccess: {
    color: colors.greenEarns,
  },

  // Regenerate
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 16,
  },
  regenerateText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Instructions
  instructionsCard: {
    backgroundColor: '#EFF8FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D0E8F7',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 10,
  },
  instructionStep: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
    lineHeight: 18,
  },
});
