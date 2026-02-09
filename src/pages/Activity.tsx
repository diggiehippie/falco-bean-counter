import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilteredMovements } from '@/hooks/useMovements';
import { useProducts } from '@/hooks/useProducts';
import { MovementIcon } from '@/components/MovementIcon';
import { timeAgo } from '@/lib/timeago';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MovementType, MovementSource } from '@/types/product';

const TYPE_LABELS: Record<MovementType, string> = { in: 'Inkomend', out: 'Uitgaand', adjustment: 'Correctie' };
const SOURCE_LABELS: Record<string, string> = {
  supplier: 'Leverancier', woocommerce: 'Webshop', manual: 'Handmatig',
  damaged: 'Beschadigd', sample: 'Monster', other: 'Overig',
};

const PAGE_SIZE = 20;

export default function Activity() {
  const [searchParams] = useSearchParams();
  const preselectedProduct = searchParams.get('product');

  const [productFilter, setProductFilter] = useState<string>(preselectedProduct ?? '');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  const { data: products } = useProducts();
  const { data, isLoading } = useFilteredMovements({
    productIds: productFilter ? [productFilter] : undefined,
    movementType: (typeFilter || null) as MovementType | null,
    source: (sourceFilter || null) as MovementSource | null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    page,
    pageSize: PAGE_SIZE,
  });

  const movements = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Voorraadmutaties</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Product</Label>
              <Select value={productFilter} onValueChange={(v) => { setProductFilter(v === 'all' ? '' : v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Alles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alles</SelectItem>
                  {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Alles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alles</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bron</Label>
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v === 'all' ? '' : v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Alles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alles</SelectItem>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Van</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tot</Label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !movements.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Geen mutaties gevonden.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Hoeveelheid</TableHead>
                  <TableHead>Bron/Reden</TableHead>
                  <TableHead>Notities</TableHead>
                  <TableHead>Gebruiker</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><MovementIcon type={m.movement_type} /></TableCell>
                    <TableCell className="font-medium">{m.products?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <span className={m.movement_type === 'in' ? 'text-success' : 'text-destructive'}>
                        {m.movement_type === 'in' ? '+' : '-'}{Number(m.quantity).toFixed(1)} kg
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.reason ? SOURCE_LABELS[m.reason] ?? m.reason : SOURCE_LABELS[m.source] ?? m.source}
                    </TableCell>
                    <TableCell>
                      {m.notes ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate max-w-[150px] block cursor-default">{m.notes}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{m.notes}</TooltipContent>
                        </Tooltip>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{m.user_email ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(m.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{totalCount} mutaties totaal</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
