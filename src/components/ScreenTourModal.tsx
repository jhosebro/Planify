import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuShadow, neuSurface } from '@/lib/neumorphic';
import { AppIcon, type IconName } from '@/components/AppIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TourSlide {
  icon: IconName;
  title: string;
  description: string;
}

interface ScreenTourModalProps {
  visible: boolean;
  slides: TourSlide[];
  /** disableAll: el usuario marcó "No volver a mostrar guías" */
  onClose: (disableAll: boolean) => void;
}

// ─── ScreenTourModal ──────────────────────────────────────────────────────────

export function ScreenTourModal({ visible, slides, onClose }: ScreenTourModalProps) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList<TourSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const isLast = activeIndex === slides.length - 1;
  const isDesktopWeb = Platform.OS === 'web' && windowWidth >= 1024;
  const cardWidth = isDesktopWeb ? Math.min(windowWidth * 0.9, 480) : windowWidth;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const getItemLayout = useCallback(
    (_data: ArrayLike<TourSlide> | null | undefined, index: number) => ({
      length: cardWidth,
      offset: cardWidth * index,
      index,
    }),
    [cardWidth]
  );

  const onScrollToIndexFailed = useCallback(
    ({ index }: { index: number }) => {
      flatListRef.current?.scrollToOffset({ offset: cardWidth * index, animated: true });
    },
    [cardWidth]
  );

  const goNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  const handleClose = () => {
    // Reset to first slide for next open
    setActiveIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    onClose(dontShowAgain);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={handleClose}
      >
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.surface },
            neuShadow(scheme, 'raised'),
            isDesktopWeb && styles.cardDesktop,
          ]}
          onPress={() => {}}
        >
          {/* Handle — mobile only */}
          {!isDesktopWeb && (
            <View style={[styles.handle, { backgroundColor: colors.borderInset }]} />
          )}

          {/* Slides */}
          <FlatList
            ref={flatListRef}
            data={slides}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={getItemLayout}
            onScrollToIndexFailed={onScrollToIndexFailed}
            scrollEventThrottle={16}
            style={styles.flatList}
            renderItem={({ item }) => (
              <SlideItem slide={item} width={cardWidth} />
            )}
          />

          {/* Dot indicators */}
          {slides.length > 1 && (
            <View style={styles.dotsRow}>
              {slides.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() =>
                    flatListRef.current?.scrollToIndex({ index: i, animated: true })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Ir al paso ${i + 1}`}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.border },
                      i === activeIndex && [styles.dotActive, { backgroundColor: colors.primary }],
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Pressable
            style={styles.checkRow}
            onPress={() => setDontShowAgain((v) => !v)}
            accessibilityRole="checkbox"
            aria-checked={dontShowAgain}
          >
            <View
              style={[
                styles.checkBox,
                { borderColor: dontShowAgain ? colors.primary : colors.border },
                dontShowAgain && { backgroundColor: colors.primary },
              ]}
            >
              {dontShowAgain && <AppIcon name="check" size={14} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={[styles.checkText, { color: colors.textSecondary }]}>
              No volver a mostrar guías
            </Text>
          </Pressable>

          {/* Actions */}
          <View style={[styles.actions, { paddingBottom: isDesktopWeb ? 0 : insets.bottom }]}>
            {!isLast ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar guía"
                >
                  <Text style={[styles.skipText, { color: colors.textTertiary }]}>
                    Saltar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.nextBtn,
                    { backgroundColor: colors.primary },
                    neuShadow(scheme, 'raised'),
                  ]}
                  onPress={goNext}
                  accessibilityRole="button"
                  accessibilityLabel="Siguiente paso"
                >
                  <View style={styles.nextBtnContent}>
                    <Text style={styles.nextBtnText}>Siguiente</Text>
                    <AppIcon name="arrow-right" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.doneBtn,
                  { backgroundColor: colors.primary },
                  neuShadow(scheme, 'raised'),
                ]}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Entendido, cerrar guía"
              >
                <Text style={styles.nextBtnText}>¡Entendido!</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Slide Item ───────────────────────────────────────────────────────────────

interface SlideItemProps {
  slide: TourSlide;
  width: number;
}

function SlideItem({ slide, width }: SlideItemProps) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';

  return (
    <View style={[styles.slide, { width }]}>
      <View
        style={[
          styles.emojiWrap,
          { backgroundColor: colors.primary + '18' },
          neuSurface(scheme, 'flat'),
        ]}
      >
        <AppIcon name={slide.icon} size={40} color={colors.primary} strokeWidth={1.75} />
      </View>
      <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>
        {slide.title}
      </Text>
      <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>
        {slide.description}
      </Text>
    </View>
  );
}

// ─── Tour Button (the persistent ? button) ────────────────────────────────────

interface TourButtonProps {
  onPress: () => void;
  /** Extra bottom offset if the screen has a FAB or tab bar nearby */
  bottomOffset?: number;
}

export function TourButton({ onPress, bottomOffset = 0 }: TourButtonProps) {
  const colors = useThemeColors();
  const scheme = useIsDarkTheme() ? 'dark' : 'light';
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[
        styles.tourBtn,
        { backgroundColor: colors.surface, bottom: insets.bottom + 88 + bottomOffset },
        neuShadow(scheme, 'raised'),
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Abrir guía de esta pantalla"
    >
      <Text style={[styles.tourBtnText, { color: colors.primary }]}>?</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Modal
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  cardDesktop: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    marginBottom: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  flatList: {
    flexGrow: 0,
  },

  // Slide
  slide: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  emojiWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  slideTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  slideDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
  },

  // "No volver a mostrar"
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 6,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Actions
  actions: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  nextBtn: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  // Tour Button (?)
  tourBtn: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  tourBtnText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
});
