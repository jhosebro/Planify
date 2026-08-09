import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { lightColors, darkColors } from '@/theme/colors';
import type { ThemeColors } from '@/theme/colors';

/**
 * Returns the active color palette based on the current theme mode.
 * Components using this hook will re-render when the theme changes.
 *
 * @example
 * const colors = useThemeColors();
 * <View style={{ backgroundColor: colors.backgroundPrimary }} />
 */
export function useThemeColors(): ThemeColors {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  return resolvedTheme === 'dark' ? darkColors : lightColors;
}

/**
 * Returns true if the current theme is dark.
 */
export function useIsDarkTheme(): boolean {
  return useThemeStore((state) => state.resolvedTheme === 'dark');
}

/**
 * Creates memoized styles that update when the theme changes.
 * Pass a factory function that receives the current colors and returns a StyleSheet.
 *
 * @example
 * function MyScreen() {
 *   const styles = useThemedStyles((colors) => ({
 *     container: { backgroundColor: colors.backgroundPrimary },
 *     title: { color: colors.textPrimary },
 *   }));
 *   return <View style={styles.container}><Text style={styles.title}>Hi</Text></View>;
 * }
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T
): T {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  return useMemo(() => {
    const themeColors = resolvedTheme === 'dark' ? darkColors : lightColors;
    return StyleSheet.create(factory(themeColors));
  }, [resolvedTheme]);
}
