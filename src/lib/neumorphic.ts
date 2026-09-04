import { Platform, type ViewStyle } from 'react-native';
import { lightColors, darkColors } from '@/theme/colors';

export type Theme = 'light' | 'dark';
export type Elevation = 'flat' | 'raised' | 'pressed' | 'inset' | 'concave';

type AnyColorScheme = Theme | string | null | undefined;

type BoxShadowObject = {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  color: string;
  inset?: boolean;
};

function isDark(scheme: AnyColorScheme): boolean {
  return scheme === 'dark';
}

function resolveColors(scheme: AnyColorScheme) {
  return isDark(scheme) ? darkColors : lightColors;
}

/**
 * Returns the neumorphic (clay) shadow for a given elevation and accent color.
 *
 * On web (react-native-web 0.21) we emit a real dual `boxShadow` — a light
 * highlight pushed up-left and a dark shadow pushed down-right — which is what
 * makes the clay effect read correctly on screen.
 *
 * On native we fall back to the classic RN `shadow*` props (iOS) or `elevation`
 * (Android), which is the best the platform exposes for a single-surface shadow.
 */
export function neuShadow(
  scheme: AnyColorScheme,
  elevation: Elevation = 'raised',
  accent?: string
): ViewStyle {
  const c = resolveColors(scheme);

  if (Platform.OS === 'web') {
    const dual = (light: BoxShadowObject, dark: BoxShadowObject): ViewStyle => ({
      boxShadow: [
        { ...light, color: light.color || c.shadowLight },
        { ...dark, color: dark.color || c.shadowDark },
      ],
    });

    switch (elevation) {
      case 'flat':
        return dual(
          { offsetX: -2, offsetY: -2, blurRadius: 4, color: '' },
          { offsetX: 2, offsetY: 2, blurRadius: 4, color: '' }
        );
      case 'raised':
        return dual(
          { offsetX: -5, offsetY: -5, blurRadius: 10, color: '' },
          { offsetX: 5, offsetY: 5, blurRadius: 10, color: '' }
        );
      case 'pressed':
        return dual(
          { offsetX: -2, offsetY: -2, blurRadius: 4, color: '', inset: true },
          { offsetX: 2, offsetY: 2, blurRadius: 4, color: '', inset: true }
        );
      case 'inset':
        return dual(
          { offsetX: -3, offsetY: -3, blurRadius: 6, color: '', inset: true },
          { offsetX: 3, offsetY: 3, blurRadius: 6, color: '', inset: true }
        );
      case 'concave':
        return dual(
          { offsetX: -4, offsetY: -4, blurRadius: 8, color: '', inset: true },
          { offsetX: 4, offsetY: 4, blurRadius: 8, color: '', inset: true }
        );
    }
  }

  if (Platform.OS === 'android') {
    const androidElevation: Record<Elevation, number> = {
      flat: 0,
      raised: 3,
      pressed: 1,
      inset: 0,
      concave: 1,
    };
    return { elevation: androidElevation[elevation] };
  }

  // iOS / native fallback — single shadow tone matched to the accent or surface
  const base = accent
    ? { shadowColor: accent, shadowOpacity: 0.35 }
    : { shadowColor: c.shadowDark, shadowOpacity: 0.45 };

  switch (elevation) {
    case 'flat':
      return { ...base, shadowOffset: { width: -2, height: -2 }, shadowRadius: 4 };
    case 'raised':
      return { ...base, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 };
    case 'pressed':
      return { ...base, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3 };
    case 'inset':
      return { ...base, shadowOffset: { width: 1, height: 1 }, shadowRadius: 4 };
    case 'concave':
      return { ...base, shadowOffset: { width: 2, height: 2 }, shadowRadius: 6 };
  }
}

/**
 * A clay background surface tuned for a given elevation.
 */
export function neuSurface(
  scheme: AnyColorScheme,
  elevation: Elevation = 'raised',
  accent?: string
): ViewStyle {
  const c = resolveColors(scheme);
  return {
    backgroundColor: elevation === 'pressed' ? c.surfacePressed : c.surface,
    borderRadius: 16,
    ...neuShadow(scheme, elevation, accent),
  };
}

/**
 * An inset, "sunken" field (e.g. inputs, wells).
 */
export function neuInset(scheme: AnyColorScheme): ViewStyle {
  const c = resolveColors(scheme);
  return {
    backgroundColor: c.surfacePressed,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderInset,
    ...neuShadow(scheme, 'inset'),
  };
}

/**
 * A full clay card with padding built in.
 */
export function neuCard(
  scheme: AnyColorScheme,
  elevation: Elevation = 'raised'
): ViewStyle {
  return {
    ...neuSurface(scheme, elevation),
    padding: 16,
  };
}

/**
 * Clay button style. `pressed` pushes the surface in and recolors it.
 */
export function neuButton(
  scheme: AnyColorScheme,
  pressed = false,
  accent?: string
): ViewStyle {
  return {
    ...neuSurface(scheme, pressed ? 'pressed' : 'raised', accent),
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

/**
 * Clay chip style. When active, the chip fills with the primary accent.
 */
export function neuChip(
  scheme: AnyColorScheme,
  active = false,
  accent?: string
): ViewStyle {
  const c = resolveColors(scheme);
  const base: ViewStyle = {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  };

  if (active) {
    return {
      ...base,
      backgroundColor: accent || c.primary,
      borderColor: c.primary || accent || c.primary,
      ...neuShadow(scheme, 'pressed', accent),
    };
  }

  return {
    ...base,
    backgroundColor: c.surface,
    borderColor: c.borderSubtle,
    ...neuShadow(scheme, 'raised'),
  };
}

/**
 * Inset track used to host progress bars.
 */
export function neuProgress(scheme: AnyColorScheme): ViewStyle {
  const c = resolveColors(scheme);
  return {
    ...neuInset(scheme),
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  };
}