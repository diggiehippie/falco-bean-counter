-- Create inventory movements table
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text CHECK (movement_type IN ('in', 'out', 'adjustment')) NOT NULL,
  source text CHECK (source IN ('supplier', 'woocommerce', 'manual', 'damaged', 'sample', 'other')) NOT NULL,
  quantity decimal(10,2) NOT NULL,
  reason text,
  notes text,
  user_email text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Movements are viewable by authenticated users"
ON public.inventory_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Movements are insertable by authenticated users"
ON public.inventory_movements FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to automatically update product stock
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
    SET current_stock = current_stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();