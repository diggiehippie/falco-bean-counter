import { ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import type { MovementType } from '@/types/product';

const config: Record<MovementType, { icon: typeof ArrowUp; className: string }> = {
  in: { icon: ArrowUp, className: 'text-success' },
  out: { icon: ArrowDown, className: 'text-destructive' },
  adjustment: { icon: Settings2, className: 'text-muted-foreground' },
};

export function MovementIcon({ type }: { type: MovementType }) {
  const { icon: Icon, className } = config[type] ?? config.adjustment;
  return <Icon className={`h-4 w-4 ${className}`} />;
}
