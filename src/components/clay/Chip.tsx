import React from 'react';
import {
  Animated,
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useIsDarkTheme, useThemeColors } from '@/hooks/useThemeColors';
import { neuChip } from '@/lib/neumorphic';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ClayChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function ClayChip({ label, active = false, onPress, style }: ClayChipProps) {
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const themeColors = useThemeColors();
  const scale = React.useRef(new Animated.Value(1)).current;

  const bg = active ? themeColors.primary : undefined;
  const textColor = active ? themeColors.textInverse : themeColors.textSecondary;
  const chipStyle = neuChip(scheme, active);

  return (
    <AnimatedPressable
      style={[
        { ...chipStyle, backgroundColor: bg ?? chipStyle.backgroundColor },
        { transform: [{ scale }] },
        style,
      ]}
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: 0.95,
          useNativeDriver: true,
          speed: 40,
          bounciness: 0,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 40,
          bounciness: 0,
        }).start();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});