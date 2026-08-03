import type { SQLiteDatabase } from 'expo-sqlite';
import { SyncService } from './syncService';

/**
 * Gestor de conectividad que controla el inicio/parada de la sincronización
 * periódica basada en el estado de conexión de red.
 *
 * Requisito 7.4: Verificar cambios pendientes cada 60 segundos.
 * Requisito 7.2: Sincronizar cambios almacenados al recuperar conexión.
 *
 * Usa `navigator.onLine` y eventos `online`/`offline` del navegador/runtime
 * para detectar cambios de conectividad sin dependencias adicionales.
 */

/** Intervalo de sincronización periódica: 60 segundos */
const SYNC_INTERVAL_MS = 60_000;

let syncService: SyncService | null = null;
let isInitialized = false;

/**
 * Handler para el evento 'online': inicia sincronización periódica.
 */
function handleOnline(): void {
  if (syncService) {
    syncService.startPeriodicSync(SYNC_INTERVAL_MS);
  }
}

/**
 * Handler para el evento 'offline': detiene sincronización periódica.
 */
function handleOffline(): void {
  if (syncService) {
    syncService.stopPeriodicSync();
  }
}

/**
 * Inicializa el gestor de conectividad.
 * Registra listeners de eventos de red y arranca la sincronización periódica
 * si hay conexión disponible al momento de la inicialización.
 *
 * @param db - Instancia de la base de datos SQLite
 * @param token - Token de autenticación para las llamadas al API de sincronización
 */
export function initConnectivityManager(db: SQLiteDatabase, token: string): void {
  if (isInitialized) {
    return;
  }

  syncService = new SyncService(db);
  syncService.setToken(token);

  // Registrar listeners de conectividad
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // Si estamos online al inicializar, arrancar sincronización periódica
  const online = typeof navigator !== 'undefined' && 'onLine' in navigator
    ? navigator.onLine
    : true;

  if (online) {
    syncService.startPeriodicSync(SYNC_INTERVAL_MS);
  }

  isInitialized = true;
}

/**
 * Detiene el gestor de conectividad.
 * Elimina listeners de eventos y detiene la sincronización periódica.
 */
export function stopConnectivityManager(): void {
  if (!isInitialized) {
    return;
  }

  if (syncService) {
    syncService.stopPeriodicSync();
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }

  syncService = null;
  isInitialized = false;
}

/**
 * Retorna si el gestor de conectividad está activo.
 */
export function isConnectivityManagerActive(): boolean {
  return isInitialized;
}
