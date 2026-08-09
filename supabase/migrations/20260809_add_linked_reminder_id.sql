-- Add linked_reminder_id to transactions table
-- This allows budget calculations to exclude transactions from yearly reminders

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS linked_reminder_id UUID REFERENCES reminders(id);

CREATE INDEX IF NOT EXISTS idx_transactions_linked_reminder ON transactions(linked_reminder_id)
  WHERE linked_reminder_id IS NOT NULL;
