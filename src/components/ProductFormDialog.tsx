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
import { useCreateProduct, useUpdateProduct, usePackagingSizes } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { Product } from '@/types/product';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Naam is verplicht').max(200),
  description: z.string().max(1000).optional(),
  origin: z.string().max(100).optional(),
  roast_level: z.enum(['light', 'medium', 'dark']),
  flavor_notes: z.string().max(500).optional(),
  current_stock: z.coerce.number().min(0, 'Moet >= 0 zijn'),
  minimum_stock: z.coerce.number().min(0),
  critical_stock: z.coerce.number().min(0),
  cost_price: z.coerce.number().min(0).optional().or(z.literal('')),
  selling_price: z.coerce.number().min(0).optional().or(z.literal('')),
  supplier_id: z.string().optional(),
  packaging_size_id: z.string().optional(),
  package_count: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof productSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: suppliers } = useSuppliers();
  const { data: packagingSizes } = usePackagingSizes();
  const isEditing = !!product;

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description ?? '',
          origin: product.origin ?? '',
          roast_level: product.roast_level,
          flavor_notes: product.flavor_notes ?? '',
          current_stock: product.current_stock,
          minimum_stock: product.minimum_stock,
          critical_stock: product.critical_stock,
          cost_price: product.cost_price ?? '',
          selling_price: product.selling_price ?? '',
          supplier_id: product.supplier_id ?? '',
          packaging_size_id: product.packaging_size_id ?? '',
          package_count: product.package_count ?? 0,
        }
      : {
          roast_level: 'medium',
          current_stock: 0,
          minimum_stock: 10,
          critical_stock: 5,
          supplier_id: '',
          packaging_size_id: '',
          package_count: 0,
        },
  });

  const selectedPackagingId = watch('packaging_size_id');
  const selectedPackaging = packagingSizes?.find((p) => p.id === selectedPackagingId);
  const packageCount = watch('package_count') ?? 0;

  // Auto-calculate current_stock in grams from packaging
  const calculatedWeight = selectedPackaging
    ? (packageCount * selectedPackaging.weight_grams) / 1000
    : null;

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      cost_price: values.cost_price === '' ? null : Number(values.cost_price),
      selling_price: values.selling_price === '' ? null : Number(values.selling_price),
      description: values.description || null,
      origin: values.origin || null,
      flavor_notes: values.flavor_notes || null,
      supplier_id: values.supplier_id || null,
      packaging_size_id: values.packaging_size_id || null,
      package_count: values.package_count ?? 0,
      // If packaging is selected, override current_stock with calculated weight
      current_stock: calculatedWeight !== null ? calculatedWeight : values.current_stock,
    };

    try {
      if (isEditing) {
        await updateProduct.mutateAsync({ id: product.id, ...payload });
        toast({ title: 'Product bijgewerkt' });
      } else {
        await createProduct.mutateAsync(payload as any);
        toast({ title: 'Product toegevoegd' });
      }
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Product Bewerken' : 'Product Toevoegen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Naam *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea id="description" {...register('description')} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="origin">Herkomst</Label>
              <Input id="origin" {...register('origin')} />
            </div>
            <div className="space-y-1">
              <Label>Branding *</Label>
              <Select value={watch('roast_level')} onValueChange={(v) => setValue('roast_level', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Leverancier</Label>
            <Select value={watch('supplier_id') ?? ''} onValueChange={(v) => setValue('supplier_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecteer leverancier..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen leverancier</SelectItem>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="flavor_notes">Smaaknotities</Label>
            <Input id="flavor_notes" {...register('flavor_notes')} />
          </div>

          {/* Packaging section */}
          <div className="border rounded-lg p-3 space-y-3">
            <Label className="text-sm font-semibold">Verpakking & Voorraad</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Verpakkingsgrootte</Label>
                <Select value={watch('packaging_size_id') ?? ''} onValueChange={(v) => setValue('packaging_size_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecteer..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen (handmatig)</SelectItem>
                    {packagingSizes?.map((ps) => (
                      <SelectItem key={ps.id} value={ps.id}>{ps.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="package_count">Aantal verpakkingen</Label>
                <Input id="package_count" type="number" min="0" {...register('package_count')} disabled={!selectedPackagingId} />
              </div>
            </div>
            {calculatedWeight !== null && (
              <p className="text-sm text-muted-foreground">
                = <strong>{calculatedWeight.toFixed(2)} kg</strong> totaal ({packageCount} × {selectedPackaging?.label})
              </p>
            )}
            {!selectedPackagingId && (
              <div className="space-y-1">
                <Label htmlFor="current_stock">Voorraad (kg) *</Label>
                <Input id="current_stock" type="number" step="0.01" {...register('current_stock')} />
                {errors.current_stock && <p className="text-sm text-destructive">{errors.current_stock.message}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="minimum_stock">Min. Voorraad (kg) *</Label>
              <Input id="minimum_stock" type="number" step="0.01" {...register('minimum_stock')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="critical_stock">Kritiek (kg) *</Label>
              <Input id="critical_stock" type="number" step="0.01" {...register('critical_stock')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cost_price">Inkoopprijs (€)</Label>
              <Input id="cost_price" type="number" step="0.01" {...register('cost_price')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="selling_price">Verkoopprijs (€)</Label>
              <Input id="selling_price" type="number" step="0.01" {...register('selling_price')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
              {isEditing ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
