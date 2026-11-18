import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset } from '@/lib/neumorphic';
import { useAuthStore } from '@/store/authStore';
import { ProfileService } from '@/services/profile/profileService';
import { supabase } from '@/lib/supabase';
import { AppIcon } from '@/components/AppIcon';
import { BrandLogo } from '@/components/BrandLogo';
import { formatPesos } from '@/utils/money';
import type { Currency } from '@/types';

const SLIDE_WIDTH = 480;

interface Slide {
  id: 'welcome' | 'accounts' | 'transactions' | 'budgets' | 'profile';
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    title: 'Tu dinero, claro y en un solo lugar',
    description:
      'Planify junta tus cuentas, gastos, presupuestos y metas para que sepas cuánto tienes y a dónde se va.',
  },
  {
    id: 'accounts',
    title: 'Todas tus cuentas, un solo saldo',
    description: 'Agrega banco, efectivo y tarjetas. El total se actualiza con cada movimiento.',
  },
  {
    id: 'transactions',
    title: 'Anota lo que entra y lo que sale',
    description: 'Registra ingresos y gastos por categoría y mira en qué se te va el dinero cada mes.',
  },
  {
    id: 'budgets',
    title: 'Ponle límite a cada categoría',
    description: 'Crea presupuestos mensuales y metas de ahorro, y sigue cuánto te queda.',
  },
  {
    id: 'profile',
    title: '¿Cómo te llamamos?',
    description: 'Tu nombre y tu moneda principal. Puedes cambiarlos después en Ajustes.',
  },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'COP', label: 'COP' },
  { value: 'USD', label: 'USD' },
  { value: 'MXN', label: 'MXN' },
  { value: 'ARS', label: 'ARS' },
  { value: 'PEN', label: 'PEN' },
  { value: 'CLP', label: 'CLP' },
  { value: 'BRL', label: 'BRL' },
  { value: 'EUR', label: 'EUR' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingScreen() {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = Math.min(windowWidth, SLIDE_WIDTH);

  const flatListRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState<Currency>('COP');
  const [saving, setSaving] = useState(false);

  const isLast = activeIndex === SLIDES.length - 1;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const getItemLayout = useCallback(
    (_data: ArrayLike<Slide> | null | undefined, index: number) => ({
      length: slideWidth,
      offset: slideWidth * index,
      index,
    }),
    [slideWidth]
  );

  const onScrollToIndexFailed = useCallback(
    ({ index }: { index: number }) => {
      flatListRef.current?.scrollToOffset({ offset: slideWidth * index, animated: true });
    },
    [slideWidth]
  );

  // El índice se fija aquí además de en onViewableItemsChanged, que no siempre dispara tras scrollToIndex
  const goTo = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };
  const goToNext = () => {
    if (activeIndex < SLIDES.length - 1) goTo(activeIndex + 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const profileService = new ProfileService();
      await profileService.update({
        displayName: displayName.trim() || null,
        currency,
      });
    } catch {
      // Non-critical — profile can be updated later from Settings
    } finally {
      setSaving(false);
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  // El flag de onboarding vive en el dispositivo: en una instalación nueva, un usuario ya configurado lo salta
  const [checkingExisting, setCheckingExisting] = useState(true);
  useEffect(() => {
    const userId = useAuthStore.getState().userId;
    Promise.all([
      new ProfileService().get(),
      supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ])
      .then(([profile, { count }]) => {
        if (profile.displayName || (count ?? 0) > 0) return completeOnboarding();
        setCheckingExisting(false);
      })
      .catch(() => setCheckingExisting(false));
  }, [completeOnboarding]);

  if (checkingExisting) {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundPrimary, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + 12 }]}
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Saltar introducción"
        >
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>Saltar</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        scrollEventThrottle={16}
        style={[styles.flatList, { width: slideWidth }]}
        renderItem={({ item }) => (
          <SlideItem
            slide={item}
            width={slideWidth}
            scheme={scheme}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            currency={currency}
            onCurrencyChange={setCurrency}
          />
        )}
      />

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goTo(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Ir al paso ${i + 1} de ${SLIDES.length}`}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: i === activeIndex ? colors.primary : colors.border },
                  i === activeIndex && styles.dotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.primary },
            neuShadow(scheme, 'raised'),
            saving && { opacity: 0.7 },
          ]}
          onPress={isLast ? handleFinish : goToNext}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Empezar a usar Planify' : 'Siguiente'}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonText}>{isLast ? 'Empezar' : 'Siguiente'}</Text>
              {!isLast && <AppIcon name="arrow-right" size={18} color="#fff" />}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Slide Item ───────────────────────────────────────────────────────────────

interface SlideItemProps {
  slide: Slide;
  width: number;
  scheme: 'light' | 'dark';
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  currency: Currency;
  onCurrencyChange: (v: Currency) => void;
}

function SlideItem({
  slide,
  width,
  scheme,
  displayName,
  onDisplayNameChange,
  currency,
  onCurrencyChange,
}: SlideItemProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.slideInner}>
        <View style={[styles.preview, neuSurface(scheme, 'raised'), { backgroundColor: colors.surface }]}>
          <SlidePreview id={slide.id} displayName={displayName} currency={currency} />
        </View>

        <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>{slide.title}</Text>
        <Text style={[styles.slideDescription, { color: colors.textSecondary }]}>
          {slide.description}
        </Text>

        {slide.id === 'profile' && (
          <View style={styles.profileForm}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nombre o apodo</Text>
            <TextInput
              style={[neuInset(scheme), styles.textInput, { color: colors.textPrimary }]}
              value={displayName}
              onChangeText={onDisplayNameChange}
              placeholder="Tu nombre o apodo"
              placeholderTextColor={colors.textTertiary}
              maxLength={40}
              autoCapitalize="words"
              accessibilityLabel="Nombre o apodo"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 20 }]}>
              Moneda principal
            </Text>
            <View style={styles.currencyGrid}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.currencyChip,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    currency === c.value && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '18',
                    },
                  ]}
                  onPress={() => onCurrencyChange(c.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: currency === c.value }}
                  accessibilityLabel={`Moneda ${c.value}`}
                >
                  <Text
                    style={[
                      styles.currencyChipText,
                      { color: currency === c.value ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Previews: una muestra de cómo se ve cada función, con datos de ejemplo ───

function Row({ label, amount, color }: { label: string; amount: number; color?: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowAmount, { color: color ?? colors.textPrimary }]}>{formatPesos(amount)}</Text>
    </View>
  );
}

function Bar({ label, spent, limit }: { label: string; spent: number; limit: number }) {
  const colors = useThemeColors();
  const ratio = spent / limit;
  return (
    <View style={styles.barBlock}>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.barCaption, { color: colors.textTertiary }]}>
          {formatPesos(spent)} de {formatPesos(limit)}
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.round(ratio * 100)}%`, backgroundColor: ratio > 0.85 ? colors.tertiary : colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

function SlidePreview({ id, displayName, currency }: { id: Slide['id']; displayName: string; currency: Currency }) {
  const colors = useThemeColors();
  switch (id) {
    case 'welcome':
      return (
        <View style={styles.welcome}>
          <BrandLogo size={64} />
          <Text style={[styles.wordmark, { color: colors.textPrimary }]}>Planify</Text>
        </View>
      );
    case 'accounts':
      return (
        <View>
          <Row label="Banco" amount={2450000} />
          <Row label="Efectivo" amount={180000} />
          <Row label="Tarjeta de crédito" amount={-320000} color={colors.redExpenses} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row label="Saldo total" amount={2310000} color={colors.primary} />
        </View>
      );
    case 'transactions':
      return (
        <View>
          <Row label="Salario" amount={3200000} color={colors.greenEarns} />
          <Row label="Mercado" amount={-185400} color={colors.redExpenses} />
          <Row label="Transporte" amount={-42000} color={colors.redExpenses} />
          <Row label="Restaurante" amount={-68000} color={colors.redExpenses} />
        </View>
      );
    case 'budgets':
      return (
        <View>
          <Bar label="Comida" spent={340000} limit={500000} />
          <Bar label="Ocio" spent={184000} limit={200000} />
        </View>
      );
    case 'profile':
      return (
        <View>
          <Text style={[styles.greeting, { color: colors.textPrimary }]} numberOfLines={1}>
            Hola, {displayName.trim() || 'tú'}
          </Text>
          <Text style={[styles.barCaption, { color: colors.textTertiary }]}>
            Verás tus montos en {currency}
          </Text>
        </View>
      );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  flatList: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Slide
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 24,
  },
  slideInner: {
    width: '100%',
    maxWidth: 440,
  },
  preview: {
    padding: 20,
    marginBottom: 36,
    minHeight: 168,
    justifyContent: 'center',
  },

  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  slideDescription: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Previews
  welcome: { alignItems: 'center', gap: 12 },
  wordmark: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 6 },
  rowLabel: { fontSize: 14 },
  rowAmount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  barBlock: { paddingVertical: 6 },
  barCaption: { fontSize: 12, fontVariant: ['tabular-nums'] },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  greeting: { fontSize: 24, fontWeight: '800', marginBottom: 4 },

  // Profile form
  profileForm: {
    width: '100%',
    marginTop: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  textInput: {
    padding: 14,
    fontSize: 16,
    width: '100%',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom bar
  bottomBar: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  actionButton: {
    width: '100%',
    maxWidth: 440,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
