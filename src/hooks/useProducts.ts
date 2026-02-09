import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product, StockStatusView } from '@/types/product';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<StockStatusView[]> => {
      const { data, error } = await supabase
        .from('stock_status_view')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as StockStatusView[];
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'unit'>) => {
      const { data, error } = await supabase.from('products').insert(product).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function usePackagingSizes() {
  return useQuery({
    queryKey: ['packaging_sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_sizes')
        .select('*')
        .eq('is_active', true)
        .order('weight_grams', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
