import { useState } from 'react';
import { useSuppliers, useDeleteSupplier } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
import { SupplierFormDialog } from '@/components/SupplierFormDialog';
import { SupplierDetailDialog } from '@/components/SupplierDetailDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Mail, Phone, User, Clock, Package } from 'lucide-react';
import type { Supplier } from '@/types/product';

export default function Suppliers() {
  const { data: suppliers, isLoading } = useSuppliers();
  const { data: products } = useProducts();
  const deleteSupplier = useDeleteSupplier();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const getProductCount = (supplierId: string) =>
    products?.filter((p) => p.supplier_id === supplierId).length ?? 0;

  const handleEdit = (e: React.MouseEvent, supplier: Supplier) => {
    e.stopPropagation();
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSupplier.mutateAsync(deleteTarget.id);
      toast({ title: `"${deleteTarget.name}" verwijderd` });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl">Leveranciers</h1>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" /> Leverancier Toevoegen</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : !suppliers?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Geen leveranciers gevonden. Voeg je eerste leverancier toe!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailSupplier(s)}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading text-lg">{s.name}</h3>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={(e) => handleEdit(e, s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <a href={`mailto:${s.email}`} className="hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {s.email}
                      </a>
                    </div>
                  )}
                  {s.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{s.phone}</div>}
                  {s.contact_person && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" />{s.contact_person}</div>}
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{s.average_delivery_days} dagen levering</div>
                  <div className="flex items-center gap-2"><Package className="h-3.5 w-3.5" />{getProductCount(s.id)} producten</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editingSupplier} key={editingSupplier?.id ?? 'new'} />
      <SupplierDetailDialog supplier={detailSupplier} open={!!detailSupplier} onOpenChange={(o) => !o && setDetailSupplier(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leverancier verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.name}" wordt gedeactiveerd.</AlertDialogDescription>
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
