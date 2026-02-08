import { useState } from 'react';
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
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import type { Product } from '@/types/product';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  origin: z.string().max(100).optional(),
  roast_level: z.enum(['light', 'medium', 'dark']),
  flavor_notes: z.string().max(500).optional(),
  current_stock: z.coerce.number().min(0, 'Must be >= 0'),
  minimum_stock: z.coerce.number().min(0),
  critical_stock: z.coerce.number().min(0),
  cost_price: z.coerce.number().min(0).optional().or(z.literal('')),
  selling_price: z.coerce.number().min(0).optional().or(z.literal('')),
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
        }
      : {
          roast_level: 'medium',
          current_stock: 0,
          minimum_stock: 10,
          critical_stock: 5,
        },
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      cost_price: values.cost_price === '' ? null : Number(values.cost_price),
      selling_price: values.selling_price === '' ? null : Number(values.selling_price),
      description: values.description || null,
      origin: values.origin || null,
      flavor_notes: values.flavor_notes || null,
    };

    try {
      if (isEditing) {
        await updateProduct.mutateAsync({ id: product.id, ...payload });
        toast({ title: 'Product updated' });
      } else {
        await createProduct.mutateAsync(payload as any);
        toast({ title: 'Product created' });
      }
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="origin">Origin</Label>
              <Input id="origin" {...register('origin')} />
            </div>
            <div className="space-y-1">
              <Label>Roast Level *</Label>
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
            <Label htmlFor="flavor_notes">Flavor Notes</Label>
            <Input id="flavor_notes" {...register('flavor_notes')} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="current_stock">Stock (kg) *</Label>
              <Input id="current_stock" type="number" step="0.01" {...register('current_stock')} />
              {errors.current_stock && <p className="text-sm text-destructive">{errors.current_stock.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="minimum_stock">Min Stock *</Label>
              <Input id="minimum_stock" type="number" step="0.01" {...register('minimum_stock')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="critical_stock">Critical *</Label>
              <Input id="critical_stock" type="number" step="0.01" {...register('critical_stock')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cost_price">Cost Price (€)</Label>
              <Input id="cost_price" type="number" step="0.01" {...register('cost_price')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="selling_price">Selling Price (€)</Label>
              <Input id="selling_price" type="number" step="0.01" {...register('selling_price')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
              {isEditing ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
