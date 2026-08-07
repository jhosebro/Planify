import { useEffect, useState } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

/**
 * Breakpoints for responsive design.
 * - mobile: < 768px
 * - tablet: 768px – 1023px
 * - desktop: >= 1024px
 */
export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  wideDesktop: 1440,
} as const;

export interface ResponsiveLayout {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWideDesktop: boolean;
  isWeb: boolean;
  /** Max content width for the main area (excluding sidebar) */
  contentMaxWidth: number;
  /** Number of grid columns for card layouts */
  gridColumns: number;
  /** Horizontal padding for the content area */
  contentPadding: number;
}

function computeLayout(width: number, height: number): ResponsiveLayout {
  const isWeb = Platform.OS === 'web';
  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isWideDesktop = width >= BREAKPOINTS.wideDesktop;

  let contentMaxWidth: number;
  let gridColumns: number;
  let contentPadding: number;

  if (isWideDesktop) {
    contentMaxWidth = 1200;
    gridColumns = 3;
    contentPadding = 32;
  } else if (isDesktop) {
    contentMaxWidth = 960;
    gridColumns = 2;
    contentPadding = 24;
  } else if (isTablet) {
    contentMaxWidth = 720;
    gridColumns = 2;
    contentPadding = 20;
  } else {
    contentMaxWidth = width;
    gridColumns = 1;
    contentPadding = 16;
  }

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWeb,
    isWideDesktop,
    contentMaxWidth,
    gridColumns,
    contentPadding,
  };
}

/**
 * Hook that provides responsive layout information, updating on window resize.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const [layout, setLayout] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return computeLayout(width, height);
  });

  useEffect(() => {
    const handler = ({ window }: { window: ScaledSize }) => {
      setLayout(computeLayout(window.width, window.height));
    };

    const subscription = Dimensions.addEventListener('change', handler);
    return () => subscription.remove();
  }, []);

  return layout;
}
