import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { useIsDarkTheme, useThemeColors } from '@/hooks/useThemeColors';
import { neuInset, neuShadow } from '@/lib/neumorphic';

export interface ClayInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function ClayInput({ label, error, style, ...props }: ClayInputProps) {
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const themeColors = useThemeColors();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? themeColors.redExpenses
    : focused
      ? themeColors.primary
      : themeColors.borderInset;
  const shadow = focused ? neuShadow(scheme, 'raised') : neuInset(scheme);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: themeColors.textPrimary }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: themeColors.surfacePressed,
            color: themeColors.textPrimary,
            ...shadow,
          },
          { borderColor, borderWidth: focused ? 1.5 : 1 },
          style,
        ]}
        placeholderTextColor={themeColors.textTertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error && <Text style={[styles.error, { color: themeColors.redExpenses }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});