-- ============================================================
-- 1. CHECK constraint: prevent negative stock
-- ============================================================
ALTER TABLE public.products
  ADD CONSTRAINT products_current_stock_non_negative
  CHECK (current_stock >= 0);

-- Update the stock trigger to clamp at 0 instead of going negative
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE products
    SET current_stock = current_stock + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'out' OR NEW.movement_type = 'adjustment' THEN
    UPDATE products
    SET current_stock = GREATEST(current_stock - NEW.quantity, 0),
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Atomic webhook deduplication table
-- ============================================================
CREATE TABLE public.processed_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  woocommerce_order_id integer NOT NULL,
  processed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT processed_webhooks_order_unique UNIQUE (woocommerce_order_id)
);

ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

-- Service role needs full access (webhooks use service role)
CREATE POLICY "Service role full access on processed_webhooks"
  ON public.processed_webhooks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can read
CREATE POLICY "Authenticated can view processed_webhooks"
  ON public.processed_webhooks FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 3. Transactional order delivery function
-- ============================================================
CREATE OR REPLACE FUNCTION public.deliver_order(
  p_order_id uuid,
  p_user_email text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_count integer := 0;
BEGIN
  -- Update order status atomically
  UPDATE supplier_orders
  SET status = 'delivered',
      actual_delivery_date = CURRENT_DATE
  WHERE id = p_order_id
    AND status IN ('draft', 'sent');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order niet gevonden of al geleverd/geannuleerd';
  END IF;

  -- Create inventory movements for all items
  FOR v_item IN
    SELECT product_id, quantity
    FROM supplier_order_items
    WHERE order_id = p_order_id
      AND product_id IS NOT NULL
  LOOP
    INSERT INTO inventory_movements (product_id, movement_type, source, quantity, notes, user_email)
    VALUES (
      v_item.product_id,
      'in',
      'supplier',
      v_item.quantity,
      'Levering bestelling ' || LEFT(p_order_id::text, 8),
      p_user_email
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('delivered', true, 'movements_created', v_count);
END;
$$;
