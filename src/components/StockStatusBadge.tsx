import type { StockStatus } from '@/types/product';

const statusConfig: Record<StockStatus, { color: string; label: string }> = {
  ok: { color: 'bg-success', label: 'In Stock' },
  low: { color: 'bg-warning', label: 'Low Stock' },
  critical: { color: 'bg-destructive', label: 'Critical' },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const config = statusConfig[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
      <span className="text-muted-foreground">{config.label}</span>
    </span>
  );
}
