import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Minus, Settings2 } from 'lucide-react';
import { MovementDialog } from '@/components/MovementDialog';
import type { StockStatusView, MovementType } from '@/types/product';

interface Props {
  product: StockStatusView;
  size?: 'sm' | 'icon';
}

export function QuickActions({ product, size = 'icon' }: Props) {
  const [dialogType, setDialogType] = useState<MovementType | null>(null);

  const actions = [
    { type: 'in' as const, icon: Plus, tooltip: 'Voorraad Toevoegen', className: 'text-success hover:text-success' },
    { type: 'out' as const, icon: Minus, tooltip: 'Verkoop Registreren', className: 'text-destructive hover:text-destructive' },
    { type: 'adjustment' as const, icon: Settings2, tooltip: 'Correctie', className: 'text-muted-foreground' },
  ];

  return (
    <>
      <div className="flex gap-0.5">
        {actions.map((action) => (
          <Tooltip key={action.type}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={size}
                className={action.className}
                onClick={(e) => { e.stopPropagation(); setDialogType(action.type); }}
              >
                <action.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.tooltip}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {dialogType && (
        <MovementDialog
          open={!!dialogType}
          onOpenChange={(open) => !open && setDialogType(null)}
          movementType={dialogType}
          preselectedProduct={product}
        />
      )}
    </>
  );
}
