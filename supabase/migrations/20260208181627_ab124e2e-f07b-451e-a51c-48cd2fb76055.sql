
-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  origin text,
  roast_level text CHECK (roast_level IN ('light', 'medium', 'dark')),
  flavor_notes text,
  current_stock decimal(10,2) DEFAULT 0,
  unit text DEFAULT 'kg',
  minimum_stock decimal(10,2) DEFAULT 10,
  critical_stock decimal(10,2) DEFAULT 5,
  cost_price decimal(10,2),
  selling_price decimal(10,2),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Products are viewable by authenticated users"
  ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Products are insertable by authenticated users"
  ON public.products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Products are updatable by authenticated users"
  ON public.products FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Products are deletable by authenticated users"
  ON public.products FOR DELETE TO authenticated USING (true);

-- Create stock status view
CREATE OR REPLACE VIEW public.stock_status_view AS
SELECT
  p.*,
  CASE
    WHEN p.current_stock <= p.critical_stock THEN 'critical'
    WHEN p.current_stock <= p.minimum_stock THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM public.products p
WHERE p.is_active = true;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
