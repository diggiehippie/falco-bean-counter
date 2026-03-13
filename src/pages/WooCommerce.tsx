import { useState } from 'react';
import {
  useWooCommerceSettings,
  useSaveWooCommerceSettings,
  useTestWcConnection,
  useImportProducts,
  useSyncStock,
  usePushStock,
  useMatchProducts,
  useToggleAutoSync,
  useSyncLogs,
  useSyncHealth,
  useTodaySyncStats,
  type SyncLog,
} from '@/hooks/useWooCommerce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { timeAgo } from '@/lib/timeago';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  ShoppingBag, Plug, Download, RefreshCw, Link2, CheckCircle, XCircle,
  Clock, AlertTriangle, Copy, ExternalLink, Upload, Zap,
  ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion,
} from 'lucide-react';

const SYNC_TYPE_LABELS: Record<string, string> = {
  import_products: 'Import Producten',
  import_stock: 'Import Voorraad',
  import_order: 'Import Bestelling',
  full_sync: 'Volledige Sync',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-success/10 text-success-foreground border-success/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  pending: 'bg-warning/10 text-warning-foreground border-warning/30',
};

function SyncStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_COLORS[status] ?? '', 'gap-1')}>
      {status === 'success' && <CheckCircle className="h-3 w-3" />}
      {status === 'failed' && <XCircle className="h-3 w-3" />}
      {status === 'pending' && <Clock className="h-3 w-3" />}
      {status === 'success' ? 'Succes' : status === 'failed' ? 'Mislukt' : 'Bezig'}
    </Badge>
  );
}

