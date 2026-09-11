import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface, neuShadow, neuInset } from '@/lib/neumorphic';
import { useAuthStore } from '@/store/authStore';
import { ProfileService } from '@/services/profile/profileService';
import type { Currency } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = Math.min(SCREEN_WIDTH, 480);

// ─── Slide data ───────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  emoji: string;
  title: string;
  description: string;
  isProfile?: boolean;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    emoji: '👋',
    title: '¡Bienvenido a Planify!',
    description:
      'Tu compañero financiero personal. Controla tus ingresos, gastos, presupuestos y metas desde un solo lugar.',
  },
  {
    id: 'accounts',
    emoji: '🏦',
    title: 'Organiza tus cuentas',
    description:
      'Registra todas tus cuentas — banco, efectivo y tarjetas de crédito — y ten siempre a la vista tu saldo total actualizado.',
  },
  {
    id: 'transactions',
    emoji: '📊',
    title: 'Registra tus movimientos',
    description:
      'Anota ingresos y gastos por categoría, filtra por fecha o cuenta y visualiza tendencias con gráficas claras.',
  },
  {
    id: 'budgets',
    emoji: '🎯',
    title: 'Presupuestos y metas',
    description:
      'Crea presupuestos por categoría con alertas de límite. Establece metas de ahorro y haz seguimiento de tu progreso mes a mes.',
  },
  {
    id: 'profile',
    emoji: '✨',
    title: 'Personaliza tu experiencia',
    description:
      'Dinos cómo llamarte y cuál es tu moneda principal para adaptar Planify a tu día a día.',
    isProfile: true,
  },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'COP', label: '🇨🇴 COP' },
  { value: 'USD', label: '🇺🇸 USD' },
  { value: 'MXN', label: '🇲🇽 MXN' },
  { value: 'ARS', label: '🇦🇷 ARS' },
  { value: 'PEN', label: '🇵🇪 PEN' },
  { value: 'CLP', label: '🇨🇱 CLP' },
  { value: 'BRL', label: '🇧🇷 BRL' },
  { value: 'EUR', label: '🇪🇺 EUR' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingScreen() {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

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

  const goToNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
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
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <SlideItem
            slide={item}
            scheme={scheme}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            currency={currency}
            onCurrencyChange={setCurrency}
          />
        )}
        style={styles.flatList}
      />

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => flatListRef.current?.scrollToIndex({ index: i, animated: true })}
              accessibilityRole="button"
              accessibilityLabel={`Ir al slide ${i + 1}`}
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
          accessibilityLabel={isLast ? 'Comenzar a usar Planify' : 'Siguiente slide'}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              {isLast ? 'Comenzar' : 'Siguiente →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Slide Item ───────────────────────────────────────────────────────────────

interface SlideItemProps {
  slide: Slide;
  scheme: 'light' | 'dark';
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  currency: Currency;
  onCurrencyChange: (v: Currency) => void;
}

function SlideItem({
  slide,
  scheme,
  displayName,
  onDisplayNameChange,
  currency,
  onCurrencyChange,
}: SlideItemProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.slideInner, neuSurface(scheme, 'raised'), { backgroundColor: colors.surface }]}>
        {/* Emoji illustration */}
        <View style={[styles.emojiContainer, { backgroundColor: colors.primary + '18' }]}>
          <Text style={styles.emoji}>{slide.emoji}</Text>
        </View>

        <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>{slide.title}</Text>
        <Text style={[styles.slideDescription, { color: colors.textSecondary }]}>
          {slide.description}
        </Text>

        {/* Profile form — last slide only */}
        {slide.isProfile && (
          <View style={styles.profileForm}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              ¿Cómo te llamamos?
            </Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  slideInner: {
    width: '100%',
    maxWidth: 440,
    padding: 28,
    alignItems: 'center',
  },
  emojiContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  emoji: {
    fontSize: 48,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 32,
  },
  slideDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
  },

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
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
