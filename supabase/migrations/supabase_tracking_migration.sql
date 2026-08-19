-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Tracking Lists & Items
-- Funcionalidad de seguimiento de productos con listas agrupadas
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabla de listas de seguimiento
CREATE TABLE IF NOT EXISTS tracking_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#007DC3',
  icon TEXT NOT NULL DEFAULT '📋',
  linked_budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de items/productos dentro de una lista
CREATE TABLE IF NOT EXISTS tracking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES tracking_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  last_purchase_date DATE,
  average_duration_days INTEGER,
  needs_to_buy BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tracking_lists_user_id ON tracking_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_items_list_id ON tracking_items(list_id);
CREATE INDEX IF NOT EXISTS idx_tracking_items_user_id ON tracking_items(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_items_needs_to_buy ON tracking_items(list_id, needs_to_buy);

-- RLS (Row Level Security)
ALTER TABLE tracking_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_items ENABLE ROW LEVEL SECURITY;

-- Policies para tracking_lists
CREATE POLICY "Users can view their own tracking lists"
  ON tracking_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracking lists"
  ON tracking_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking lists"
  ON tracking_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking lists"
  ON tracking_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para tracking_items
CREATE POLICY "Users can view their own tracking items"
  ON tracking_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracking items"
  ON tracking_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking items"
  ON tracking_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking items"
  ON tracking_items FOR DELETE
  USING (auth.uid() = user_id);
