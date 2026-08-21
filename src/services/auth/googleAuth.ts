import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

/**
 * Google Sign-In service.
 * - Native (Android/iOS): Uses @react-native-google-signin/google-signin + signInWithIdToken
 * - Web: Uses Supabase OAuth redirect flow (signInWithOAuth)
 */

// Web client ID from Google Cloud Console (used for all platforms)
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/**
 * Sign in with Google.
 * Returns { success: true } if login was successful.
 * Returns { success: false, error: string } if there was an error.
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return signInWithGoogleWeb();
  }
  return signInWithGoogleNative();
}

/**
 * Web: uses Supabase OAuth redirect (browser-based flow)
 */
async function signInWithGoogleWeb(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al iniciar sesión con Google' };
  }
}

/**
 * Native (Android/iOS): uses Google Sign-In SDK + Supabase signInWithIdToken
 */
async function signInWithGoogleNative(): Promise<{ success: boolean; error?: string }> {
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });

    await GoogleSignin.hasPlayServices();

    // Sign out from Google first to force account picker to show
    // This ensures users can switch between different Google accounts
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore if not signed in
    }

    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      return { success: false, error: 'No se pudo obtener el token de Google' };
    }

    // Sign out current Supabase session before signing in with new account
    await supabase.auth.signOut();

    // Pass the ID token to Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Set auth state
    if (data.session && data.user) {
      const store = useAuthStore.getState();
      store.setAuth(
        data.session.access_token,
        data.session.refresh_token,
        data.user.id
      );
    }

    return { success: true };
  } catch (err: any) {
    // Handle specific Google Sign-In errors
    if (err.code === 'SIGN_IN_CANCELLED') {
      return { success: false, error: undefined }; // User cancelled, not an error
    }
    return { success: false, error: err.message || 'Error al iniciar sesión con Google' };
  }
}
