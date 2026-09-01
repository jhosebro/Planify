/**
 * Database schema definitions for Planify.
 * All monetary amounts are stored in centavos (integers) to avoid floating-point errors.
 */

export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const CREATE_ACCOUNTS_TABLE = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card')),
  balance INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const CREATE_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default INTEGER NOT NULL DEFAULT 0
);`;

export const CREATE_TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  category_id TEXT NOT NULL REFERENCES categories(id),
  description TEXT,
  date TEXT NOT NULL,
  linked_transfer_id TEXT,
  linked_reminder_id TEXT REFERENCES reminders(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const CREATE_BUDGETS_TABLE = `
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  monthly_limit INTEGER NOT NULL CHECK (monthly_limit > 0),
  alert_threshold INTEGER NOT NULL CHECK (alert_threshold BETWEEN 1 AND 100),
  is_active INTEGER NOT NULL DEFAULT 1,
  include_in_general INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const CREATE_REMINDERS_TABLE = `
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  due_date TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly')),
  is_paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const CREATE_TRANSFERS_TABLE = `
CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source_account_id TEXT NOT NULL REFERENCES accounts(id),
  destination_account_id TEXT NOT NULL REFERENCES accounts(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  source_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  destination_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const CREATE_SYNC_QUEUE_TABLE = `
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  is_synced INTEGER NOT NULL DEFAULT 0
);`;

export const CREATE_DEBTS_TABLE = `
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK (category IN ('credit_card', 'installment', 'personal')),
  direction TEXT NOT NULL CHECK (direction IN ('i_owe', 'they_owe_me')),
  name TEXT NOT NULL,
  description TEXT,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  paid_amount INTEGER NOT NULL DEFAULT 0,
  total_installments INTEGER,
  paid_installments INTEGER DEFAULT 0,
  installment_amount INTEGER,
  counterparty TEXT,
  linked_account_id TEXT REFERENCES accounts(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

export const CREATE_DEBT_PAYMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

/**
 * All CREATE TABLE statements in dependency order.
 */
export const ALL_CREATE_STATEMENTS = [
  CREATE_USERS_TABLE,
  CREATE_ACCOUNTS_TABLE,
  CREATE_CATEGORIES_TABLE,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_TRANSFERS_TABLE,
  CREATE_BUDGETS_TABLE,
  CREATE_REMINDERS_TABLE,
  CREATE_DEBTS_TABLE,
  CREATE_DEBT_PAYMENTS_TABLE,
  CREATE_SYNC_QUEUE_TABLE,
];
