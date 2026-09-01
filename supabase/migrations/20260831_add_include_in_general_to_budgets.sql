-- Add include_in_general column to budgets table
-- This flag lets the user decide whether a budget counts within the General Budget
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS include_in_general BOOLEAN NOT NULL DEFAULT true;
