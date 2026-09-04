-- Add manual_spent column to budgets table
-- Stores manually registered spending that doesn't create account transactions

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS manual_spent BIGINT NOT NULL DEFAULT 0;
