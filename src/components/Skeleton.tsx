import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 12, radius = 8, style }: SkeletonProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surfacePressed },
        style,
      ]}
    />
  );
}

function SkeletonPulse({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={{ opacity }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Animated.View>
  );
}

type SkeletonVariant = 'dashboard' | 'summary' | 'list' | 'rows';

interface ScreenSkeletonProps {
  variant?: SkeletonVariant;
  rows?: number;
}

export function ScreenSkeleton({ variant = 'list', rows = 4 }: ScreenSkeletonProps) {
  const colors = useThemeColors();
  const layout = useResponsiveLayout();
  const isDesktop = Platform.OS === 'web' && layout.isDesktop;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
      ]}
      scrollEnabled={false}
    >
      <SkeletonPulse>
        {variant === 'dashboard' ? (
          <>
            <View style={styles.pillRow}>
              <Skeleton width={88} height={36} radius={18} />
              <Skeleton width={88} height={36} radius={18} />
              <Skeleton width={88} height={36} radius={18} />
            </View>
            <Skeleton height={124} radius={16} style={styles.gapLg} />
            <Skeleton height={250} radius={16} />
            <View style={styles.cardRow}>
              <Skeleton height={112} radius={14} style={styles.flex} />
              <Skeleton height={112} radius={14} style={styles.flex} />
            </View>
            <Skeleton height={68} radius={12} style={styles.gapSm} />
          </>
        ) : variant === 'summary' ? (
          <>
            <View style={styles.headerRow}>
              <Skeleton width={148} height={24} />
              <Skeleton width={92} height={36} radius={18} />
            </View>
            <Skeleton height={132} radius={16} style={styles.gapSm} />
            {Array.from({ length: rows }).map((_, index) => (
              <React.Fragment key={index}>
                {index === 0 && <Skeleton width={178} height={44} radius={12} style={styles.gapSm} />}
                <Skeleton height={92} radius={12} style={styles.gapSm} />
              </React.Fragment>
            ))}
          </>
        ) : variant === 'rows' ? (
          <>
            <Skeleton width={120} height={18} style={styles.gapSm} />
            {Array.from({ length: rows }).map((_, index) => (
              <Skeleton key={index} height={72} radius={12} style={styles.gapSm} />
            ))}
          </>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Skeleton width={150} height={24} />
              <Skeleton width={92} height={36} radius={18} />
            </View>
            <Skeleton height={42} radius={12} style={styles.gapSm} />
            {Array.from({ length: rows }).map((_, index) => (
              <Skeleton key={index} height={98} radius={12} style={styles.gapSm} />
            ))}
          </>
        )}
      </SkeletonPulse>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  gapSm: { marginTop: 8 },
  gapLg: { marginTop: 4, marginBottom: 12 },
  flex: { flex: 1 },
});
