-- ============================================================
-- Falco Bean Counter - Full Database Migration
-- Run this in Supabase SQL Editor (SQL Editor > New Query)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Packaging Sizes
CREATE TABLE packaging_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  weight_grams NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_person TEXT,
  average_delivery_days NUMERIC,
  minimum_order_value NUMERIC,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  origin TEXT,
  roast_level TEXT,
  flavor_notes TEXT,
  current_stock NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  minimum_stock NUMERIC,
  critical_stock NUMERIC,
  cost_price NUMERIC,
  selling_price NUMERIC,
  supplier_id UUID REFERENCES suppliers(id),
  packaging_size_id UUID REFERENCES packaging_sizes(id),
  package_count NUMERIC,
  woocommerce_product_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory Movements
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  movement_type TEXT NOT NULL,
  source TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  reason TEXT,
  notes TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier Orders
CREATE TABLE supplier_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id),
  order_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC,
  notes TEXT,
  email_body TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier Order Items
CREATE TABLE supplier_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES supplier_orders(id),
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC,
  total_price NUMERIC
);

-- Sync Log (WooCommerce)
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT NOT NULL,
  direction TEXT,
  product_id UUID REFERENCES products(id),
  woocommerce_product_id INTEGER,
  woocommerce_order_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  status TEXT,
  error_message TEXT,
  error_details JSONB,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- WooCommerce Settings
CREATE TABLE woocommerce_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  webhook_secret TEXT,
  auto_import_enabled BOOLEAN DEFAULT false,
  last_import_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alert Settings
CREATE TABLE alert_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  email_recipients TEXT[],
  notification_time TIME,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alert Log
CREATE TABLE alert_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT,
  product_id UUID REFERENCES products(id),
  message TEXT,
  sent_to TEXT[],
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT,
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES chat_conversations(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. VIEW: stock_status_view
-- ============================================================

CREATE VIEW stock_status_view AS
SELECT
  p.*,
  CASE
    WHEN p.critical_stock IS NOT NULL AND p.current_stock <= p.critical_stock THEN 'critical'
    WHEN p.minimum_stock IS NOT NULL AND p.current_stock <= p.minimum_stock THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM products p;

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- Auto-update products.updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-update products.current_stock when inventory_movements are inserted
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE products
    SET current_stock = COALESCE(current_stock, 0) + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE products
    SET current_stock = COALESCE(current_stock, 0) - NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE products
    SET current_stock = NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_movement_stock_update
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_movement();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users full access
-- (This is an internal business app, not multi-tenant)

CREATE POLICY "Authenticated users full access" ON products
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON suppliers
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON supplier_orders
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON supplier_order_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON inventory_movements
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON packaging_sizes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON sync_log
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON woocommerce_settings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON alert_settings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON alert_log
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON chat_conversations
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON chat_messages
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Service role needs access to sync_log, products, inventory_movements,
-- and woocommerce_settings for webhook processing (no user auth)
CREATE POLICY "Service role access" ON sync_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON inventory_movements
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON woocommerce_settings
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 5. INDEXES (for performance)
-- ============================================================

CREATE INDEX idx_products_wc_id ON products(woocommerce_product_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_created ON inventory_movements(created_at DESC);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_sync_log_type ON sync_log(sync_type);
CREATE INDEX idx_sync_log_synced ON sync_log(synced_at DESC);
CREATE INDEX idx_sync_log_order ON sync_log(woocommerce_order_id);
CREATE INDEX idx_orders_supplier ON supplier_orders(supplier_id);
CREATE INDEX idx_order_items_order ON supplier_order_items(order_id);
CREATE INDEX idx_chat_messages_conv ON chat_messages(conversation_id);

-- ============================================================
-- 6. DEFAULT DATA
-- ============================================================

-- Insert default alert settings
INSERT INTO alert_settings (alert_type, is_enabled) VALUES
  ('low_stock', false),
  ('critical_stock', false),
  ('daily_summary', false);

-- ============================================================
-- DONE! Your database is ready.
-- Next step: Create a user account via Supabase Auth (or sign up in the app)
-- ============================================================
