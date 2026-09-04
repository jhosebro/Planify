import React, { useState } from 'react';
import { colors } from '@/theme';
import { useThemeColors, useIsDarkTheme } from '@/hooks/useThemeColors';
import { neuSurface } from '@/lib/neumorphic';
import { ClayButton, ClayInput } from '@/components/clay';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { authService } from '@/services/auth';

type ForgotPasswordNavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNavProp>();
  const colors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('El formato del correo electrónico no es válido.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.requestPasswordReset(email.trim());
      if (result.success) {
        setSuccess(true);
      } else {
        setError('No se pudo enviar el enlace. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.backgroundPrimary }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, neuSurface(scheme, 'raised')]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Restablecer Contraseña</Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {success && (
            <Text style={styles.successText}>
              Se ha enviado un enlace de restablecimiento a tu correo electrónico.
            </Text>
          )}

          <ClayInput
            label="Correo electrónico"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="Correo electrónico"
          />

          <ClayButton onPress={handleSubmit} loading={loading} style={styles.submit}>
            Enviar Enlace
          </ClayButton>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.link}
            accessibilityLabel="Volver a iniciar sesión"
            accessibilityRole="link"
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>Volver a Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 20,
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  submit: {
    marginTop: 8,
  },
  link: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
  errorText: {
    color: colors.redExpenses,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  successText: {
    color: colors.greenEarns,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
});