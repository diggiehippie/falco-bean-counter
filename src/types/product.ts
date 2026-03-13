export type RoastLevel = 'light' | 'medium' | 'dark';
export type StockStatus = 'ok' | 'low' | 'critical';
export type MovementType = 'in' | 'out' | 'adjustment';
export type MovementSource = 'supplier' | 'woocommerce' | 'manual' | 'damaged' | 'sample' | 'other';
export type OrderStatus = 'draft' | 'sent' | 'delivered' | 'cancelled';
export type AlertType = 'low_stock' | 'critical_stock' | 'daily_summary';

export interface PackagingSize {
  id: string;
  label: string;
  weight_grams: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  origin?: string | null;
  roast_level: RoastLevel;
  flavor_notes?: string | null;
  current_stock: number;
  unit: string;
  minimum_stock: number;
  critical_stock: number;
  cost_price?: number | null;
  selling_price?: number | null;
  supplier_id?: string | null;
  packaging_size_id?: string | null;
  package_count?: number | null;
  woocommerce_product_id?: number | null;
  woocommerce_parent_id?: number | null;
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
  email?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  average_delivery_days: number;
  minimum_order_value?: number | null;
  notes?: string | null;
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

export interface AlertSetting {
  id: string;
  alert_type: AlertType;
  is_enabled: boolean;
  email_recipients: string[];
  notification_time?: string;
  last_sent_at?: string;
  created_at: string;
}

export interface AlertLog {
  id: string;
  alert_type: string;
  product_id?: string;
  message: string;
  sent_to: string[];
  sent_at: string;
}
