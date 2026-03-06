-- Fix: allow product deletion by changing FK constraints to ON DELETE SET NULL
-- This preserves historical records (orders, alerts, sync logs) while allowing products to be removed.

ALTER TABLE public.supplier_order_items
  DROP CONSTRAINT supplier_order_items_product_id_fkey,
  ADD CONSTRAINT supplier_order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.alert_log
  DROP CONSTRAINT alert_log_product_id_fkey,
  ADD CONSTRAINT alert_log_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.sync_log
  DROP CONSTRAINT sync_log_product_id_fkey,
  ADD CONSTRAINT sync_log_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
