/**
 * Tipos relacionados con autenticación y gestión de sesión.
 */

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  error?: AuthError;
}

export interface AuthError {
  code: string;
  message: string;
}
