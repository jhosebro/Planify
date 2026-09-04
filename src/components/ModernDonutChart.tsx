import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FONT_FAMILY } from '@/theme';

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
 * Modern ring chart matching the dashboard line chart visual language:
 * soft gradient-fade segments, glowing dots for tiny slices, a halo on the
 * active segment, rounded caps with clearly separated gaps, and center stats.
 */
export function ModernDonutChart({ slices, size = 200, thickness = 26 }: ModernDonutChartProps) {
  const colors = useThemeColors();
  const [active, setActive] = useState<number | null>(null);

  const total = useMemo(() => slices.reduce((s, x) => s + x.value, 0), [slices]);

  const polar = (cx: number, cy: number, rad: number, angleDeg: number) => {
    const rads = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + rad * Math.cos(rads), y: cy + rad * Math.sin(rads) };
  };

  const describeArc = (cx: number, cy: number, rad: number, startAngle: number, endAngle: number) => {
    const start = polar(cx, cy, rad, startAngle);
    const end = polar(cx, cy, rad, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${rad} ${rad} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - thickness;

  const segments = useMemo(() => {
    if (total <= 0) return [];
    // Round caps extend thickness/2 beyond each arc end. Segments narrow
    // enough that their own caps would overlap get rendered as dots below;
    // the rest get a gap wide enough that neighboring caps sit clearly apart.
    const capAngle = Math.asin(thickness / (2 * r)) * (180 / Math.PI);
    let angle = 0;
    return slices
      .filter((s) => s.value > 0)
      .map((s) => {
        const sweep = (s.value / total) * 360;
        const maxGap = Math.max(0, (sweep - 3) / 2);
        const seg = {
          ...s,
          startAngle: angle,
          endAngle: angle + sweep,
          midAngle: angle + sweep / 2,
          sweep,
          gap: Math.min(capAngle * 1.9, maxGap),
          dot: maxGap < capAngle,
        };
        angle += sweep;
        return seg;
      });
  }, [slices, total, thickness, r]);

  const formatValue = (v: number) => `$${v.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

  const webHandlers = Platform.OS === 'web' ? { onMouseLeave: () => setActive(null) } : {};

  const toggle = (i: number) => setActive(active === i ? null : i);

  const activeSlice = active !== null ? segments[active] : null;

  return (
    <View style={styles.container} {...webHandlers}>
      <Svg width={size} height={size}>
        <Defs>
          {segments.map((s, i) => (
            <LinearGradient key={`dgrad-${i}`} id={`dgrad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity={1} />
              <Stop offset="1" stopColor={s.color} stopOpacity={0.5} />
            </LinearGradient>
          ))}
        </Defs>

        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border} strokeWidth={thickness} opacity={0.35} />

        {segments.map((s, i) => {
          const isActive = active === i;
          const opacity = active === null || isActive ? 1 : 0.4;

          if (s.dot) {
            const mid = polar(cx, cy, r, s.midAngle);
            return (
              <G key={`seg-${i}`} opacity={opacity}>
                <Circle
                  cx={mid.x}
                  cy={mid.y}
                  r={thickness / 2 + 4}
                  fill={s.color}
                  opacity={0.18}
                  onPress={() => toggle(i)}
                />
                <Circle
                  cx={mid.x}
                  cy={mid.y}
                  r={thickness / 2 - 3}
                  fill={s.color}
                  stroke={colors.cardBackground}
                  strokeWidth={2}
                  onPress={() => toggle(i)}
                />
              </G>
            );
          }

          const startAngle = s.startAngle + s.gap;
          const endAngle = s.endAngle - s.gap;
          const d = describeArc(cx, cy, r, startAngle, endAngle);
          const mid = polar(cx, cy, r, s.midAngle);

          return (
            <G key={`seg-${i}`}>
              {isActive && (
                <Path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness + 10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.15}
                  pointerEvents="none"
                />
              )}
              <Path
                d={d}
                stroke={`url(#dgrad-${i})`}
                strokeWidth={isActive ? thickness + 3 : thickness}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={opacity}
                onPress={() => toggle(i)}
              />
              {isActive && (
                <Circle cx={mid.x} cy={mid.y} r={thickness / 2 + 5} fill="none" stroke={s.color} strokeWidth={1.5} opacity={0.5} pointerEvents="none" />
              )}
            </G>
          );
        })}

        <G>
          <SvgText x={cx} y={cy - 4} fill={colors.textTertiary} fontSize={11} fontWeight="500" fontFamily={FONT_FAMILY} textAnchor="middle">
            {activeSlice ? activeSlice.label : 'Total'}
          </SvgText>
          <SvgText x={cx} y={cy + 16} fill={colors.textPrimary} fontSize={16} fontWeight="700" fontFamily={FONT_FAMILY} textAnchor="middle">
            {activeSlice ? formatValue(activeSlice.value) : formatValue(total)}
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});