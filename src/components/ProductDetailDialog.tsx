import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StockStatusBadge } from '@/components/StockStatusBadge';
import { MovementIcon } from '@/components/MovementIcon';
import { QuickActions } from '@/components/QuickActions';
import { useProductMovements } from '@/hooks/useMovements';
import { useSuppliers } from '@/hooks/useSuppliers';
import { timeAgo } from '@/lib/timeago';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Truck, Mail } from 'lucide-react';
import { format, subDays } from 'date-fns';
import type { StockStatusView } from '@/types/product';

export function ProductDetailDialog({ product, open, onOpenChange }: {
  product: StockStatusView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: movements, isLoading } = useProductMovements(product?.id ?? null, 30);
  const { data: suppliers } = useSuppliers();

  const supplier = useMemo(
    () => suppliers?.find((s) => s.id === product?.supplier_id),
    [suppliers, product?.supplier_id]
  );

  // Sales chart data (last 30 days)
  const chartData = useMemo(() => {
    if (!movements) return [];
    const salesOnly = movements.filter((m) => m.movement_type === 'out');
    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'MM-dd');
      dayMap.set(day, 0);
    }
    salesOnly.forEach((m) => {
      const day = format(new Date(m.created_at), 'MM-dd');
      if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) ?? 0) + Number(m.quantity));
    });
    return Array.from(dayMap.entries()).map(([date, kg]) => ({ date, kg }));
  }, [movements]);

  // Stock forecast
  const avgDailySales = useMemo(() => {
    const totalSales = chartData.reduce((s, d) => s + d.kg, 0);
    return totalSales / 30;
  }, [chartData]);

  const daysRemaining = product && avgDailySales > 0
    ? Math.floor(Number(product.current_stock) / avgDailySales)
    : null;

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
            {product.cost_price != null && <div><span className="text-muted-foreground">Inkoop:</span> €{Number(product.cost_price).toFixed(2)}</div>}
            {product.selling_price != null && <div><span className="text-muted-foreground">Verkoop:</span> €{Number(product.selling_price).toFixed(2)}</div>}
          </div>

          {product.flavor_notes && (
            <div className="text-sm"><span className="text-muted-foreground">Smaaknotities:</span> {product.flavor_notes}</div>
          )}

          {/* Stock Forecast */}
          {daysRemaining !== null && (
            <div className={`text-sm p-2 rounded-md ${daysRemaining < 7 ? 'bg-destructive/10 text-destructive' : daysRemaining < 14 ? 'bg-warning/10 text-warning-foreground' : 'bg-muted'}`}>
              📊 Met huidige tempo, voorraad duurt <strong>{daysRemaining} dagen</strong>
            </div>
          )}

          {/* Supplier Info */}
          {supplier && (
            <div className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Truck className="h-4 w-4 text-primary" /> {supplier.name}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {supplier.contact_person && <span>{supplier.contact_person}</span>}
                {supplier.email && (
                  <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 text-primary hover:underline">
                    <Mail className="h-3 w-3" /> Email
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Sales Chart */}
          {chartData.some((d) => d.kg > 0) && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Verkopen (30 dagen)</h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
                    <YAxis tick={{ fontSize: 10 }} width={30} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 12, backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.375rem' }}
                    />
                    <Line type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Snelle acties:</span>
            <QuickActions product={product} />
          </div>

          {/* Movement History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Mutatie Geschiedenis</h4>
              <Link to={`/activiteit?product=${product.id}`} className="text-xs text-primary hover:underline">
                Alle Mutaties Bekijken →
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : !movements?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nog geen mutaties.</p>
            ) : (
              <div className="space-y-1">
                {movements.slice(0, 10).map((m) => (
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
