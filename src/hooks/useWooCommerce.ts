import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WooCommerceSettings {
  id: string;
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  webhook_secret?: string;
  auto_import_enabled: boolean;
  last_import_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface SyncLog {
  id: string;
  sync_type: 'import_products' | 'import_stock' | 'import_order' | 'full_sync';
  direction: 'from_woocommerce' | 'to_woocommerce';
  product_id?: string;
  woocommerce_product_id?: number;
  woocommerce_order_id?: number;
  old_value?: string;
  new_value?: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  error_details?: any;
  synced_at: string;
}

export function useWooCommerceSettings() {
  return useQuery({
    queryKey: ['woocommerce_settings'],
    queryFn: async (): Promise<WooCommerceSettings | null> => {
      const { data, error } = await supabase
        .from('woocommerce_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WooCommerceSettings | null;
    },
  });
}

export function useSaveWooCommerceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<WooCommerceSettings> & { store_url: string; consumer_key: string; consumer_secret: string }) => {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('woocommerce_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('woocommerce_settings')
          .update(settings)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('woocommerce_settings')
          .insert(settings)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['woocommerce_settings'] }),
  });
}

export function useSyncLogs(limit = 50) {
  return useQuery({
    queryKey: ['sync_logs', limit],
    queryFn: async (): Promise<SyncLog[]> => {
      const { data, error } = await supabase
        .from('sync_log')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as SyncLog[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

export function useTodaySyncStats() {
  return useQuery({
    queryKey: ['sync_stats_today'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('sync_log')
        .select('*')
        .eq('sync_type', 'import_order')
        .eq('status', 'success')
        .gte('synced_at', today.toISOString());
      if (error) throw error;
      return {
        orderCount: data?.length ?? 0,
        totalQty: data?.reduce((s, d) => {
          const oldVal = Number(d.old_value) || 0;
          const newVal = Number(d.new_value) || 0;
          return s + Math.abs(oldVal - newVal);
        }, 0) ?? 0,
      };
    },
    refetchInterval: 30000,
  });
}

async function callWcSync(action: string, params: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Niet ingelogd');

  const res = await supabase.functions.invoke('woocommerce-sync', {
    body: { action, ...params },
  });

  if (res.error) throw new Error(res.error.message || 'Sync fout');
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export function useTestWcConnection() {
  return useMutation({
    mutationFn: async (params: { store_url: string; consumer_key: string; consumer_secret: string }) =>
      callWcSync('test_connection', params),
  });
}

export function useImportProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => callWcSync('import_products'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['sync_logs'] });
      qc.invalidateQueries({ queryKey: ['woocommerce_settings'] });
    },
  });
}

export function useSyncStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => callWcSync('sync_stock'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['sync_logs'] });
      qc.invalidateQueries({ queryKey: ['woocommerce_settings'] });
    },
  });
}

export function useMatchProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => callWcSync('match_products'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['sync_logs'] });
    },
  });
}
