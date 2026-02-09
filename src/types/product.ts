export type RoastLevel = 'light' | 'medium' | 'dark';
export type StockStatus = 'ok' | 'low' | 'critical';
export type MovementType = 'in' | 'out' | 'adjustment';
export type MovementSource = 'supplier' | 'woocommerce' | 'manual' | 'damaged' | 'sample' | 'other';

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
  products: {
    name: string;
    unit: string;
  };
}
