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

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavProp>();
  const colors = useThemeColors();
  const isDark = useIsDarkTheme();
  const scheme = isDark ? 'dark' : 'light';
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
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

  const handleLogin = async () => {
    setError(null);

    if (!email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }
    if (!password) {
      setError('La contraseña es obligatoria.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login({ email: email.trim(), password });
      if (!result.success) {
        const message =
          result.error?.code === 'ACCOUNT_LOCKED'
            ? 'Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en 5 minutos.'
            : result.error?.message ?? 'Credenciales inválidas.';
        setError(message);
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
        {!isDesktopWeb && (
          <Text style={[styles.brandText, { color: colors.primary }]}>Planify</Text>
        )}
        <View style={[styles.desktopCard, neuSurface(scheme, 'raised')]}>
          {isDesktopWeb && (
            <Text style={[styles.brandText, { color: colors.primary }]}>Planify</Text>
          )}
          <Text style={[styles.title, { color: colors.textPrimary }]}>Iniciar Sesión</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, neuSurface(scheme, 'flat'), googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={googleLoading || loading}
            accessibilityLabel="Continuar con Google"
            accessibilityRole="button"
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.googleButtonText, { color: colors.textPrimary }]}>Continuar con Google</Text>
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
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            accessibilityLabel="Contraseña"
          />

          <ClayButton onPress={handleLogin} loading={loading} style={isDesktopWeb ? styles.submitDesktop : undefined}>
            Iniciar Sesión
          </ClayButton>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.link}
            accessibilityLabel="¿Olvidaste tu contraseña?"
            accessibilityRole="link"
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.link}
            accessibilityLabel="Crear una cuenta"
            accessibilityRole="link"
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>¿No tienes cuenta? Regístrate</Text>
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
  buttonDisabled: {
    opacity: 0.7,
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