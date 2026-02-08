import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StockStatusBadge } from '@/components/StockStatusBadge';
import { Package, AlertTriangle, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Dashboard() {
  const { data: products, isLoading } = useProducts();

  const total = products?.length ?? 0;
  const lowCount = products?.filter((p) => p.stock_status === 'low').length ?? 0;
  const criticalCount = products?.filter((p) => p.stock_status === 'critical').length ?? 0;

  const cards = [
    { title: 'Total Products', value: total, icon: Package, color: 'text-primary' },
    { title: 'Low Stock', value: lowCount, icon: AlertTriangle, color: 'text-warning' },
    { title: 'Critical Stock', value: criticalCount, icon: AlertCircle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-heading">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Products Overview</CardTitle>
          <Link to="/products" className="text-sm text-primary hover:underline font-medium">
            View All →
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !products?.length ? (
            <p className="text-muted-foreground text-center py-8">No products yet. Add your first product!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Roast</TableHead>
                    <TableHead className="text-right">Stock (kg)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 10).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.origin ?? '—'}</TableCell>
                      <TableCell className="capitalize">{p.roast_level}</TableCell>
                      <TableCell className="text-right">{Number(p.current_stock).toFixed(1)}</TableCell>
                      <TableCell><StockStatusBadge status={p.stock_status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
