import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useRecentMovements } from '@/hooks/useMovements';
import { useAlertLogs } from '@/hooks/useAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StockStatusBadge } from '@/components/StockStatusBadge';
import { QuickActions } from '@/components/QuickActions';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ProductDetailDialog } from '@/components/ProductDetailDialog';
import { Package, AlertTriangle, AlertCircle, DollarSign, TrendingDown, ShoppingCart, ArrowUpRight, Bell } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { timeAgo } from '@/lib/timeago';
import { subDays } from 'date-fns';
import type { StockStatusView } from '@/types/product';

export default function Dashboard() {
  const { data: products, isLoading } = useProducts();
  const { data: recentMovements } = useRecentMovements(100);
  const { data: alertLogs } = useAlertLogs(5);
  const [detailProduct, setDetailProduct] = useState<StockStatusView | null>(null);

  const total = products?.length ?? 0;
  const lowCount = products?.filter((p) => p.stock_status === 'low').length ?? 0;
  const criticalCount = products?.filter((p) => p.stock_status === 'critical').length ?? 0;
  const totalValue = products?.reduce((sum, p) => sum + (Number(p.current_stock) * (Number(p.cost_price) || 0)), 0) ?? 0;

  // Weekly stats
  const weekAgo = subDays(new Date(), 7).toISOString();
  const weekMovements = useMemo(
    () => recentMovements?.filter((m) => m.created_at >= weekAgo) ?? [],
    [recentMovements, weekAgo]
  );
  const weekSales = weekMovements.filter((m) => m.movement_type === 'out').reduce((s, m) => s + Number(m.quantity), 0);
  const weekStockIn = weekMovements.filter((m) => m.movement_type === 'in').reduce((s, m) => s + Number(m.quantity), 0);

  const cards = [
    { title: 'Totaal Producten', value: String(total), icon: Package, color: 'text-primary' },
    { title: 'Lage Voorraad', value: String(lowCount), icon: AlertTriangle, color: 'text-warning', link: '/products?status=low' },
    { title: 'Kritieke Voorraad', value: String(criticalCount), icon: AlertCircle, color: 'text-destructive', link: '/products?status=critical' },
    { title: 'Totale Voorraadwaarde', value: `€${totalValue.toFixed(0)}`, icon: DollarSign, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Dashboard</h1>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const inner = (
            <Card key={card.title} className={card.link ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-heading">{card.value}</p>}
              </CardContent>
            </Card>
          );
          return card.link ? <Link key={card.title} to={card.link}>{inner}</Link> : <div key={card.title}>{inner}</div>;
        })}
      </div>

      {/* Quick Stats - This Week */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-heading">{weekSales.toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">Verkopen deze week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-lg font-heading">{weekStockIn.toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">Toegevoegd deze week</p>
            </div>
          </CardContent>
        </Card>
        <Link to="/rapporten">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-4 flex items-center gap-3 h-full">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-heading">Rapporten</p>
                <p className="text-xs text-muted-foreground">Bekijk gedetailleerde statistieken</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Active Alerts */}
      {alertLogs && alertLogs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" /> Actieve Meldingen
            </CardTitle>
            <Link to="/instellingen" className="text-sm text-primary hover:underline">Instellingen →</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {alertLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                  <span>{log.message}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{timeAgo(log.sent_at)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Producten Overzicht</CardTitle>
          <Link to="/products" className="text-sm text-primary hover:underline font-medium">Alles Bekijken →</Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !products?.length ? (
            <p className="text-muted-foreground text-center py-8">Nog geen producten. Voeg je eerste product toe!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Herkomst</TableHead>
                    <TableHead>Branding</TableHead>
                    <TableHead className="text-right">Voorraad (kg)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 10).map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetailProduct(p)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.origin ?? '—'}</TableCell>
                      <TableCell className="capitalize">{p.roast_level}</TableCell>
                      <TableCell className="text-right">{Number(p.current_stock).toFixed(1)}</TableCell>
                      <TableCell><StockStatusBadge status={p.stock_status} /></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}><QuickActions product={p} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityFeed />

      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => !open && setDetailProduct(null)}
      />
    </div>
  );
}
