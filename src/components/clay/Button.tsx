import React from 'react';
import {
  Animated,
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useIsDarkTheme, useThemeColors } from '@/hooks/useThemeColors';
import { neuShadow } from '@/lib/neumorphic';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ClayButtonProps {
  children: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function ClayButton({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ClayButtonProps) {
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const themeColors = useThemeColors();
  const scale = React.useRef(new Animated.Value(1)).current;
  const pressedRef = React.useRef(false);

  const scaleIn = () => {
    pressedRef.current = true;
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const scaleOut = () => {
    pressedRef.current = false;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const variantBg: Record<ButtonVariant, string> = {
    primary: themeColors.primary,
    secondary: themeColors.surface,
    ghost: 'transparent',
    danger: themeColors.redExpenses,
  };

  const variantTextColor: Record<ButtonVariant, string> = {
    primary: themeColors.textInverse,
    secondary: themeColors.textPrimary,
    ghost: themeColors.primary,
    danger: '#ffffff',
  };

  const bgColor = variantBg[variant];
  const textColor = variantTextColor[variant];
  const shadow = neuShadow(scheme, 'raised', variant === 'ghost' ? undefined : themeColors.shadowDark);

  return (
    <AnimatedPressable
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          opacity: disabled ? 0.5 : 1,
          ...(variant !== 'ghost' ? shadow : {}),
        },
        { transform: [{ scale }] },
        style,
      ]}
      onPress={onPress}
      onPressIn={scaleIn}
      onPressOut={scaleOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{children}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});