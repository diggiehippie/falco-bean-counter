import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MovementWithProduct, MovementType, MovementSource } from '@/types/product';

export function useRecentMovements(limit = 20) {
  return useQuery({
    queryKey: ['movements', 'recent', limit],
    queryFn: async (): Promise<MovementWithProduct[]> => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, products (name, unit)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as MovementWithProduct[];
    },
    refetchInterval: 30000,
  });
}

export function useProductMovements(productId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['movements', 'product', productId, limit],
    queryFn: async (): Promise<MovementWithProduct[]> => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, products (name, unit)')
        .eq('product_id', productId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as MovementWithProduct[];
    },
    enabled: !!productId,
  });
}

interface MovementsFilterParams {
  productIds?: string[];
  movementType?: MovementType | null;
  source?: MovementSource | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page: number;
  pageSize: number;
}

export function useFilteredMovements(params: MovementsFilterParams) {
  return useQuery({
    queryKey: ['movements', 'filtered', params],
    queryFn: async () => {
      let query = supabase
        .from('inventory_movements')
        .select('*, products (name, unit)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (params.productIds?.length) {
        query = query.in('product_id', params.productIds);
      }
      if (params.movementType) {
        query = query.eq('movement_type', params.movementType);
      }
      if (params.source) {
        query = query.eq('source', params.source);
      }
      if (params.dateFrom) {
        query = query.gte('created_at', params.dateFrom);
      }
      if (params.dateTo) {
        query = query.lte('created_at', params.dateTo + 'T23:59:59');
      }

      const from = params.page * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as unknown as MovementWithProduct[], count: count ?? 0 };
    },
  });
}

interface CreateMovementParams {
  product_id: string;
  movement_type: MovementType;
  source: MovementSource;
  quantity: number;
  reason?: string;
  notes?: string;
  user_email?: string;
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateMovementParams) => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert(params)
        .select('*, products (name, unit)')
        .single();
      if (error) throw error;
      return data as unknown as MovementWithProduct;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
    },
  });
}
