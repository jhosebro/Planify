import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface ModernDonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
}

/**
 * A modern donut chart built on react-native-svg.
 * - Rounded segment caps and soft gradient stroke
 * - Two configurable series (like gauge) not needed: single ring of segments
 * - Hover/tap a segment to highlight it and show its label/value
 * - Center shows the total
 */
export function ModernDonutChart({
  slices,
  size = 200,
  thickness = 26,
}: ModernDonutChartProps) {
  const colors = useThemeColors();
  const [active, setActive] = useState<number | null>(null);

  const total = useMemo(() => slices.reduce((s, x) => s + x.value, 0), [slices]);

  // Compute SVG arc path for a donut segment
  const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polar(cx, cy, r, startAngle);
    const end = polar(cx, cy, r, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - thickness;

  const segments = useMemo(() => {
    if (total <= 0) return [];
    let angle = 0;
    return slices
      .filter((s) => s.value > 0)
      .map((s) => {
        const sweep = (s.value / total) * 360;
        const seg = { ...s, startAngle: angle, endAngle: angle + sweep, gap: Math.min(sweep * 0.25, 3) };
        angle += sweep;
        return seg;
      });
  }, [slices, total]);

  const formatValue = (v: number) => `$${v.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

  const webHandlers = Platform.OS === 'web'
    ? {
        onMouseLeave: () => setActive(null),
      }
    : {};

  const activeSlice = active !== null ? segments[active] : null;

  return (
    <View style={styles.container} {...webHandlers}>
      <Svg width={size} height={size}>
        <Defs>
          {segments.map((s, i) => (
            <LinearGradient key={`dgrad-${i}`} id={`dgrad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity={1} />
              <Stop offset="1" stopColor={s.color} stopOpacity={0.72} />
            </LinearGradient>
          ))}
        </Defs>

        {/* Track */}
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border} strokeWidth={thickness} opacity={0.5} />

        {segments.map((s, i) => {
          const isActive = active === i;
          const startAngle = s.startAngle + s.gap;
          const endAngle = s.endAngle - s.gap;
          const d = describeArc(cx, cy, r, startAngle, endAngle);

          // Midpoint for the active highlight ring
          const midAngle = (s.startAngle + s.endAngle) / 2;
          const mid = polar(cx, cy, r, midAngle);

          return (
            <G key={`seg-${i}`}>
              {/* Full-segment invisible hit target (thick stroke over the whole arc) */}
              <Path
                d={d}
                stroke="transparent"
                strokeWidth={thickness * 2}
                fill="none"
                strokeLinecap="butt"
                onPress={() => setActive(isActive ? null : i)}
              />
              <Path
                d={d}
                stroke={`url(#dgrad-${i})`}
                strokeWidth={isActive ? thickness + 6 : thickness}
                fill="none"
                strokeLinecap="round"
                opacity={active === null || isActive ? 1 : 0.45}
              />
              {isActive && (
                <Circle cx={mid.x} cy={mid.y} r={thickness / 2 + 6} fill="none" stroke={s.color} strokeWidth={1.5} opacity={0.5} />
              )}
            </G>
          );
        })}

        {/* Center total */}
        <G>
          <TextInSvg x={cx} y={cy - 4} fill={colors.textTertiary} fontSize={11} anchor="middle" weight="500">
            {activeSlice ? activeSlice.label : 'Total'}
          </TextInSvg>
          <TextInSvg x={cx} y={cy + 16} fill={colors.textPrimary} fontSize={16} anchor="middle" weight="700">
            {activeSlice ? formatValue(activeSlice.value) : formatValue(total)}
          </TextInSvg>
        </G>
      </Svg>
    </View>
  );
}

// Minimal SVG text wrapper
import { Text as SvgText } from 'react-native-svg';
function TextInSvg({
  x,
  y,
  fill,
  fontSize,
  anchor,
  weight,
  children,
}: {
  x: number;
  y: number;
  fill: string;
  fontSize: number;
  anchor: 'start' | 'middle' | 'end';
  weight: '500' | '700';
  children: React.ReactNode;
}) {
  return (
    <SvgText x={x} y={y} fill={fill} fontSize={fontSize} textAnchor={anchor} fontWeight={weight}>
      {children}
    </SvgText>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
