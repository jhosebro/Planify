/**
 * Paleta de colores de Planify.
 * Light mode es el tema por defecto. Dark mode usa fondos oscuros con acentos que mantienen legibilidad.
 */

export const lightColors = {
  primary: '#007DC3',
  primaryHover: '#007DC378',
  darkBlue: '#0169A4',

  secondary: '#464646',
  secondaryActive: '#4646461A',

  tertiary: '#F1632A',
  quaternary: '#B7B7B7',

  backgroundPrimary: '#E4E8EE',
  backgroundSecondary: '#E4E8EE',
  primaryMenu: '#7B7B7B1F',

  greenEarns: '#2EAD5D',
  redExpenses: '#E76666',

  black: '#000000',
  blackLessCard: '#464646',

  contentSettings: '#DCE1E7',
  divSettings: '#B6BABE',

  white: '#FFFFFF',

  // Text
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Borders & surfaces
  border: '#CDD5E0',
  cardBackground: '#E4E8EE',
  inputBackground: '#D9DEE6',
  overlay: 'rgba(0,0,0,0.5)',

  // Clay / neumorphic
  surface: '#E4E8EE',
  surfacePressed: '#D9DEE6',
  shadowLight: '#FFFFFF',
  shadowDark: '#A9B4C6',
  borderSubtle: 'rgba(255,255,255,0.85)',
  borderInset: 'rgba(0,0,0,0.06)',
};

export const darkColors = {
  primary: '#4DA8E0',
  primaryHover: '#4DA8E078',
  darkBlue: '#3B9AD4',

  secondary: '#E0E0E0',
  secondaryActive: '#E0E0E01A',

  tertiary: '#F48C5C',
  quaternary: '#6B6B6B',

  backgroundPrimary: '#1B1E24',
  backgroundSecondary: '#1B1E24',
  primaryMenu: '#FFFFFF1F',

  greenEarns: '#4ACA7A',
  redExpenses: '#F08080',

  black: '#FFFFFF',
  blackLessCard: '#E0E0E0',

  contentSettings: '#2A2D30',
  divSettings: '#3D4043',

  white: '#1E1E1E',

  // Text
  textPrimary: '#F0F0F0',
  textSecondary: '#B0B0B0',
  textTertiary: '#787878',
  textInverse: '#121212',

  // Borders & surfaces
  border: '#2A303A',
  cardBackground: '#1B1E24',
  inputBackground: '#15171C',
  overlay: 'rgba(0,0,0,0.7)',

  // Clay / neumorphic
  surface: '#1B1E24',
  surfacePressed: '#15171C',
  shadowLight: '#272C36',
  shadowDark: '#0E1013',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderInset: 'rgba(0,0,0,0.35)',
};

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};
export type ColorKey = keyof ThemeColors;

/**
 * Reactive colors proxy.
 * Reads the current resolved theme from the themeStore at access time.
 * This means any code that accesses `colors.primary` inside a render function
 * will get the correct value for the active theme.
 *
 * NOTE: StyleSheet.create() calls at module level will capture the initial (light) values.
 * For full dark-mode support in StyleSheets, components should use inline styles or
 * the useThemeColors() hook for dynamic values.
 */
function getResolvedColors(): typeof lightColors {
  try {
    // Lazy import to avoid circular dependency on first module load
    const { useThemeStore } = require('@/store/themeStore');
    const resolvedTheme = useThemeStore.getState().resolvedTheme;
    return resolvedTheme === 'dark' ? darkColors : lightColors;
  } catch {
    return lightColors;
  }
}

export const colors: ThemeColors = new Proxy(lightColors as unknown as ThemeColors, {
  get(_target, prop: string) {
    const resolved = getResolvedColors();
    return (resolved as any)[prop];
  },
});

