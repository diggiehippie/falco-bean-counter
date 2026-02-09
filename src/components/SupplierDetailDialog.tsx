import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StockStatusBadge } from '@/components/StockStatusBadge';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { timeAgo } from '@/lib/timeago';
import { Mail, Phone, User, Clock, Package } from 'lucide-react';
import type { Supplier } from '@/types/product';
import { OrderDialog } from '@/components/OrderDialog';

interface Props {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierDetailDialog({ supplier, open, onOpenChange }: Props) {
  const { data: allProducts } = useProducts();
  const { data: orders } = useOrders(supplier?.id);
  const [orderOpen, setOrderOpen] = useState(false);

  if (!supplier) return null;

  const supplierProducts = allProducts?.filter((p) => p.supplier_id === supplier.id) ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{supplier.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">{supplier.email}</a>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              {supplier.contact_person && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.contact_person}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.average_delivery_days} dagen levering</span>
              </div>
            </div>

            {supplier.notes && <p className="text-sm text-muted-foreground">{supplier.notes}</p>}

            {/* Products section */}
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Package className="h-4 w-4" /> Producten ({supplierProducts.length})
              </h4>
              {supplierProducts.length ? (
                <div className="space-y-1">
                  {supplierProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                      <span className="font-medium">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{Number(p.current_stock).toFixed(1)} kg</span>
                        <StockStatusBadge status={p.stock_status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Geen producten gekoppeld.</p>
              )}
            </div>

            {/* Recent orders */}
            {orders && orders.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Recente Bestellingen</h4>
                <div className="space-y-1">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-sm py-1.5">
                      <span className="text-muted-foreground">{timeAgo(o.created_at)}</span>
                      <div className="flex items-center gap-2">
                        {o.total_amount && <span>€{Number(o.total_amount).toFixed(2)}</span>}
                        <OrderStatusBadge status={o.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => { onOpenChange(false); setOrderOpen(true); }}>
              Bestellen bij Leverancier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        supplier={supplier}
      />
    </>
  );
}
