import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, type LinkingOptions, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { lightColors, darkColors } from '@/theme/colors';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Solo web: da URL a cada pantalla para que el botón atrás del navegador funcione.
// shortcut: Main no tiene rutas propias (recargar vuelve al inicio de la app); darles rutas si se quieren enlaces directos.
const webLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      Auth: {
        path: '',
        initialRouteName: 'Landing',
        screens: { Landing: '', Login: 'login', Register: 'registro', ForgotPassword: 'recuperar' },
      },
      Onboarding: 'bienvenida',
      Main: 'app',
    },
  },
};

const LightNavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.primary,
    background: lightColors.backgroundPrimary,
    card: lightColors.cardBackground,
    text: lightColors.textPrimary,
    border: lightColors.border,
    notification: lightColors.tertiary,
  },
};

const DarkNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.backgroundPrimary,
    card: darkColors.backgroundSecondary,
    text: darkColors.textPrimary,
    border: darkColors.border,
    notification: darkColors.tertiary,
  },
};

export function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasSeenOnboarding = useAuthStore((state) => state.hasSeenOnboarding);
  const onboardingHydrated = useAuthStore((state) => state.onboardingHydrated);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  const navigationTheme = resolvedTheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme;

  // Wait until AsyncStorage has been read to avoid flashing the wrong screen
  if (!onboardingHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: navigationTheme.colors.background }}>
        <ActivityIndicator size="large" color={navigationTheme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme} linking={Platform.OS === 'web' ? webLinking : undefined} documentTitle={{ formatter: (options) => (options?.title ? `${options.title} · Planify` : 'Planify') }}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : !hasSeenOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
