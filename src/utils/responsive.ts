import { useEffect, useState } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

/**
 * Responsive utilities for adapting UI to different screen sizes.
 *
 * Requisito 10.1: Funciona en iOS 14+, Android 10+ y navegadores web modernos.
 * Requisito 10.2: La UI se adapta al tamaño de pantalla manteniendo funcionalidad completa.
 */

export interface ScreenDimensions {
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
}

/**
 * React hook that returns the current screen dimensions and updates on changes.
 * Useful for responsive layouts that need to react to orientation changes or resizing.
 */
export function useScreenDimensions(): ScreenDimensions {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isPortrait: height >= width,
      isLandscape: width > height,
    };
  });

  useEffect(() => {
    const handler = ({ window }: { window: ScaledSize }) => {
      setDimensions({
        width: window.width,
        height: window.height,
        isPortrait: window.height >= window.width,
        isLandscape: window.width > window.height,
      });
    };

    const subscription = Dimensions.addEventListener('change', handler);
    return () => subscription.remove();
  }, []);

  return dimensions;
}

/**
 * Determines if the current device is a tablet based on screen width.
 * Uses the common breakpoint of 768px.
 */
export function isTablet(): boolean {
  const { width, height } = Dimensions.get('window');
  const minDimension = Math.min(width, height);
  return minDimension >= 768;
}

/**
 * Determines if the app is running on the web platform.
 */
export function isWeb(): boolean {
  return Platform.OS === 'web';
}

/**
 * Returns responsive horizontal padding based on screen width.
 * - Small screens (< 375): 12px
 * - Medium screens (375-767): 16px
 * - Tablets (768-1023): 24px
 * - Large screens (>= 1024): 32px
 */
export function getResponsivePadding(): number {
  const { width } = Dimensions.get('window');

  if (width < 375) return 12;
  if (width < 768) return 16;
  if (width < 1024) return 24;
  return 32;
}

/**
 * Returns responsive font scale based on screen width.
 * Base factor 1.0 for mobile, scales slightly for larger screens.
 */
export function getFontScale(): number {
  const { width } = Dimensions.get('window');

  if (width < 375) return 0.9;
  if (width < 768) return 1.0;
  if (width < 1024) return 1.1;
  return 1.2;
}

/**
 * Calculates the number of columns for grid layouts based on screen width.
 * - Phones: 1 column
 * - Tablets portrait: 2 columns
 * - Tablets landscape / Desktop: 3 columns
 */
export function getGridColumns(): number {
  const { width } = Dimensions.get('window');

  if (width < 768) return 1;
  if (width < 1024) return 2;
  return 3;
}
