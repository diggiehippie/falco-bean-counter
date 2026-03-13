import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrderWithDetails, OrderStatus } from '@/types/product';

export function useOrders(supplierId?: string | null) {
  return useQuery({
    queryKey: ['orders', supplierId],
    queryFn: async (): Promise<OrderWithDetails[]> => {
      let query = supabase
        .from('supplier_orders')
        .select('*, suppliers(*), supplier_order_items(*, products(name, unit))')
        .order('created_at', { ascending: false });
      if (supplierId) query = query.eq('supplier_id', supplierId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as OrderWithDetails[];
    },
  });
}

interface CreateOrderParams {
  supplier_id: string;
  expected_delivery_date?: string;
  total_amount?: number;
  notes?: string;
  email_body?: string;
  created_by?: string;
  items: { product_id: string; quantity: number; unit_price?: number; total_price?: number }[];
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, ...orderData }: CreateOrderParams) => {
      const { data: order, error: orderError } = await supabase
        .from('supplier_orders')
        .insert(orderData)
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({ ...item, order_id: order!.id }));
      const { error: itemsError } = await supabase
        .from('supplier_order_items')
        .insert(orderItems);
      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, actual_delivery_date }: { id: string; status: OrderStatus; actual_delivery_date?: string }) => {
      const updates: any = { status };
      if (actual_delivery_date) updates.actual_delivery_date = actual_delivery_date;
      const { error } = await supabase.from('supplier_orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
