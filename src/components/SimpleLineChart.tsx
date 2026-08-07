import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { colors } from '@/theme';

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

/**
 * A simple line chart built directly on react-native-svg.
 * Works reliably on iOS, Android, and Web (unlike react-native-chart-kit).
 */
export function SimpleLineChart({
  labels,
  datasets,
  width,
  height = 220,
}: SimpleLineChartProps) {
  const padding = { top: 20, right: 16, bottom: 36, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate the max value across all datasets
  const allValues = datasets.flatMap((d) => d.data);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const valueRange = maxValue - minValue || 1;

  // Generate Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    return minValue + (valueRange * i) / 4;
  });

  // X positions for each data point
  const getX = (index: number) => {
    if (labels.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (labels.length - 1)) * chartWidth;
  };

  // Y position for a value
  const getY = (value: number) => {
    const normalized = (value - minValue) / valueRange;
    return padding.top + chartHeight - normalized * chartHeight;
  };

  // Format numbers for Y axis
  const formatYLabel = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toFixed(0);
  };

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Background */}
        <Rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="#FAFAFA"
          rx={4}
        />

        {/* Grid lines and Y labels */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <React.Fragment key={`grid-${i}`}>
              <Line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#EEEEEE"
                strokeWidth={1}
              />
              <SvgText
                x={padding.left - 8}
                y={y + 4}
                fontSize={10}
                fill="#999"
                textAnchor="end"
              >
                {formatYLabel(tick)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        {labels.map((label, i) => (
          <SvgText
            key={`label-${i}`}
            x={getX(i)}
            y={height - 8}
            fontSize={11}
            fill="#666"
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}

        {/* Data lines and dots */}
        {datasets.map((dataset, di) => {
          const points = dataset.data
            .map((value, i) => `${getX(i)},${getY(value)}`)
            .join(' ');

          return (
            <React.Fragment key={`dataset-${di}`}>
              <Polyline
                points={points}
                fill="none"
                stroke={dataset.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {dataset.data.map((value, i) => (
                <Circle
                  key={`dot-${di}-${i}`}
                  cx={getX(i)}
                  cy={getY(value)}
                  r={4}
                  fill="#fff"
                  stroke={dataset.color}
                  strokeWidth={2}
                />
              ))}
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={legendStyles.container}>
        {datasets.map((dataset, i) => (
          <View key={i} style={legendStyles.item}>
            <View style={[legendStyles.dot, { backgroundColor: dataset.color }]} />
            <Text style={legendStyles.label}>{dataset.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
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
    color: '#666',
    fontWeight: '500',
  },
});
