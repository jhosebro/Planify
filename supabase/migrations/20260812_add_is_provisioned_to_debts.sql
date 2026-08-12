-- Add is_provisioned column to debts table
-- This flag indicates that money has already been set aside for this purchase
-- (e.g., a card purchase where the user pre-separated the funds)
ALTER TABLE debts ADD COLUMN IF NOT EXISTS is_provisioned BOOLEAN NOT NULL DEFAULT false;
