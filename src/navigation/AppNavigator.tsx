import React, { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { lightColors, darkColors } from '@/theme/colors';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
    <NavigationContainer theme={navigationTheme}>
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
