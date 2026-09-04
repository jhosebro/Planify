import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuInset } from '@/lib/neumorphic';

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3; // show 3 items: prev, current, next

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface CyclicDatePickerProps {
  year: number;
  month: number;
  day: number;
  onChangeYear: (year: number) => void;
  onChangeMonth: (month: number) => void;
  onChangeDay: (day: number) => void;
  /** Optional: restrict minimum year */
  minYear?: number;
  /** Optional: restrict maximum year */
  maxYear?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Cyclic date picker that wraps around like iPhone scroll wheels.
 * Days: 1 → 30/31 → wraps back to 1
 * Months: Enero → Diciembre → wraps back to Enero (adjusts year)
 * Year: linear with arrows (no wrap)
 */
export function CyclicDatePicker({
  year,
  month,
  day,
  onChangeYear,
  onChangeMonth,
  onChangeDay,
  minYear = 2020,
  maxYear = 2040,
}: CyclicDatePickerProps) {
  const themeColors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const daysInMonth = getDaysInMonth(year, month);

  // Ensure day doesn't exceed days in current month
  useEffect(() => {
    if (day > daysInMonth) {
      onChangeDay(daysInMonth);
    }
  }, [year, month, day, daysInMonth, onChangeDay]);

  const handlePrevDay = useCallback(() => {
    if (day <= 1) {
      // Wrap to last day of month
      onChangeDay(daysInMonth);
    } else {
      onChangeDay(day - 1);
    }
  }, [day, daysInMonth, onChangeDay]);

  const handleNextDay = useCallback(() => {
    if (day >= daysInMonth) {
      // Wrap to first day
      onChangeDay(1);
    } else {
      onChangeDay(day + 1);
    }
  }, [day, daysInMonth, onChangeDay]);

  const handlePrevMonth = useCallback(() => {
    if (month === 0) {
      onChangeMonth(11);
      onChangeYear(year - 1);
    } else {
      onChangeMonth(month - 1);
    }
  }, [month, year, onChangeMonth, onChangeYear]);

  const handleNextMonth = useCallback(() => {
    if (month === 11) {
      onChangeMonth(0);
      onChangeYear(year + 1);
    } else {
      onChangeMonth(month + 1);
    }
  }, [month, year, onChangeMonth, onChangeYear]);

  const handlePrevYear = useCallback(() => {
    if (year > minYear) onChangeYear(year - 1);
  }, [year, minYear, onChangeYear]);

  const handleNextYear = useCallback(() => {
    if (year < maxYear) onChangeYear(year + 1);
  }, [year, maxYear, onChangeYear]);

  // Adjacent values for display
  const prevDay = day <= 1 ? daysInMonth : day - 1;
  const nextDay = day >= daysInMonth ? 1 : day + 1;

  const prevMonth = month === 0 ? 11 : month - 1;
  const nextMonth = month === 11 ? 0 : month + 1;

  return (
    <View style={[styles.container, neuInset(scheme)]}>
      {/* Day Column */}
      <WheelColumn
        label="Día"
        prevValue={prevDay.toString().padStart(2, '0')}
        currentValue={day.toString().padStart(2, '0')}
        nextValue={nextDay.toString().padStart(2, '0')}
        onPrev={handlePrevDay}
        onNext={handleNextDay}
      />

      {/* Month Column */}
      <WheelColumn
        label="Mes"
        prevValue={MONTHS[prevMonth].substring(0, 3)}
        currentValue={MONTHS[month].substring(0, 3)}
        nextValue={MONTHS[nextMonth].substring(0, 3)}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
      />

      {/* Year Column */}
      <WheelColumn
        label="Año"
        prevValue={(year - 1).toString()}
        currentValue={year.toString()}
        nextValue={(year + 1).toString()}
        onPrev={handlePrevYear}
        onNext={handleNextYear}
      />
    </View>
  );
}

// ─── Wheel Column ────────────────────────────────────────────────────────────

interface WheelColumnProps {
  label: string;
  prevValue: string;
  currentValue: string;
  nextValue: string;
  onPrev: () => void;
  onNext: () => void;
}

function WheelColumn({ label, prevValue, currentValue, nextValue, onPrev, onNext }: WheelColumnProps) {
  const panY = useRef(new Animated.Value(0)).current;
  const accumulatedDelta = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        accumulatedDelta.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const dy = gestureState.dy;
        const threshold = ITEM_HEIGHT * 0.6;

        // Calculate how many "ticks" have happened
        const newTicks = Math.floor(Math.abs(dy - accumulatedDelta.current) / threshold);

        if (newTicks > 0) {
          const direction = dy > accumulatedDelta.current ? 1 : -1;
          // Positive dy = swipe down = go to previous (smaller)
          // Negative dy = swipe up = go to next (larger)
          if (direction > 0) {
            onPrev();
          } else {
            onNext();
          }
          accumulatedDelta.current = dy;
        }

        // Animate subtle offset for feel
        const offset = (dy - accumulatedDelta.current) * 0.3;
        panY.setValue(offset);
      },
      onPanResponderRelease: () => {
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
    })
  ).current;

  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <View style={styles.wheelContainer} {...panResponder.panHandlers}>
        {/* Up arrow */}
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={onPrev}
          accessibilityLabel={`${label} anterior`}
          accessibilityRole="button"
        >
          <Text style={styles.arrowText}>▲</Text>
        </TouchableOpacity>

        {/* Wheel display */}
        <Animated.View style={[styles.wheelSlot, { transform: [{ translateY: panY }] }]}>
          <Text style={styles.adjacentValue}>{prevValue}</Text>
          <View style={styles.currentHighlight}>
            <Text style={styles.currentValue}>{currentValue}</Text>
          </View>
          <Text style={styles.adjacentValue}>{nextValue}</Text>
        </Animated.View>

        {/* Down arrow */}
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={onNext}
          accessibilityLabel={`${label} siguiente`}
          accessibilityRole="button"
        >
          <Text style={styles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    justifyContent: 'space-around',
    gap: 8,
  },
  column: {
    alignItems: 'center',
    flex: 1,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wheelContainer: {
    alignItems: 'center',
  },
  arrowButton: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 12,
    color: colors.primary,
  },
  wheelSlot: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  adjacentValue: {
    fontSize: 14,
    color: '#CCC',
    height: ITEM_HEIGHT * 0.6,
    lineHeight: ITEM_HEIGHT * 0.6,
    fontWeight: '400',
  },
  currentHighlight: {
    backgroundColor: colors.primary + '12',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
});
