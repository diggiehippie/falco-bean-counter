import { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useRecentMovements } from '@/hooks/useMovements';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/csv';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, Package, ShoppingCart, Truck } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { MovementWithProduct } from '@/types/product';

function useSalesData(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['sales-report', dateFrom, dateTo],
    queryFn: async (): Promise<MovementWithProduct[]> => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, products (name, unit)')
        .eq('movement_type', 'out')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MovementWithProduct[];
    },
  });
}

function useStockInData(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['stock-in-report', dateFrom, dateTo],
    queryFn: async (): Promise<MovementWithProduct[]> => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, products (name, unit)')
        .eq('movement_type', 'in')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59');
      if (error) throw error;
      return (data ?? []) as unknown as MovementWithProduct[];
    },
  });
}

export default function Reports() {
  const { toast } = useToast();
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: sales, isLoading: salesLoading } = useSalesData(dateFrom, dateTo);
  const { data: stockIn } = useStockInData(dateFrom, dateTo);
  const { data: orders } = useOrders();

  // Sales aggregation
  const salesByProduct = useMemo(() => {
    if (!sales) return [];
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    sales.forEach((s) => {
      const name = s.products?.name ?? 'Onbekend';
      const existing = map.get(name) || { name, quantity: 0, revenue: 0 };
      const qty = Number(s.quantity);
      const product = products?.find((p) => p.id === s.product_id);
      existing.quantity += qty;
      existing.revenue += qty * (Number(product?.selling_price) || 0);
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [sales, products]);

  const totalSalesQty = salesByProduct.reduce((s, p) => s + p.quantity, 0);
  const totalRevenue = salesByProduct.reduce((s, p) => s + p.revenue, 0);
  const totalStockIn = stockIn?.reduce((s, m) => s + Number(m.quantity), 0) ?? 0;

  // Inventory stats
  const totalValue = products?.reduce((sum, p) => sum + (Number(p.current_stock) * (Number(p.cost_price) || 0)), 0) ?? 0;
  const needRestock = products?.filter((p) => p.stock_status === 'low' || p.stock_status === 'critical').length ?? 0;

  // Order stats in period
  const periodOrders = orders?.filter((o) => o.created_at >= dateFrom && o.created_at <= dateTo + 'T23:59:59') ?? [];
  const deliveredOrders = periodOrders.filter((o) => o.status === 'delivered');
  const totalSpent = periodOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  const chartData = salesByProduct.slice(0, 8).map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
    kg: Number(p.quantity.toFixed(1)),
  }));

  const handleExportSales = () => {
    if (!salesByProduct.length) return;
    exportToCSV(
      salesByProduct.map((p) => ({
        Product: p.name,
        'Hoeveelheid (kg)': p.quantity.toFixed(1),
        'Omzet (€)': p.revenue.toFixed(2),
      })),
      `verkoop-rapport-${dateFrom}-${dateTo}`
    );
    toast({ title: 'Rapport geëxporteerd!' });
  };

  const handleExportInventory = () => {
    if (!products?.length) return;
    exportToCSV(
      products.map((p) => ({
        Product: p.name,
        Herkomst: p.origin ?? '',
        'Voorraad (kg)': Number(p.current_stock).toFixed(1),
        Status: p.stock_status,
        'Inkoopprijs (€)': Number(p.cost_price ?? 0).toFixed(2),
        'Waarde (€)': (Number(p.current_stock) * (Number(p.cost_price) || 0)).toFixed(2),
      })),
      `voorraad-rapport-${format(now, 'yyyy-MM-dd')}`
    );
    toast({ title: 'Rapport geëxporteerd!' });
  };

  const isLoading = productsLoading || salesLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl">Rapporten</h1>
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Van</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tot</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
        </div>
      </div>

      {/* Sales Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Verkoop Rapport</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportSales} disabled={!salesByProduct.length}>
            <Download className="h-4 w-4 mr-2" /> Exporteer CSV
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading">{totalSalesQty.toFixed(1)} kg</p>
                  <p className="text-xs text-muted-foreground">Totaal Verkocht</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading">€{totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Totale Omzet</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading">{sales?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Transacties</p>
                </CardContent></Card>
              </div>

              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="kg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Geen verkopen in deze periode</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5" /> Voorraad Rapport</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportInventory} disabled={!products?.length}>
            <Download className="h-4 w-4 mr-2" /> Exporteer CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-heading">{products?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Totaal Producten</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-heading">€{totalValue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Totale Voorraadwaarde</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-heading text-warning">{needRestock}</p>
              <p className="text-xs text-muted-foreground">Herbevoorrading Nodig</p>
            </CardContent></Card>
          </div>
        </CardContent>
      </Card>

      {/* Order Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5" /> Bestel Rapport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-heading">{periodOrders.length}</p>
              <p className="text-xs text-muted-foreground">Bestellingen</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-heading">{deliveredOrders.length}</p>
              <p className="text-xs text-muted-foreground">Leveringen</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-heading">{totalStockIn.toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">Toegevoegde Voorraad</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-heading">€{totalSpent.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Totaal Uitgegeven</p>
            </CardContent></Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
