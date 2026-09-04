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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { authService } from '@/services/auth';
import { signInWithGoogle } from '@/services/auth/googleAuth';

type RegisterNavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNavProp>();
  const colors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch {
      setError('Error de conexión con Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validate = (): string | null => {
    if (!email.trim()) {
      return 'El correo electrónico es obligatorio.';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'El formato del correo electrónico no es válido.';
    }
    if (!password) {
      return 'La contraseña es obligatoria.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }
    return null;
  };

  const handleRegister = async () => {
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const result = await authService.register({ email: email.trim(), password });
      if (!result.success) {
        setError(result.error?.message ?? 'No se pudo crear la cuenta. Intenta de nuevo.');
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
        contentContainerStyle={[styles.container, { backgroundColor: isDesktopWeb ? colors.backgroundPrimary : colors.surface }, isDesktopWeb && styles.containerDesktop]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.desktopCard, neuSurface(scheme, 'raised')]}>
          {isDesktopWeb && (
            <Text style={[styles.brandText, { color: colors.primary }]}>Planify</Text>
          )}
          <Text style={[styles.title, { color: colors.textPrimary }]}>Crear Cuenta</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Google Sign-Up Button */}
          <TouchableOpacity
            style={[styles.googleButton, neuSurface(scheme, 'flat'), googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignUp}
            disabled={googleLoading || loading}
            accessibilityLabel="Registrarse con Google"
            accessibilityRole="button"
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.googleButtonText, { color: colors.textPrimary }]}>Registrarse con Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderInset }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>o</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderInset }]} />
          </View>

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

          <ClayInput
            label="Contraseña (mínimo 8 caracteres)"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            accessibilityLabel="Contraseña"
          />

          <ClayInput
            label="Confirmar contraseña"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            accessibilityLabel="Confirmar contraseña"
          />

          <ClayButton onPress={handleRegister} loading={loading} style={styles.submitDesktop}>
            Registrarse
          </ClayButton>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.link}
            accessibilityLabel="Ir a iniciar sesión"
            accessibilityRole="link"
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>¿Ya tienes cuenta? Inicia sesión</Text>
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
  containerDesktop: {
    alignItems: 'center',
  },
  desktopCard: {
    borderRadius: 20,
    padding: 48,
    width: '100%',
    maxWidth: 440,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  submitDesktop: {
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
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
  googleButton: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
  },
});