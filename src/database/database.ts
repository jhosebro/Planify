import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { ALL_CREATE_STATEMENTS, CREATE_TRANSFERS_TABLE, CREATE_DEBTS_TABLE, CREATE_DEBT_PAYMENTS_TABLE } from './schema';

const DATABASE_NAME = 'planify.db';

/**
 * Current database schema version.
 * Increment this when adding new migrations.
 */
const DATABASE_VERSION = 5;

/**
 * Migration functions indexed by target version.
 * Each migration brings the database from (version - 1) to version.
 */
const migrations: Record<number, (db: SQLiteDatabase) => Promise<void>> = {
  1: async (db) => {
    // Initial schema creation
    // WAL mode is not supported on web (wa-sqlite), so we try but don't fail
    try {
      await db.execAsync(`PRAGMA journal_mode = WAL;`);
    } catch {
      // WAL not available on this platform, continue with default journal mode
    }
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
    for (const statement of ALL_CREATE_STATEMENTS) {
      await db.execAsync(statement);
    }
  },
  2: async (db) => {
    // Add transfers table
    await db.execAsync(CREATE_TRANSFERS_TABLE);
  },
  3: async (db) => {
    // Add debts and debt_payments tables
    await db.execAsync(CREATE_DEBTS_TABLE);
    await db.execAsync(CREATE_DEBT_PAYMENTS_TABLE);
  },
  4: async (db) => {
    // Add linked_reminder_id to transactions
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN linked_reminder_id TEXT REFERENCES reminders(id);`);
  },
  5: async (db) => {
    // Add include_in_general to budgets (whether budget counts in General Budget)
    await db.execAsync(`ALTER TABLE budgets ADD COLUMN include_in_general INTEGER NOT NULL DEFAULT 1;`);
  },
  // Future migrations go here:
};

/**
 * Opens the database and runs any pending migrations.
 * Uses PRAGMA user_version to track the current schema version.
 */
export async function initializeDatabase(): Promise<SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrateDatabase(db);
  return db;
}

/**
 * Runs all pending migrations from the current version up to DATABASE_VERSION.
 */
async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    // Ensure foreign keys are enabled even if no migration runs
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return;
  }

  while (currentVersion < DATABASE_VERSION) {
    const nextVersion = currentVersion + 1;
    const migrationFn = migrations[nextVersion];

    if (!migrationFn) {
      throw new Error(
        `Missing migration for version ${nextVersion}. ` +
        `Current: ${currentVersion}, Target: ${DATABASE_VERSION}`
      );
    }

    await migrationFn(db);
    currentVersion = nextVersion;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

/**
 * Callback suitable for SQLiteProvider's onInit prop.
 * Use this when wrapping the app with <SQLiteProvider>.
 */
export async function onDatabaseInit(db: SQLiteDatabase): Promise<void> {
  await migrateDatabase(db);
}

export { DATABASE_NAME, DATABASE_VERSION };
