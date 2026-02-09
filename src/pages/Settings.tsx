import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAlertSettings, useUpdateAlertSetting, useCreateAlertLog } from '@/hooks/useAlerts';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, Mail, User, Shield, X, Plus, AlertTriangle } from 'lucide-react';
import type { AlertSetting } from '@/types/product';

const ALERT_CONFIG: Record<string, { label: string; description: string; icon: typeof Bell }> = {
  low_stock: { label: 'Lage Voorraad', description: 'Melding wanneer producten onder minimum drempel komen', icon: AlertTriangle },
  critical_stock: { label: 'Kritieke Voorraad', description: 'Urgente melding voor kritiek lage voorraad', icon: Bell },
  daily_summary: { label: 'Dagelijkse Samenvatting', description: 'Dagelijkse email met voorraad overzicht', icon: Mail },
};

function AlertSettingCard({ setting, onUpdate }: { setting: AlertSetting; onUpdate: (id: string, updates: Partial<AlertSetting>) => void }) {
  const config = ALERT_CONFIG[setting.alert_type];
  const [newEmail, setNewEmail] = useState('');

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (setting.email_recipients?.includes(email)) return;
    onUpdate(setting.id, { email_recipients: [...(setting.email_recipients ?? []), email] });
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    onUpdate(setting.id, { email_recipients: (setting.email_recipients ?? []).filter((e) => e !== email) });
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <config.icon className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <Switch
            checked={setting.is_enabled}
            onCheckedChange={(checked) => onUpdate(setting.id, { is_enabled: checked })}
          />
        </div>

        {setting.is_enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Ontvangers ({setting.email_recipients?.length ?? 0})</Label>
              <div className="flex flex-wrap gap-1.5">
                {setting.email_recipients?.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="email@voorbeeld.nl"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={addEmail}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            {setting.alert_type === 'daily_summary' && (
              <div className="space-y-1">
                <Label className="text-xs">Verzendtijd</Label>
                <Input
                  type="time"
                  value={setting.notification_time?.slice(0, 5) ?? '09:00'}
                  onChange={(e) => onUpdate(setting.id, { notification_time: e.target.value + ':00' })}
                  className="w-32"
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { data: settings, isLoading } = useAlertSettings();
  const { data: products } = useProducts();
  const updateSetting = useUpdateAlertSetting();
  const createLog = useCreateAlertLog();

  const handleUpdate = async (id: string, updates: Partial<AlertSetting>) => {
    try {
      await updateSetting.mutateAsync({ id, ...updates } as any);
      toast({ title: 'Instellingen succesvol opgeslagen!' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
  };

  const handleCheckAlerts = async () => {
    const lowProducts = products?.filter((p) => p.stock_status === 'low') ?? [];
    const criticalProducts = products?.filter((p) => p.stock_status === 'critical') ?? [];

    const alerts: string[] = [];

    for (const p of criticalProducts) {
      const msg = `Kritieke voorraad: ${p.name} (${Number(p.current_stock).toFixed(1)} kg) - onmiddellijk bestellen!`;
      alerts.push(msg);
      const critSetting = settings?.find((s) => s.alert_type === 'critical_stock');
      if (critSetting?.is_enabled) {
        await createLog.mutateAsync({
          alert_type: 'critical_stock',
          product_id: p.id,
          message: msg,
          sent_to: critSetting.email_recipients ?? [],
        });
      }
    }

    for (const p of lowProducts) {
      const msg = `Lage voorraad: ${p.name} (${Number(p.current_stock).toFixed(1)} kg)`;
      alerts.push(msg);
      const lowSetting = settings?.find((s) => s.alert_type === 'low_stock');
      if (lowSetting?.is_enabled) {
        await createLog.mutateAsync({
          alert_type: 'low_stock',
          product_id: p.id,
          message: msg,
          sent_to: lowSetting.email_recipients ?? [],
        });
      }
    }

    if (alerts.length > 0) {
      await navigator.clipboard.writeText(alerts.join('\n'));
      toast({ title: `${alerts.length} meldingen gevonden`, description: 'Samenvatting gekopieerd naar klembord' });
    } else {
      toast({ title: 'Geen actieve meldingen', description: 'Alle producten hebben voldoende voorraad' });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email verzonden', description: 'Controleer uw email voor de wachtwoord reset link' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl">Instellingen</h1>

      {/* Alert Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading">Email Notificaties</h2>
          <Button variant="outline" size="sm" onClick={handleCheckAlerts} disabled={createLog.isPending}>
            <Bell className="h-4 w-4 mr-2" /> Controleer op Meldingen
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : (
          settings?.map((s) => <AlertSettingCard key={s.id} setting={s} onUpdate={handleUpdate} />)
        )}
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Gebruikersprofiel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Ingelogd</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePasswordReset}>
              <Shield className="h-4 w-4 mr-2" /> Wachtwoord Wijzigen
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>Uitloggen</Button>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Systeem Informatie</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1 text-muted-foreground">
          <p>App versie: 1.0.0</p>
          <p>Producten: {products?.length ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  );
}
