
-- Create packaging_sizes table
CREATE TABLE public.packaging_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  weight_grams integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.packaging_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packaging sizes viewable by authenticated" ON public.packaging_sizes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Packaging sizes insertable by authenticated" ON public.packaging_sizes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Packaging sizes updatable by authenticated" ON public.packaging_sizes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Packaging sizes deletable by authenticated" ON public.packaging_sizes FOR DELETE TO authenticated USING (true);

-- Seed default packaging sizes
INSERT INTO public.packaging_sizes (label, weight_grams) VALUES
('1 kg', 1000),
('250 gr', 250);

-- Add packaging columns to products
ALTER TABLE public.products
  ADD COLUMN packaging_size_id uuid REFERENCES public.packaging_sizes(id),
  ADD COLUMN package_count integer DEFAULT 0;

-- Re-seed alert settings
INSERT INTO public.alert_settings (alert_type, is_enabled, email_recipients) VALUES
('low_stock', true, ARRAY['vic@falcocaffe.com', 'hallo@falcocaffe.com']),
('critical_stock', true, ARRAY['vic@falcocaffe.com', 'hallo@falcocaffe.com']),
('daily_summary', false, ARRAY['hallo@falcocaffe.com']);
