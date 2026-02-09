import { useState } from 'react';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import { ProductDetailDialog } from '@/components/ProductDetailDialog';
import { StockStatusBadge } from '@/components/StockStatusBadge';
import { QuickActions } from '@/components/QuickActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import type { Product, StockStatusView } from '@/types/product';

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockStatusView | null>(null);
  const [detailProduct, setDetailProduct] = useState<StockStatusView | null>(null);

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (product: StockStatusView) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct.mutateAsync(deleteTarget.id);
      toast({ title: `"${deleteTarget.name}" verwijderd` });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl">Producten</h1>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" /> Product Toevoegen
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? 'Geen producten gevonden.' : 'Nog geen producten. Voeg je eerste toe!'}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Herkomst</TableHead>
                  <TableHead>Branding</TableHead>
                  <TableHead className="text-right">Voorraad (kg)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Voorraad</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetailProduct(p)}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.origin ?? '—'}</TableCell>
                    <TableCell className="capitalize">{p.roast_level}</TableCell>
                    <TableCell className="text-right">{Number(p.current_stock).toFixed(1)}</TableCell>
                    <TableCell><StockStatusBadge status={p.stock_status} /></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <QuickActions product={p} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="cursor-pointer" onClick={() => setDetailProduct(p)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.origin} · <span className="capitalize">{p.roast_level}</span></p>
                    </div>
                    <StockStatusBadge status={p.stock_status} />
                  </div>
                  <div className="flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-sm font-medium">{Number(p.current_stock).toFixed(1)} kg</span>
                    <div className="flex gap-1">
                      <QuickActions product={p} size="sm" />
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} key={editingProduct?.id ?? 'new'} />

      <ProductDetailDialog product={detailProduct} open={!!detailProduct} onOpenChange={(open) => !open && setDetailProduct(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Product verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.name}" wordt uit je voorraad verwijderd.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
