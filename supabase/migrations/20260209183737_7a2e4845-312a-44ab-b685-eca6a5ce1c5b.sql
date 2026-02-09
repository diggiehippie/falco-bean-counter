
DROP VIEW IF EXISTS public.stock_status_view;

CREATE VIEW public.stock_status_view WITH (security_invoker=on) AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.origin,
  p.roast_level,
  p.flavor_notes,
  p.current_stock,
  p.unit,
  p.minimum_stock,
  p.critical_stock,
  p.cost_price,
  p.selling_price,
  p.supplier_id,
  p.packaging_size_id,
  p.package_count,
  p.is_active,
  p.created_at,
  p.updated_at,
  CASE
    WHEN p.current_stock <= p.critical_stock THEN 'critical'
    WHEN p.current_stock <= p.minimum_stock THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM public.products p
WHERE p.is_active = true;
