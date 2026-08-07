import React from 'react';
import { colors } from '@/theme';
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
        style={[styles.backdrop, isDesktopWeb && styles.backdropDesktop]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.card, isDesktopWeb && styles.cardDesktop]}
          onPress={() => {}}
        >
          {!isDesktopWeb && <View style={styles.handle} />}
          <Text style={[styles.title, isDesktopWeb && styles.titleDesktop]}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.content}>{children}</View>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdropDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
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
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 4,
  },
  titleDesktop: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  content: {
    marginBottom: 12,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
});
