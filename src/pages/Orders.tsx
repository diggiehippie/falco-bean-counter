import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { OrderDialog } from '@/components/OrderDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Plus, PackageCheck, Send, XCircle } from 'lucide-react';
import type { OrderWithDetails, Supplier } from '@/types/product';

export default function Orders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: suppliers } = useSuppliers();
  const [supplierFilter, setSupplierFilter] = useState('');
  const { data: orders, isLoading } = useOrders(supplierFilter || undefined);
  const updateStatus = useUpdateOrderStatus();

  const [orderDialogSupplier, setOrderDialogSupplier] = useState<Supplier | null>(null);
  const [deliverTarget, setDeliverTarget] = useState<OrderWithDetails | null>(null);

  const handleMarkSent = async (order: OrderWithDetails) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'sent' });
      toast({ title: 'Bestelling gemarkeerd als verzonden' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
  };

  const handleMarkDelivered = async () => {
    if (!deliverTarget) return;
    try {
      const { error } = await supabase.rpc('deliver_order', {
        p_order_id: deliverTarget.id,
        p_user_email: user?.email ?? null,
      });
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast({ title: 'Levering geregistreerd en voorraad bijgewerkt!' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
    setDeliverTarget(null);
  };

  const handleCancel = async (order: OrderWithDetails) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'cancelled' });
      toast({ title: 'Bestelling geannuleerd' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl">Bestellingen</h1>
        {suppliers?.length ? (
          <Select onValueChange={(v) => {
            const s = suppliers.find((s) => s.id === v);
            if (s) setOrderDialogSupplier(s);
          }}>
            <SelectTrigger className="w-auto">
              <div className="flex items-center gap-2"><Plus className="h-4 w-4" /> Nieuwe Bestelling</div>
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="max-w-xs">
        <Label className="text-xs">Filter op leverancier</Label>
        <Select value={supplierFilter} onValueChange={(v) => setSupplierFilter(v === 'all' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Alle leveranciers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle leveranciers</SelectItem>
            {suppliers?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !orders?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Nog geen bestellingen geplaatst.</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leverancier</TableHead>
                <TableHead>Producten</TableHead>
                <TableHead className="text-right">Bedrag</TableHead>
                <TableHead>Verwacht</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.suppliers?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.supplier_order_items?.map((i) => i.products?.name).filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {o.total_amount ? `€${Number(o.total_amount).toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.expected_delivery_date
                      ? format(new Date(o.expected_delivery_date), 'd MMM yyyy', { locale: nl })
                      : '—'}
                  </TableCell>
                  <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {o.status === 'draft' && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkSent(o)} title="Markeer als Verzonden">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {(o.status === 'draft' || o.status === 'sent') && (
                        <Button variant="ghost" size="sm" onClick={() => setDeliverTarget(o)} title="Markeer als Geleverd">
                          <PackageCheck className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(o)} title="Annuleren">
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {orderDialogSupplier && (
        <OrderDialog
          open={!!orderDialogSupplier}
          onOpenChange={(o) => !o && setOrderDialogSupplier(null)}
          supplier={orderDialogSupplier}
        />
      )}

      <AlertDialog open={!!deliverTarget} onOpenChange={() => setDeliverTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Levering registreren?</AlertDialogTitle>
            <AlertDialogDescription>
              De voorraad wordt automatisch bijgewerkt voor alle producten in deze bestelling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkDelivered}>Levering Registreren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
