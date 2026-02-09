export type RoastLevel = 'light' | 'medium' | 'dark';
export type StockStatus = 'ok' | 'low' | 'critical';
export type MovementType = 'in' | 'out' | 'adjustment';
export type MovementSource = 'supplier' | 'woocommerce' | 'manual' | 'damaged' | 'sample' | 'other';
export type OrderStatus = 'draft' | 'sent' | 'delivered' | 'cancelled';

export interface Product {
  id: string;
  name: string;
  description?: string;
  origin?: string;
  roast_level: RoastLevel;
  flavor_notes?: string;
  current_stock: number;
  unit: string;
  minimum_stock: number;
  critical_stock: number;
  cost_price?: number;
  selling_price?: number;
  supplier_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockStatusView extends Product {
  stock_status: StockStatus;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  source: MovementSource;
  quantity: number;
  reason?: string;
  notes?: string;
  user_email?: string;
  created_at: string;
}

export interface MovementWithProduct extends InventoryMovement {
  products: { name: string; unit: string };
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  average_delivery_days: number;
  minimum_order_value?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface SupplierOrder {
  id: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: OrderStatus;
  total_amount?: number;
  notes?: string;
  email_body?: string;
  created_by?: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

export interface OrderWithDetails extends SupplierOrder {
  suppliers: Supplier;
  supplier_order_items: (OrderItem & {
    products: { name: string; unit: string };
  })[];
}
