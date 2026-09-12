import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface TourHeaderButtonProps {
  onPress: () => void;
}

export function TourHeaderButton({ onPress }: TourHeaderButtonProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Abrir guía de esta pantalla"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[styles.text, { color: colors.primary }]}>?</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginRight: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
});
