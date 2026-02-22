import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { useCreateOrder } from '@/hooks/useOrders';
import { StockStatusBadge } from '@/components/StockStatusBadge';
import { Copy, ExternalLink } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Supplier, StockStatusView } from '@/types/product';

interface OrderLineItem {
  product: StockStatusView;
  selected: boolean;
  quantity: number;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

export function OrderDialog({ open, onOpenChange, supplier }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: allProducts } = useProducts();
  const createOrder = useCreateOrder();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [notes, setNotes] = useState('');

  const supplierProducts = useMemo(
    () => allProducts?.filter((p) => p.supplier_id === supplier?.id) ?? [],
    [allProducts, supplier?.id]
  );

  const [lines, setLines] = useState<OrderLineItem[]>([]);

  const buildLines = (products: StockStatusView[]) =>
    products.map((p) => {
      const suggested = Math.max(0, p.minimum_stock - Number(p.current_stock));
      return {
        product: p,
        selected: p.stock_status !== 'ok',
        quantity: suggested > 0 ? suggested : 1,
        unitPrice: Number(p.cost_price) || 0,
      };
    });

  // Populate lines when dialog opens or supplier products become available
  useEffect(() => {
    if (open && supplier && supplierProducts.length > 0 && lines.length === 0) {
      setStep(1);
      setNotes('');
      setLines(buildLines(supplierProducts));
    }
  }, [open, supplier, supplierProducts]);

  const handleOpenChange = (o: boolean) => {
    if (o && supplier) {
      setStep(1);
      setNotes('');
      setLines(buildLines(supplierProducts));
    }
    onOpenChange(o);
  };

  const selectedLines = lines.filter((l) => l.selected);
  const totalAmount = selectedLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const expectedDate = supplier ? addDays(new Date(), supplier.average_delivery_days) : new Date();

  const generateEmailBody = () => {
    if (!supplier) return '';
    const itemsList = selectedLines
      .map((l) => `- ${l.product.name}: ${l.quantity} kg${l.unitPrice ? ` @ €${l.unitPrice.toFixed(2)}/kg` : ''}`)
      .join('\n');
    return `Beste ${supplier.contact_person || supplier.name},

Graag wil ik de volgende bestelling plaatsen:

${itemsList}
${totalAmount > 0 ? `\nTotaalbedrag: €${totalAmount.toFixed(2)}` : ''}
Verwachte leverdatum: ${format(expectedDate, 'd MMMM yyyy', { locale: nl })}
${notes ? `\nOpmerkingen: ${notes}` : ''}

Met vriendelijke groet,
Falco Caffè`;
  };

  const handleSaveOrder = async () => {
    if (!supplier || selectedLines.length === 0) return;

    try {
      await createOrder.mutateAsync({
        supplier_id: supplier.id,
        expected_delivery_date: format(expectedDate, 'yyyy-MM-dd'),
        total_amount: totalAmount > 0 ? totalAmount : undefined,
        notes: notes || undefined,
        email_body: generateEmailBody(),
        created_by: user?.email ?? undefined,
        items: selectedLines.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: l.unitPrice || undefined,
          total_price: l.quantity * l.unitPrice || undefined,
        })),
      });

      toast({ title: 'Bestelling opgeslagen!' });
      setStep(3);
    } catch (err: any) {
      toast({ title: 'Er ging iets mis', description: err.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateEmailBody());
    toast({ title: 'Email gekopieerd naar klembord!' });
  };

  const openMailto = () => {
    if (!supplier?.email) return;
    const subject = encodeURIComponent(`Bestelling Falco Caffè - ${format(new Date(), 'd MMMM yyyy', { locale: nl })}`);
    const body = encodeURIComponent(generateEmailBody());
    window.open(`mailto:${supplier.email}?subject=${subject}&body=${body}`);
  };

  const updateLine = (idx: number, updates: Partial<OrderLineItem>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...updates } : l)));
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Producten Selecteren'}
            {step === 2 && 'Bestel Overzicht'}
            {step === 3 && 'Email Genereren'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecteer producten om te bestellen bij {supplier.name}</p>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Geen producten gekoppeld aan deze leverancier.</p>
            ) : (
              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={line.product.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Checkbox
                      checked={line.selected}
                      onCheckedChange={(checked) => updateLine(idx, { selected: !!checked })}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{line.product.name}</span>
                        <StockStatusBadge status={line.product.stock_status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Voorraad: {Number(line.product.current_stock).toFixed(1)} kg · Min: {line.product.minimum_stock} kg
                      </p>
                      {line.selected && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Hoeveelheid (kg)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={line.quantity}
                              onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Eenheidsprijs (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
              <Button onClick={() => setStep(2)} disabled={selectedLines.length === 0}>
                Verder ({selectedLines.length} producten)
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              {selectedLines.map((l) => (
                <div key={l.product.id} className="flex justify-between text-sm py-1.5">
                  <span>{l.product.name}</span>
                  <span className="text-muted-foreground">
                    {l.quantity} kg {l.unitPrice > 0 && `· €${(l.quantity * l.unitPrice).toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
            {totalAmount > 0 && (
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Totaalbedrag</span>
                <span>€{totalAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Verwachte leverdatum: </span>
              <span className="font-medium">{format(expectedDate, 'd MMMM yyyy', { locale: nl })}</span>
            </div>
            <div className="space-y-1">
              <Label htmlFor="order-notes">Notities</Label>
              <Textarea id="order-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Speciale instructies..." />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Terug</Button>
              <Button onClick={handleSaveOrder} disabled={createOrder.isPending}>
                {createOrder.isPending ? 'Bezig...' : 'Bestelling Opslaan'}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <pre className="text-sm whitespace-pre-wrap font-body">{generateEmailBody()}</pre>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" /> Kopieer naar Klembord
              </Button>
              {supplier.email && (
                <Button className="flex-1" onClick={openMailto}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Open in Email
                </Button>
              )}
            </div>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Sluiten</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
