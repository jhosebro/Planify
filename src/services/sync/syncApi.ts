import type { SyncEntry } from '@/types';

/**
 * Base URL for the sync API.
 * Override via environment variable or config for different environments.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.planify.app';

/**
 * Response from the sync API when a conflict is detected (HTTP 409).
 */
export interface SyncConflictResponse {
  conflict: true;
  remoteEntry: {
    id: string;
    entityType: SyncEntry['entityType'];
    entityId: string;
    operation: SyncEntry['operation'];
    payload: Record<string, unknown>;
    timestamp: string;
    isSynced: boolean;
  };
}

/**
 * Response from the sync API on successful sync.
 */
export interface SyncSuccessResponse {
  success: true;
}

/**
 * Response from posting a conflict resolution.
 */
export interface ResolveResponse {
  success: true;
}

/**
 * Low-level HTTP calls to the sync backend.
 * Each method maps to a single API endpoint.
 */
export const syncApi = {
  /**
   * POST /sync/push
   * Sends a single sync entry to the backend.
   * Returns success or a 409 conflict with the remote version.
   */
  async pushEntry(
    entry: SyncEntry,
    token: string
  ): Promise<SyncSuccessResponse | SyncConflictResponse> {
    const response = await fetch(`${BASE_URL}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: entry.id,
        entityType: entry.entityType,
        entityId: entry.entityId,
        operation: entry.operation,
        payload: entry.payload,
        timestamp: entry.timestamp.toISOString(),
      }),
    });

    if (response.status === 409) {
      const data: SyncConflictResponse = await response.json();
      return data;
    }

    if (!response.ok) {
      throw new Error(`Sync push failed with status ${response.status}`);
    }

    return { success: true };
  },

  /**
   * POST /sync/resolve
   * Sends the resolved entry after a conflict resolution.
   */
  async pushResolution(
    resolved: SyncEntry,
    token: string
  ): Promise<ResolveResponse> {
    const response = await fetch(`${BASE_URL}/sync/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: resolved.id,
        entityType: resolved.entityType,
        entityId: resolved.entityId,
        operation: resolved.operation,
        payload: resolved.payload,
        timestamp: resolved.timestamp.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync resolve failed with status ${response.status}`);
    }

    return { success: true };
  },
};
