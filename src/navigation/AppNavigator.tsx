import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { lightColors, darkColors } from '@/theme/colors';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
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
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  const navigationTheme = resolvedTheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainStack} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
