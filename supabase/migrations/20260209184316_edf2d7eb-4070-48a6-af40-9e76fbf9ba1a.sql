
-- Add woocommerce_product_id to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS woocommerce_product_id integer;
CREATE INDEX IF NOT EXISTS idx_products_wc_id ON public.products (woocommerce_product_id);

-- WooCommerce settings table
CREATE TABLE public.woocommerce_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_url text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  webhook_secret text,
  auto_import_enabled boolean DEFAULT false,
  last_import_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.woocommerce_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WC settings viewable by authenticated" ON public.woocommerce_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "WC settings insertable by authenticated" ON public.woocommerce_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "WC settings updatable by authenticated" ON public.woocommerce_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "WC settings deletable by authenticated" ON public.woocommerce_settings FOR DELETE TO authenticated USING (true);

-- Sync log table
CREATE TABLE public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text CHECK (sync_type IN ('import_products', 'import_stock', 'import_order', 'full_sync')) NOT NULL,
  direction text CHECK (direction IN ('from_woocommerce', 'to_woocommerce')) DEFAULT 'from_woocommerce',
  product_id uuid REFERENCES public.products(id),
  woocommerce_product_id integer,
  woocommerce_order_id integer,
  old_value text,
  new_value text,
  status text CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
  error_message text,
  error_details jsonb,
  synced_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sync log viewable by authenticated" ON public.sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sync log insertable by authenticated" ON public.sync_log FOR INSERT TO authenticated WITH CHECK (true);

-- Update stock_status_view to include woocommerce_product_id
DROP VIEW IF EXISTS public.stock_status_view;
CREATE VIEW public.stock_status_view WITH (security_invoker=on) AS
SELECT 
  p.id, p.name, p.description, p.origin, p.roast_level, p.flavor_notes,
  p.current_stock, p.unit, p.minimum_stock, p.critical_stock,
  p.cost_price, p.selling_price, p.supplier_id,
  p.packaging_size_id, p.package_count,
  p.woocommerce_product_id,
  p.is_active, p.created_at, p.updated_at,
  CASE
    WHEN p.current_stock <= p.critical_stock THEN 'critical'
    WHEN p.current_stock <= p.minimum_stock THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM public.products p
WHERE p.is_active = true;
