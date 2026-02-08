
-- Fix security definer view by setting security_invoker
ALTER VIEW public.stock_status_view SET (security_invoker = on);
