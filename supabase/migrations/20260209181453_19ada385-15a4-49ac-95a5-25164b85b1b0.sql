-- Create suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  contact_person text,
  average_delivery_days integer DEFAULT 7,
  minimum_order_value decimal(10,2),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers are viewable by authenticated users"
  ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Suppliers are insertable by authenticated users"
  ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Suppliers are updatable by authenticated users"
  ON public.suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Suppliers are deletable by authenticated users"
  ON public.suppliers FOR DELETE TO authenticated USING (true);

-- Add supplier reference to products
ALTER TABLE public.products ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);

-- Create supplier orders table
CREATE TABLE public.supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id),
  order_date timestamp with time zone DEFAULT now(),
  expected_delivery_date date,
  actual_delivery_date date,
  status text CHECK (status IN ('draft', 'sent', 'delivered', 'cancelled')) DEFAULT 'draft',
  total_amount decimal(10,2),
  notes text,
  email_body text,
  created_by text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders are viewable by authenticated users"
  ON public.supplier_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Orders are insertable by authenticated users"
  ON public.supplier_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Orders are updatable by authenticated users"
  ON public.supplier_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Orders are deletable by authenticated users"
  ON public.supplier_orders FOR DELETE TO authenticated USING (true);

-- Create order items table
CREATE TABLE public.supplier_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  quantity decimal(10,2) NOT NULL,
  unit_price decimal(10,2),
  total_price decimal(10,2)
);

ALTER TABLE public.supplier_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items are viewable by authenticated users"
  ON public.supplier_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Order items are insertable by authenticated users"
  ON public.supplier_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Order items are updatable by authenticated users"
  ON public.supplier_order_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Order items are deletable by authenticated users"
  ON public.supplier_order_items FOR DELETE TO authenticated USING (true);

-- Seed suppliers
INSERT INTO public.suppliers (name, email, phone, contact_person, average_delivery_days, notes) VALUES
('Coffee Roasters NL', 'orders@roasters.nl', '+31 20 123 4567', 'Jan de Vries', 4, 'Levert Ethiopische en Kenyaanse bonen'),
('Bean Importers EU', 'info@beanimport.eu', '+32 2 987 6543', 'Marie Dubois', 8, 'Specialist in Zuid-Amerikaanse koffie'),
('Dutch Coffee Supply', 'contact@dutchcoffee.nl', '+31 10 555 7890', 'Pieter Bakker', 3, 'Snelle levering, lokale brander');

-- Link products to suppliers
UPDATE public.products SET supplier_id = (SELECT id FROM public.suppliers WHERE name = 'Coffee Roasters NL' LIMIT 1)
WHERE name = 'Ethiopia Yirgacheffe';

UPDATE public.products SET supplier_id = (SELECT id FROM public.suppliers WHERE name = 'Bean Importers EU' LIMIT 1)
WHERE name = 'Colombia Supremo';

UPDATE public.products SET supplier_id = (SELECT id FROM public.suppliers WHERE name = 'Dutch Coffee Supply' LIMIT 1)
WHERE name = 'Brazil Santos';

-- Drop and recreate stock_status_view to include supplier_id
DROP VIEW IF EXISTS public.stock_status_view;
CREATE OR REPLACE VIEW public.stock_status_view WITH (security_invoker=on) AS
SELECT
  p.*,
  CASE
    WHEN p.current_stock <= p.critical_stock THEN 'critical'
    WHEN p.current_stock <= p.minimum_stock THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM public.products p
WHERE p.is_active = true;