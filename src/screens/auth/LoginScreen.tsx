import React, { useState } from 'react';
import { colors } from '@/theme';
import {
  View,
  Text,
  TextInput,
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
        contentContainerStyle={[styles.container, isDesktopWeb && styles.containerDesktop]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[isDesktopWeb && styles.desktopCard]}>
          {isDesktopWeb && (
            <Text style={styles.brandText}>Planify</Text>
          )}
          <Text style={styles.title}>Iniciar Sesión</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, isDesktopWeb && styles.googleButtonDesktop, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={googleLoading || loading}
            accessibilityLabel="Continuar con Google"
            accessibilityRole="button"
          >
            {googleLoading ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={[styles.input, isDesktopWeb && styles.inputDesktop]}
            placeholder="Correo electrónico"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="Correo electrónico"
          />

          <TextInput
            style={[styles.input, isDesktopWeb && styles.inputDesktop]}
            placeholder="Contraseña"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            accessibilityLabel="Contraseña"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled, isDesktopWeb && styles.buttonDesktop]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Iniciar sesión"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.link}
            accessibilityLabel="¿Olvidaste tu contraseña?"
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.link}
            accessibilityLabel="Crear una cuenta"
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
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
    backgroundColor: '#fff',
  },
  containerDesktop: {
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
  },
  desktopCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 48,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
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
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    color: '#1a1a1a',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    color: '#1a1a1a',
  },
  inputDesktop: {
    height: 52,
    fontSize: 15,
    borderRadius: 10,
  },
  button: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDesktop: {
    height: 52,
    borderRadius: 10,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    gap: 10,
  },
  googleButtonDesktop: {
    height: 52,
    borderRadius: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#999',
  },
});
