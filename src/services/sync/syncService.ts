import type { SQLiteDatabase } from 'expo-sqlite';
import type { SyncEntry, SyncStatus } from '@/types';
import { useSyncStore } from '@/store/syncStore';
import { syncApi } from './syncApi';
import type { SyncConflictResponse } from './syncApi';

/**
 * Resultado de una resolución de conflicto entre entrada local y remota.
 */
export interface ConflictResolution {
  localEntry: SyncEntry;
  remoteEntry: SyncEntry;
  /** La entrada ganadora (timestamp más reciente). */
  resolved: SyncEntry;
}

/**
 * Representa una fila cruda de la tabla sync_queue en SQLite.
 */
interface SyncQueueRow {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  timestamp: string;
  is_synced: number;
}

/**
 * Genera un UUID v4 usando crypto.randomUUID cuando está disponible,
 * con fallback a generación manual.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convierte una fila de SQLite al tipo SyncEntry del dominio.
 */
function mapRowToSyncEntry(row: SyncQueueRow): SyncEntry {
  return {
    id: row.id,
    entityType: row.entity_type as SyncEntry['entityType'],
    entityId: row.entity_id,
    operation: row.operation as SyncEntry['operation'],
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    timestamp: new Date(row.timestamp),
    isSynced: row.is_synced === 1,
  };
}

/**
 * Verifica si hay conectividad de red disponible.
 * Usa try/catch como mecanismo de detección sin agregar dependencias extra.
 */
function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  // Si no está disponible, asumimos que hay conexión
  return true;
}

/**
 * Servicio de sincronización offline-first.
 * Gestiona la cola de cambios locales, sincronización periódica
 * con el backend y resolución de conflictos por timestamp.
 *
 * Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class SyncService {
  private db: SQLiteDatabase;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private token: string | null = null;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Establece el token de autenticación para las llamadas al API.
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Retorna el estado actual de sincronización.
   * Requisito 7.5: Indicador visual del estado de sincronización.
   */
  getStatus(): SyncStatus {
    return useSyncStore.getState().status;
  }

  /**
   * Encola un cambio en la tabla sync_queue para sincronización posterior.
   * Requisito 7.2: Almacenar cambios localmente cuando está offline.
   *
   * @param entry - Datos del cambio sin id ni isSynced (se generan automáticamente).
   */
  async queueChange(entry: Omit<SyncEntry, 'id' | 'isSynced'>): Promise<void> {
    const id = generateId();
    const timestamp = entry.timestamp.toISOString();
    const payload = JSON.stringify(entry.payload);

    await this.db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, timestamp, is_synced)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [id, entry.entityType, entry.entityId, entry.operation, payload, timestamp]
    );

    // Actualizar el store con el nuevo conteo de pendientes
    useSyncStore.getState().incrementPending();
  }

  /**
   * Envía todas las entradas pendientes al backend y las marca como sincronizadas.
   * Maneja conflictos HTTP 409 llamando a resolveConflict.
   *
   * Requisito 7.1: Propagar cambios a todos los dispositivos en máximo 30 segundos.
   * Requisito 7.2: Sincronizar cambios almacenados al recuperar conexión.
   */
  async syncPendingChanges(): Promise<void> {
    // No intentar sincronizar si estamos offline
    if (!isOnline()) {
      return;
    }

    if (!this.token) {
      return;
    }

    const store = useSyncStore.getState();

    // Obtener entradas no sincronizadas
    const rows = await this.db.getAllAsync<SyncQueueRow>(
      `SELECT * FROM sync_queue WHERE is_synced = 0 ORDER BY timestamp ASC`
    );

    if (rows.length === 0) {
      store.setStatus('synced');
      return;
    }

    store.setStatus('syncing');

    for (const row of rows) {
      const entry = mapRowToSyncEntry(row);

      try {
        const result = await syncApi.pushEntry(entry, this.token);

        if ('conflict' in result && result.conflict) {
          // Resolver conflicto: timestamp más reciente gana
          const conflictData = result as SyncConflictResponse;
          const remoteEntry: SyncEntry = {
            id: conflictData.remoteEntry.id,
            entityType: conflictData.remoteEntry.entityType,
            entityId: conflictData.remoteEntry.entityId,
            operation: conflictData.remoteEntry.operation,
            payload: conflictData.remoteEntry.payload,
            timestamp: new Date(conflictData.remoteEntry.timestamp),
            isSynced: conflictData.remoteEntry.isSynced,
          };

          const resolution = this.resolveConflict(entry, remoteEntry);

          // Enviar resolución al servidor
          await syncApi.pushResolution(resolution.resolved, this.token);

          // Marcar como sincronizado localmente
          await this.db.runAsync(
            `UPDATE sync_queue SET is_synced = 1 WHERE id = ?`,
            [entry.id]
          );

          store.decrementPending();
        } else {
          // Éxito: marcar como sincronizado
          await this.db.runAsync(
            `UPDATE sync_queue SET is_synced = 1 WHERE id = ?`,
            [entry.id]
          );

          store.decrementPending();
        }
      } catch {
        // Fallo de red u otro error: mantener en cola para reintentar
        // en el siguiente ciclo (Requisito 7.2)
        break;
      }
    }

    // Verificar si quedaron pendientes
    const remaining = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE is_synced = 0`
    );

    const pendingCount = remaining?.count ?? 0;
    store.setPendingCount(pendingCount);

    if (pendingCount === 0) {
      store.setStatus('synced');
      store.setLastSyncAt(new Date());
    } else {
      store.setStatus('pending');
    }
  }

  /**
   * Resuelve un conflicto entre una entrada local y una remota.
   * La entrada con el timestamp más reciente gana.
   *
   * Requisito 7.3: Resolver conflictos priorizando la marca de tiempo más reciente.
   */
  resolveConflict(local: SyncEntry, remote: SyncEntry): ConflictResolution {
    const localTime = local.timestamp.getTime();
    const remoteTime = remote.timestamp.getTime();

    // El timestamp más reciente gana; en empate, local tiene prioridad
    const resolved = localTime >= remoteTime ? local : remote;

    return {
      localEntry: local,
      remoteEntry: remote,
      resolved,
    };
  }

  /**
   * Inicia la sincronización periódica.
   * Requisito 7.4: Verificar cambios pendientes cada 60 segundos.
   *
   * @param intervalMs - Intervalo en milisegundos (por defecto 60000).
   */
  startPeriodicSync(intervalMs: number = 60_000): void {
    // Evitar múltiples intervalos activos
    if (this.intervalId !== null) {
      this.stopPeriodicSync();
    }

    this.intervalId = setInterval(() => {
      this.syncPendingChanges();
    }, intervalMs);

    // Ejecutar una sincronización inmediata al iniciar
    this.syncPendingChanges();
  }

  /**
   * Detiene la sincronización periódica.
   */
  stopPeriodicSync(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
