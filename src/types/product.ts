export type RoastLevel = 'light' | 'medium' | 'dark';
export type StockStatus = 'ok' | 'low' | 'critical';

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
