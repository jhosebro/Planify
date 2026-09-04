import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FONT_FAMILY } from '@/theme';

interface Dataset {
  data: number[];
  color: string;
  label: string;
}

interface SimpleLineChartProps {
  labels: string[];
  datasets: Dataset[];
  width: number;
  height?: number;
}

interface Point {
  x: number;
  y: number;
  value: number;
}

/**
 * A modern line chart built directly on react-native-svg.
 * - Smooth (bezier) lines instead of jagged polylines
 * - Gradient area fill under each series
 * - Glowing, modern data points
 * - Interactive tooltip: hover/move with the mouse on web, tap on touch devices
 * Consistent across iOS/Android/web.
 */
export function SimpleLineChart({
  labels,
  datasets,
  width,
  height = 240,
}: SimpleLineChartProps) {
  const colors = useThemeColors();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const padding = { top: 24, right: 20, bottom: 40, left: 52 };
  const chartWidth = Math.max(width - padding.left - padding.right, 10);
  const chartHeight = height - padding.top - padding.bottom;

  const { minValue, maxValue, valueRange } = useMemo(() => {
    const all = datasets.flatMap((d) => d.data);
    const max = Math.max(...all, 1);
    const min = Math.min(...all, 0);
    return { minValue: min, maxValue: max, valueRange: max - min || 1 };
  }, [datasets]);

  const yTicks = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => minValue + (valueRange * i) / 4);
  }, [minValue, valueRange]);

  const getX = (index: number) => {
    if (labels.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (labels.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    const normalized = (value - minValue) / valueRange;
    return padding.top + chartHeight - normalized * chartHeight;
  };

  const formatYLabel = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toFixed(0);
  };

  const formatTooltip = (value: number): string => {
    return `$${value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  };

  const buildSmoothPath = (points: Point[]): string => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    if (points.length < 2) return d;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  };

  const buildAreaPath = (points: Point[]): string => {
    if (points.length === 0) return '';
    const line = buildSmoothPath(points);
    const baseY = padding.top + chartHeight;
    const first = points[0];
    const last = points[points.length - 1];
    return `${line} L ${last.x.toFixed(2)} ${baseY} L ${first.x.toFixed(2)} ${baseY} Z`;
  };

  const baseY = padding.top + chartHeight;

  const series = useMemo(
    () =>
      datasets.map((ds) => {
        const points = ds.data.map((value, i) => ({ x: getX(i), y: getY(value), value }));
        return {
          ...ds,
          points,
          linePath: buildSmoothPath(points),
          areaPath: buildAreaPath(points),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datasets, labels.length, chartWidth, minValue, valueRange]
  );

  const handlePointerX = (relX: number) => {
    if (labels.length <= 1) return;
    const idx = Math.round(((relX - padding.left) / chartWidth) * (labels.length - 1));
    const clamped = Math.max(0, Math.min(labels.length - 1, idx));
    setActiveIndex(clamped);
  };

  const webHandlers = Platform.OS === 'web'
    ? {
        onMouseEnter: (e: any) => handlePointerX(e.nativeEvent.offsetX ?? 0),
        onMouseMove: (e: any) => handlePointerX(e.nativeEvent.offsetX ?? 0),
        onMouseLeave: () => setActiveIndex(null),
      }
    : {};

  const activePoints = activeIndex !== null
    ? series
        .map((s) => ({ label: s.label, color: s.color, value: s.points[activeIndex]?.value }))
        .filter((p) => p.value !== undefined)
    : [];

  return (
    <View>
      <View {...webHandlers}>
        <Svg width={width} height={height}>
          <Defs>
            {series.map((s, sIdx) => (
              <LinearGradient key={`grad-${sIdx}`} id={`grad-${sIdx}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={s.color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={s.color} stopOpacity={0.02} />
              </LinearGradient>
            ))}
          </Defs>

          {/* Grid lines and Y labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            const isBaseline = i === 0;
            return (
              <G key={`grid-${i}`}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray={isBaseline ? undefined : '4 5'}
                />
                <SvgText x={padding.left - 10} y={y + 4} fill={colors.textTertiary} fontSize={11} fontFamily={FONT_FAMILY} textAnchor="end">
                  {formatYLabel(tick)}
                </SvgText>
              </G>
            );
          })}

          {/* Area fills under lines */}
          {series.map((s, sIdx) => (
            <Path key={`area-${sIdx}`} d={s.areaPath} fill={`url(#grad-${sIdx})`} />
          ))}

          {/* Data lines */}
          {series.map((s, sIdx) => (
            <Path
              key={`line-${sIdx}`}
              d={s.linePath}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Data points with glow */}
          {series.map((s, sIdx) =>
            s.points.map((p, i) => (
              <G key={`dot-${sIdx}-${i}`}>
                <Circle cx={p.x} cy={p.y} r={7} fill={s.color} opacity={0.18} />
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill={s.color}
                  stroke={colors.cardBackground}
                  strokeWidth={2}
                />
              </G>
            ))
          )}

          {/* X-axis labels */}
          {labels.map((label, i) => (
            <SvgText key={`label-${i}`} x={getX(i)} y={height - 12} fill={colors.textTertiary} fontSize={11} fontFamily={FONT_FAMILY} textAnchor="middle">
              {label}
            </SvgText>
          ))}

          {/* Invisible hit areas for touch/click to activate tooltip */}
          {labels.map((_, i) => {
            const stepWidth = chartWidth / Math.max(labels.length - 1, 1);
            return (
              <Rect
                key={`hit-${i}`}
                x={getX(i) - stepWidth / 2}
                y={padding.top}
                width={stepWidth}
                height={chartHeight}
                fill="transparent"
                onPress={() => setActiveIndex(activeIndex === i ? null : i)}
              />
            );
          })}

          {/* Tooltip crosshair + stacked series card */}
          {activeIndex !== null && activePoints.length > 0 && (
            <G>
              <Line
                x1={getX(activeIndex)}
                y1={padding.top}
                x2={getX(activeIndex)}
                y2={baseY}
                stroke={colors.textTertiary}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.6}
              />
              <TooltipCard
                x={getX(activeIndex)}
                flip={getX(activeIndex) > width - 120}
                points={activePoints.map((p) => ({
                  color: p.color,
                  label: p.label,
                  value: formatTooltip(p.value as number),
                }))}
              />
            </G>
          )}
        </Svg>
      </View>

      {/* Legend */}
      <View style={legendStyles.container}>
        {datasets.map((dataset, i) => (
          <View key={i} style={legendStyles.item}>
            <View style={[legendStyles.dot, { backgroundColor: dataset.color }]} />
            <Text style={[legendStyles.label, { color: colors.textSecondary }]}>{dataset.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Tooltip card ────────────────────────────────────────────────────────────

function TooltipCard({
  x,
  flip,
  points,
}: {
  x: number;
  flip: boolean;
  points: { color: string; label: string; value: string }[];
}) {
  const colors = useThemeColors();
  const cardWidth = 116;
  const rowHeight = 15;
  const cardHeight = 26 + points.length * rowHeight;
  const bx = flip ? x - cardWidth - 14 : x + 14;
  const by = 24;
  return (
    <G>
      <Rect x={bx} y={by} width={cardWidth} height={cardHeight} rx={10} fill={colors.black} opacity={0.94} />
      {points.map((p, i) => {
        const ry = by + 12 + i * rowHeight;
        return (
          <G key={i}>
            <Circle cx={bx + 12} cy={ry} r={3} fill={p.color} />
            <SvgText x={bx + 24} y={ry + 4} fill={colors.textTertiary} fontSize={10} fontWeight="500" fontFamily={FONT_FAMILY}>
              {p.label}
            </SvgText>
            <SvgText x={bx + cardWidth - 10} y={ry + 4} fill={p.color} fontSize={10} fontWeight="700" fontFamily={FONT_FAMILY} textAnchor="end">
              {p.value}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

const legendStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
