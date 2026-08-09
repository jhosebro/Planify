import React from 'react';
import { colors } from '@/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface BottomModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Responsive modal:
 * - Mobile: slides up from the bottom (bottom sheet pattern)
 * - Desktop web (>= 1024px): centered dialog with max-width
 */
export function BottomModal({ visible, title, subtitle, onClose, children }: BottomModalProps) {
  const colors = useThemeColors();
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isDesktopWeb ? 'fade' : 'fade'}
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }, isDesktopWeb && styles.backdropDesktop]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.card, { backgroundColor: colors.cardBackground }, isDesktopWeb && styles.cardDesktop]}
          onPress={() => {}}
        >
          {!isDesktopWeb && <View style={[styles.handle, { backgroundColor: colors.border }]} />}
          <Text style={[styles.title, { color: colors.textPrimary }, isDesktopWeb && styles.titleDesktop]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
          <View style={styles.content}>{children}</View>
          <TouchableOpacity style={[styles.cancelButton, { borderTopColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  cardDesktop: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  titleDesktop: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  content: {
    marginBottom: 12,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
