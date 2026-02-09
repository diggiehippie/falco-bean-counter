import { Link } from 'react-router-dom';
import { useRecentMovements } from '@/hooks/useMovements';
import { MovementIcon } from '@/components/MovementIcon';
import { timeAgo } from '@/lib/timeago';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import type { MovementType } from '@/types/product';

const SOURCE_LABELS: Record<string, string> = {
  supplier: 'Leverancier',
  woocommerce: 'Webshop',
  manual: 'Handmatig',
  damaged: 'Beschadigd',
  sample: 'Monster',
  other: 'Overig',
};

function formatDescription(m: { products: { name: string }; movement_type: MovementType; quantity: number; source: string; reason?: string }) {
  const sign = m.movement_type === 'in' ? '+' : '-';
  const label = m.reason ? SOURCE_LABELS[m.reason] ?? m.reason : SOURCE_LABELS[m.source] ?? m.source;
  return `${m.products.name} | ${sign}${Number(m.quantity).toFixed(1)} kg | ${label}`;
}

export function ActivityFeed() {
  const { data: movements, isLoading } = useRecentMovements(20);
  const qc = useQueryClient();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recente Activiteit</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ['movements'] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link to="/activiteit" className="text-sm text-primary hover:underline font-medium">
            Alles Bekijken →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !movements?.length ? (
          <div className="text-center py-8 space-y-3">
            <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Nog geen activiteit. Begin met voorraad toevoegen!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 text-sm">
                <MovementIcon type={m.movement_type} />
                <span className="flex-1 truncate">{formatDescription(m)}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(m.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
