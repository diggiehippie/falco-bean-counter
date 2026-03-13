import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers';
import type { Supplier } from '@/types/product';

const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Naam is verplicht').max(200),
  email: z.string().email('Email adres is ongeldig').max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  contact_person: z.string().max(200).optional().or(z.literal('')),
  average_delivery_days: z.coerce.number().int().min(1).default(7),
  minimum_order_value: z.coerce.number().min(0).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof supplierSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

export function SupplierFormDialog({ open, onOpenChange, supplier }: Props) {
  const { toast } = useToast();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isEditing = !!supplier;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          email: supplier.email ?? '',
          phone: supplier.phone ?? '',
          contact_person: supplier.contact_person ?? '',
          average_delivery_days: supplier.average_delivery_days,
          minimum_order_value: supplier.minimum_order_value ?? '',
          notes: supplier.notes ?? '',
        }
      : { average_delivery_days: 7 },
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      email: values.email || null,
      phone: values.phone || null,
      contact_person: values.contact_person || null,
      minimum_order_value: values.minimum_order_value === '' ? null : Number(values.minimum_order_value),
      notes: values.notes || null,
    };

    try {
      if (isEditing) {
        await updateSupplier.mutateAsync({ id: supplier.id, ...payload });
        toast({ title: 'Leverancier bijgewerkt!' });
      } else {
        await createSupplier.mutateAsync(payload);
        toast({ title: 'Leverancier succesvol toegevoegd!' });
      }
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Er ging iets mis', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Leverancier Bewerken' : 'Leverancier Toevoegen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="s-name">Naam *</Label>
            <Input id="s-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-phone">Telefoon</Label>
              <Input id="s-phone" {...register('phone')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="s-contact">Contactpersoon</Label>
            <Input id="s-contact" {...register('contact_person')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="s-days">Gemiddelde Levertijd (dagen)</Label>
              <Input id="s-days" type="number" {...register('average_delivery_days')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-mov">Min. Bestelwaarde (€)</Label>
              <Input id="s-mov" type="number" step="0.01" {...register('minimum_order_value')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="s-notes">Notities</Label>
            <Textarea id="s-notes" {...register('notes')} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
              {isEditing ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
