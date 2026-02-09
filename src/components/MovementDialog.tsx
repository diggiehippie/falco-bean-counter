import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { useCreateMovement } from '@/hooks/useMovements';
import type { MovementType, StockStatusView } from '@/types/product';

const ADJUSTMENT_REASONS = [
  { value: 'damaged', label: 'Beschadigd' },
  { value: 'sample', label: 'Monster' },
  { value: 'loss', label: 'Verlies' },
  { value: 'correction', label: 'Correctie' },
  { value: 'other', label: 'Overig' },
] as const;

const SOURCE_MAP: Record<MovementType, string> = {
  in: 'supplier',
  out: 'manual',
  adjustment: 'damaged',
};

const TITLE_MAP: Record<MovementType, string> = {
  in: 'Voorraad Toevoegen',
  out: 'Verkoop Registreren',
  adjustment: 'Correctie',
};

const SUBMIT_MAP: Record<MovementType, string> = {
  in: 'Voorraad Toevoegen',
  out: 'Verkoop Registreren',
  adjustment: 'Correctie Opslaan',
};

const movementSchema = z.object({
  product_id: z.string().min(1, 'Product selecteren is verplicht'),
  quantity: z.coerce.number().gt(0, 'Hoeveelheid moet groter dan 0 zijn'),
  reason: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof movementSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementType: MovementType;
  preselectedProduct?: StockStatusView | null;
}

export function MovementDialog({ open, onOpenChange, movementType, preselectedProduct }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: products } = useProducts();
  const createMovement = useCreateMovement();

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: preselectedProduct?.id ?? '',
      quantity: undefined,
      reason: movementType === 'adjustment' ? 'damaged' : undefined,
      notes: '',
    },
  });

  const selectedProductId = watch('product_id');
  const selectedProduct = products?.find((p) => p.id === selectedProductId);
  const reason = watch('reason');

  const onSubmit = async (values: FormValues) => {
    const source = movementType === 'adjustment'
      ? (values.reason === 'other' || values.reason === 'loss' || values.reason === 'correction' ? 'other' : values.reason as any)
      : SOURCE_MAP[movementType];

    try {
      await createMovement.mutateAsync({
        product_id: values.product_id,
        movement_type: movementType,
        source,
        quantity: values.quantity,
        reason: values.reason || undefined,
        notes: values.notes || undefined,
        user_email: user?.email ?? undefined,
      });

      const product = products?.find((p) => p.id === values.product_id);
      const newStock = movementType === 'in'
        ? (product?.current_stock ?? 0) + values.quantity
        : (product?.current_stock ?? 0) - values.quantity;

      const successMessages: Record<MovementType, string> = {
        in: 'Voorraad succesvol toegevoegd!',
        out: 'Verkoop geregistreerd!',
        adjustment: 'Correctie opgeslagen!',
      };

      toast({
        title: successMessages[movementType],
        description: `${product?.name} nu op ${newStock.toFixed(1)} kg`,
      });

      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Er ging iets mis', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLE_MAP[movementType]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Product *</Label>
            {preselectedProduct ? (
              <Input value={preselectedProduct.name} disabled />
            ) : (
              <Select value={selectedProductId} onValueChange={(v) => setValue('product_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecteer product..." /></SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.product_id && <p className="text-sm text-destructive">{errors.product_id.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="quantity">Hoeveelheid (kg) *</Label>
            <Input id="quantity" type="number" step="0.01" min="0.01" {...register('quantity')} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            {movementType === 'out' && selectedProduct && (
              <p className="text-xs text-muted-foreground">Huidige voorraad: {Number(selectedProduct.current_stock).toFixed(1)} kg</p>
            )}
          </div>

          {movementType === 'adjustment' && (
            <div className="space-y-1">
              <Label>Reden *</Label>
              <Select value={reason ?? 'damaged'} onValueChange={(v) => setValue('reason', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="notes">Notities {reason === 'other' ? '*' : ''}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={2}
              placeholder={movementType === 'out' ? 'bijv. Telefonische bestelling - Klant Jan' : ''}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={createMovement.isPending}>
              {createMovement.isPending ? 'Bezig...' : SUBMIT_MAP[movementType]}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
