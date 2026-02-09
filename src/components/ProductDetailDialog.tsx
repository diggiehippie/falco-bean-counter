import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StockStatusBadge } from '@/components/StockStatusBadge';
import { MovementIcon } from '@/components/MovementIcon';
import { QuickActions } from '@/components/QuickActions';
import { useProductMovements } from '@/hooks/useMovements';
import { timeAgo } from '@/lib/timeago';
import { Skeleton } from '@/components/ui/skeleton';
import type { StockStatusView } from '@/types/product';

interface Props {
  product: StockStatusView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDialog({ product, open, onOpenChange }: Props) {
  const { data: movements, isLoading } = useProductMovements(product?.id ?? null, 10);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product.name}
            <StockStatusBadge status={product.stock_status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Herkomst:</span> {product.origin ?? '—'}</div>
            <div><span className="text-muted-foreground">Branding:</span> <span className="capitalize">{product.roast_level}</span></div>
            <div><span className="text-muted-foreground">Voorraad:</span> {Number(product.current_stock).toFixed(1)} kg</div>
            <div><span className="text-muted-foreground">Min/Kritiek:</span> {product.minimum_stock}/{product.critical_stock} kg</div>
            {product.cost_price && <div><span className="text-muted-foreground">Inkoop:</span> €{Number(product.cost_price).toFixed(2)}</div>}
            {product.selling_price && <div><span className="text-muted-foreground">Verkoop:</span> €{Number(product.selling_price).toFixed(2)}</div>}
          </div>

          {product.flavor_notes && (
            <div className="text-sm"><span className="text-muted-foreground">Smaaknotities:</span> {product.flavor_notes}</div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Snelle acties:</span>
            <QuickActions product={product} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Mutatie Geschiedenis</h4>
              <Link
                to={`/activiteit?product=${product.id}`}
                className="text-xs text-primary hover:underline"
              >
                Alle Mutaties Bekijken →
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : !movements?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nog geen mutaties.</p>
            ) : (
              <div className="space-y-1">
                {movements.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <MovementIcon type={m.movement_type} />
                    <span className="flex-1">
                      {m.movement_type === 'in' ? '+' : '-'}{Number(m.quantity).toFixed(1)} kg
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(m.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
