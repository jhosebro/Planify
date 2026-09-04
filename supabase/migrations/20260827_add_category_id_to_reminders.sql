-- Add category_id column to reminders table
-- Links a reminder to a budget category so payments are tracked correctly

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_category_id ON reminders(category_id)
  WHERE category_id IS NOT NULL;
