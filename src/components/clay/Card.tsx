import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useIsDarkTheme, useThemeColors } from '@/hooks/useThemeColors';
import { neuSurface, type Elevation } from '@/lib/neumorphic';

export type ClayCardProps = ViewProps & {
  elevation?: Elevation;
};

export function ClayCard({ elevation = 'raised', style, ...props }: ClayCardProps) {
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';

  return (
    <View
      style={[neuSurface(scheme, elevation), { padding: 16 }, style]}
      {...props}
    />
  );
}