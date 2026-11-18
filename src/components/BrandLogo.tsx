import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

// Isotipo de Planify: misma geometría que assets/brand/icon.svg (fondo sólido: el degradado no pinta en react-native-svg web)
export function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Planify">
      <Rect width="100" height="100" rx="24" fill="#007DC3" />
      <G transform="translate(9 9) scale(0.82)">
        <Rect x="25" y="20.5" width="15" height="59" rx="7.5" fill="#FFFFFF" />
        <Path
          d="M32.5 28 H50 a17.5 17.5 0 0 1 0 35 H32.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={15}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="50" cy="45.5" r="5.5" fill="#34D399" />
      </G>
    </Svg>
  );
}
