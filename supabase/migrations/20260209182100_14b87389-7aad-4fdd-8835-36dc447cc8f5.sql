-- Alert settings table
CREATE TABLE public.alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text CHECK (alert_type IN ('low_stock', 'critical_stock', 'daily_summary')) NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  email_recipients text[],
  notification_time time DEFAULT '09:00:00',
  last_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alert settings are viewable by authenticated users"
  ON public.alert_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Alert settings are insertable by authenticated users"
  ON public.alert_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Alert settings are updatable by authenticated users"
  ON public.alert_settings FOR UPDATE TO authenticated USING (true);

-- Alert log table
CREATE TABLE public.alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text,
  product_id uuid REFERENCES public.products(id),
  message text,
  sent_to text[],
  sent_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alert log is viewable by authenticated users"
  ON public.alert_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Alert log is insertable by authenticated users"
  ON public.alert_log FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default alert settings
INSERT INTO public.alert_settings (alert_type, is_enabled, email_recipients) VALUES
('low_stock', true, ARRAY['vic@falcocaffe.com', 'hallo@falcocaffe.com']),
('critical_stock', true, ARRAY['vic@falcocaffe.com', 'hallo@falcocaffe.com']),
('daily_summary', false, ARRAY['hallo@falcocaffe.com']);