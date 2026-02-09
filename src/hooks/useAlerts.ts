import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AlertSetting, AlertLog } from '@/types/product';

export function useAlertSettings() {
  return useQuery({
    queryKey: ['alert-settings'],
    queryFn: async (): Promise<AlertSetting[]> => {
      const { data, error } = await supabase
        .from('alert_settings')
        .select('*')
        .order('alert_type');
      if (error) throw error;
      return (data ?? []) as unknown as AlertSetting[];
    },
  });
}

export function useUpdateAlertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AlertSetting> & { id: string }) => {
      const { error } = await supabase
        .from('alert_settings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-settings'] }),
  });
}

export function useAlertLogs(limit = 20) {
  return useQuery({
    queryKey: ['alert-logs', limit],
    queryFn: async (): Promise<AlertLog[]> => {
      const { data, error } = await supabase
        .from('alert_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as AlertLog[];
    },
  });
}

export function useCreateAlertLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: Omit<AlertLog, 'id' | 'sent_at'>) => {
      const { error } = await supabase.from('alert_log').insert(log);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-logs'] }),
  });
}
