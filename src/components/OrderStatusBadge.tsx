import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types/product';

const config: Record<OrderStatus, { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }> = {
  draft: { label: 'Concept', variant: 'secondary' },
  sent: { label: 'Verzonden', variant: 'default' },
  delivered: { label: 'Geleverd', variant: 'outline' },
  cancelled: { label: 'Geannuleerd', variant: 'destructive' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = config[status] ?? config.draft;
  return <Badge variant={variant}>{label}</Badge>;
}