export default function WooCommercePage() {
  const { toast } = useToast();
  const { data: wcSettings, isLoading: settingsLoading } = useWooCommerceSettings();
  const saveSettings = useSaveWooCommerceSettings();
  const testConnection = useTestWcConnection();
  const importProducts = useImportProducts();
  const syncStock = useSyncStock();
  const pushStock = usePushStock();
  const matchProducts = useMatchProducts();
  const toggleAutoSync = useToggleAutoSync();
  const { data: syncLogs, isLoading: logsLoading } = useSyncLogs(100);
  const { data: syncHealth } = useSyncHealth();
  const { data: syncStats } = useTodaySyncStats();

  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [matchResult, setMatchResult] = useState<{ matched: any[]; unmatched: string[] } | null>(null);
  const [logFilter, setLogFilter] = useState<string>('all');

  // Update form when settings load (credentials are not fetched for security)
  const initDone = useState(false);
  if (!initDone[0] && wcSettings) {
    setStoreUrl(wcSettings.store_url);
    setConnectionStatus('success');
    initDone[1](true);
  }

  const hasStoredCredentials = !!wcSettings?.id;

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woocommerce-webhook`;

  const handleTestConnection = async () => {
    try {
      const params: { store_url: string; consumer_key?: string; consumer_secret?: string } = { store_url: storeUrl };
      if (consumerKey) params.consumer_key = consumerKey;
      if (consumerSecret) params.consumer_secret = consumerSecret;
      const result = await testConnection.mutateAsync(params);
      setConnectionStatus('success');
      toast({ title: `Verbonden met ${result.site_url}` });
    } catch (err: any) {
      setConnectionStatus('error');
      toast({ title: 'Verbinding mislukt', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!storeUrl) {
      toast({ title: 'Vul de winkel URL in', variant: 'destructive' });
      return;
    }
    if (!hasStoredCredentials && (!consumerKey || !consumerSecret)) {
      toast({ title: 'Vul alle verplichte velden in', variant: 'destructive' });
      return;
    }
    try {
      const payload: { store_url: string; consumer_key?: string; consumer_secret?: string; webhook_secret?: string } = { store_url: storeUrl };
      if (consumerKey) payload.consumer_key = consumerKey;
      if (consumerSecret) payload.consumer_secret = consumerSecret;
      if (webhookSecret) payload.webhook_secret = webhookSecret;
      await saveSettings.mutateAsync(payload);
      toast({ title: 'Instellingen opgeslagen!' });
      setConsumerKey('');
      setConsumerSecret('');
      setWebhookSecret('');
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    try {
      const result = await importProducts.mutateAsync();
      toast({
        title: `✅ Import voltooid!`,
        description: `${result.imported} producten geïmporteerd, ${result.skipped} overgeslagen.`,
      });
    } catch (err: any) {
      toast({ title: '❌ Import mislukt', description: err.message, variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncStock.mutateAsync();
      toast({
        title: `✅ ${result.synced} producten gesynchroniseerd`,
        description: result.errors > 0 ? `${result.errors} fouten opgetreden` : undefined,
      });
    } catch (err: any) {
      toast({ title: '❌ Sync mislukt', description: err.message, variant: 'destructive' });
    }
  };

  const handlePushStock = async () => {
    try {
      const result = await pushStock.mutateAsync();
      toast({
        title: `✅ ${result.pushed} producten naar WooCommerce gepusht`,
        description: result.errors > 0 ? `${result.errors} fouten, ${result.skipped} overgeslagen` : `${result.skipped} overgeslagen (al gelijk)`,
      });
    } catch (err: any) {
      toast({ title: '❌ Push mislukt', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    try {
      await toggleAutoSync.mutateAsync(enabled);
      toast({ title: enabled ? '✅ Auto-sync ingeschakeld' : 'Auto-sync uitgeschakeld' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
  };

  const handleMatch = async () => {
    try {
      const result = await matchProducts.mutateAsync();
      setMatchResult(result);
      toast({
        title: `${result.matched.length} producten gematcht`,
        description: result.unmatched.length > 0 ? `${result.unmatched.length} niet gevonden` : undefined,
      });
    } catch (err: any) {
      toast({ title: '❌ Matching mislukt', description: err.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Gekopieerd!' });
  };

  const filteredLogs = logFilter === 'all'
    ? syncLogs
    : syncLogs?.filter((l) => l.sync_type === logFilter);

  if (settingsLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-3xl">WooCommerce</h1>
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-7 w-7 text-primary" />
        <h1 className="text-3xl">WooCommerce</h1>
      </div>

      {/* Sync Health Summary */}
      {wcSettings && syncHealth && (
        <Card className={cn(
          'border-l-4',
          syncHealth.status === 'healthy' && 'border-l-success',
          syncHealth.status === 'degraded' && 'border-l-warning',
          syncHealth.status === 'error' && 'border-l-destructive',
          syncHealth.status === 'unknown' && 'border-l-muted-foreground',
        )}>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center',
                  syncHealth.status === 'healthy' && 'bg-success/10',
                  syncHealth.status === 'degraded' && 'bg-warning/10',
                  syncHealth.status === 'error' && 'bg-destructive/10',
                  syncHealth.status === 'unknown' && 'bg-muted',
                )}>
                  {syncHealth.status === 'healthy' && <ShieldCheck className="h-5 w-5 text-success" />}
                  {syncHealth.status === 'degraded' && <ShieldAlert className="h-5 w-5 text-warning" />}
                  {syncHealth.status === 'error' && <ShieldX className="h-5 w-5 text-destructive" />}
                  {syncHealth.status === 'unknown' && <ShieldQuestion className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sync Status</p>
                  <p className={cn(
                    'text-sm font-heading font-bold',
                    syncHealth.status === 'healthy' && 'text-success',
                    syncHealth.status === 'degraded' && 'text-warning',
                    syncHealth.status === 'error' && 'text-destructive',
                    syncHealth.status === 'unknown' && 'text-muted-foreground',
                  )}>
                    {syncHealth.status === 'healthy' ? 'Gezond' :
                     syncHealth.status === 'degraded' ? 'Vertraagd' :
                     syncHealth.status === 'error' ? 'Fout' : 'Onbekend'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Laatste succesvolle sync</p>
                <p className="text-sm font-medium">
                  {syncHealth.lastSuccess ? timeAgo(syncHealth.lastSuccess) : 'Nog niet'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">24u succes / mislukt</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    <span className="text-success">{syncHealth.successCount24h}</span>
                    {' / '}
                    <span className={syncHealth.failedCount24h > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                      {syncHealth.failedCount24h}
                    </span>
                  </p>
                </div>
                {(syncHealth.successCount24h + syncHealth.failedCount24h) > 0 && (
                  <Progress
                    value={Math.round(
                      (syncHealth.successCount24h / (syncHealth.successCount24h + syncHealth.failedCount24h)) * 100
                    )}
                    className="h-1.5 mt-1"
                  />
                )}
              </div>

              {syncStats && (
                <div>
                  <p className="text-xs text-muted-foreground">Vandaag verwerkt</p>
                  <p className="text-sm font-medium">
                    {syncStats.orderCount} {syncStats.orderCount === 1 ? 'bestelling' : 'bestellingen'}
                    {' · '}{syncStats.totalQty.toFixed(1)} kg
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plug className="h-5 w-5" /> WooCommerce Verbinding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="store_url">Winkel URL *</Label>
            <Input
              id="store_url"
              placeholder="https://falcocaffe.com"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Je WooCommerce webshop URL</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="consumer_key">Consumer Key {hasStoredCredentials ? '' : '*'}</Label>
            <Input
              id="consumer_key"
              type={showKeys ? 'text' : 'password'}
              placeholder={hasStoredCredentials ? 'Opgeslagen — laat leeg om te behouden' : 'ck_...'}
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
            />
            {hasStoredCredentials && !consumerKey && (
              <p className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Opgeslagen</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="consumer_secret">Consumer Secret {hasStoredCredentials ? '' : '*'}</Label>
            <Input
              id="consumer_secret"
              type={showKeys ? 'text' : 'password'}
              placeholder={hasStoredCredentials ? 'Opgeslagen — laat leeg om te behouden' : 'cs_...'}
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
            />
            {hasStoredCredentials && !consumerSecret && (
              <p className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Opgeslagen</p>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => setShowKeys(!showKeys)} className="text-xs text-primary hover:underline">
                {showKeys ? 'Verberg' : 'Toon'} keys
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <a href="https://woocommerce.com/document/woocommerce-rest-api/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                Hoe verkrijg ik API keys? <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleTestConnection} disabled={testConnection.isPending || !storeUrl || (!hasStoredCredentials && (!consumerKey || !consumerSecret))}>
              {testConnection.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
              Test Verbinding
            </Button>
            {connectionStatus === 'success' && <span className="text-sm text-success flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Verbonden</span>}
            {connectionStatus === 'error' && <span className="text-sm text-destructive flex items-center gap-1"><XCircle className="h-4 w-4" /> Mislukt</span>}
          </div>

          <Button onClick={handleSave} disabled={saveSettings.isPending || !storeUrl || (!hasStoredCredentials && (!consumerKey || !consumerSecret))}>
            {saveSettings.isPending ? 'Opslaan...' : 'Opslaan'}
          </Button>

          {wcSettings?.last_import_at && (
            <p className="text-xs text-muted-foreground">Laatste sync: {timeAgo(wcSettings.last_import_at)}</p>
          )}
        </CardContent>
      </Card>

      {/* Import Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" /> Producten Importeren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Importeer je producten vanuit WooCommerce naar dit dashboard. Dit hoef je maar één keer te doen (of wanneer je nieuwe producten toevoegt in WooCommerce).
          </p>
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
            ℹ️ Dit overschrijft GEEN bestaande producten, alleen nieuwe worden toegevoegd.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importProducts.isPending || !wcSettings}>
              {importProducts.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {importProducts.isPending ? 'Importeren...' : 'Importeer Alle Producten'}
            </Button>
            <Button variant="outline" onClick={handleMatch} disabled={matchProducts.isPending || !wcSettings}>
              {matchProducts.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Match Producten
            </Button>
          </div>

          {matchResult && (
            <div className="text-sm space-y-1 border rounded p-3">
              <p className="font-medium">Match Resultaten:</p>
              {matchResult.matched.map((m, i) => (
                <p key={i} className="text-success">✅ {m.localName} → {m.wcName} (ID: {m.wcId})</p>
              ))}
              {matchResult.unmatched.map((name, i) => (
                <p key={i} className="text-destructive">❌ {name} - niet gevonden</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Stock */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> Voorraad Synchroniseren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Handmatige Sync</p>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleSync} disabled={syncStock.isPending || !wcSettings}>
                {syncStock.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {syncStock.isPending ? 'Ophalen...' : 'Pull van WooCommerce'}
              </Button>
              <Button variant="outline" onClick={handlePushStock} disabled={pushStock.isPending || !wcSettings}>
                {pushStock.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {pushStock.isPending ? 'Pushen...' : 'Push naar WooCommerce'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pull: haalt WC voorraad op naar deze app. Push: stuurt app voorraad naar WooCommerce.
            </p>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Automatische Sync</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Synchroniseer voorraad automatisch elke 15 minuten (bidirectioneel)
                </p>
              </div>
              <Switch
                checked={wcSettings?.auto_import_enabled ?? false}
                onCheckedChange={handleToggleAutoSync}
                disabled={toggleAutoSync.isPending || !wcSettings}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Automatische Verkoop Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Stel een webhook in WooCommerce in om automatisch verkopen te importeren:
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="text-xs font-mono" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="webhook_secret" className="text-xs">Webhook Secret (optioneel)</Label>
            <Input
              id="webhook_secret"
              type={showKeys ? 'text' : 'password'}
              placeholder="whsec_..."
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Gebruik hetzelfde geheim als je bij WooCommerce invult</p>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-primary hover:underline">📖 Instructies Bekijken</summary>
            <ol className="mt-2 space-y-1 text-muted-foreground list-decimal list-inside">
              <li>Ga naar WooCommerce → Instellingen → Geavanceerd → Webhooks</li>
              <li>Klik op "Webhook toevoegen"</li>
              <li>Naam: "Falco Caffè Sync"</li>
              <li>Status: Actief</li>
              <li>Onderwerp: "Bestelling bijgewerkt" (of "Order completed")</li>
              <li>Leverings-URL: kopieer de URL hierboven</li>
              <li>Geheim: kies een geheim en vul het ook hierboven in</li>
              <li>API versie: WP REST API Integration v3</li>
              <li>Klik op "Webhook opslaan"</li>
            </ol>
          </details>
        </CardContent>
      </Card>

      {/* Sync Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Sync Geschiedenis
            </CardTitle>
            {filteredLogs && (
              <Badge variant="secondary" className="text-xs font-normal">
                {filteredLogs.length} {filteredLogs.length === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </div>
          <Select value={logFilter} onValueChange={setLogFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle types</SelectItem>
              <SelectItem value="import_products">Import Producten</SelectItem>
              <SelectItem value="import_stock">Import Voorraad</SelectItem>
              <SelectItem value="import_order">Import Bestellingen</SelectItem>
              <SelectItem value="full_sync">Volledige Sync</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !filteredLogs?.length ? (
            <p className="text-center text-muted-foreground py-8">Nog geen sync activiteit</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Richting</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className={cn(
                      log.status === 'failed' && 'bg-destructive/5',
                      log.status === 'pending' && 'bg-warning/5',
                    )}>
                      <TableCell className="text-xs whitespace-nowrap">{timeAgo(log.synced_at)}</TableCell>
                      <TableCell className="text-xs">{SYNC_TYPE_LABELS[log.sync_type] ?? log.sync_type}</TableCell>
                      <TableCell className="text-xs">
                        {log.direction === 'to_woocommerce' ? (
                          <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                            <Upload className="h-3 w-3" /> Push
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                            <Download className="h-3 w-3" /> Pull
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.new_value && <span>{log.old_value ? `${log.old_value} → ` : ''}{log.new_value}</span>}
                        {log.woocommerce_order_id && <span className="text-muted-foreground ml-1">(#WC{log.woocommerce_order_id})</span>}
                        {log.error_message && (
                          <div className="mt-1 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded px-2 py-1">
                            <span className="font-medium">Fout:</span> {log.error_message}
                            {log.error_details?.category && (
                              <span className="block text-[10px] text-muted-foreground mt-0.5">
                                Categorie: {log.error_details.category} · Pogingen: {log.error_details.attempts}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell><SyncStatusBadge status={log.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
