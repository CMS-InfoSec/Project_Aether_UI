import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Activity, Server } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function Observability() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [deps, setDeps] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [liveness, setLiveness] = useState<any|null>(null);
  const [auto, setAuto] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch('/api/health/ready');
      const j = await r.json();
      setReady(j.ready);
      const d = await fetch('/api/health/dependencies');
      setDeps(await d.json());
      const l = await fetch('/api/health/ready/details');
      setLiveness(await l.json());
    } catch (e:any) {
      setError(e.message || 'Failed to load');
    }
  };

  const loadMetrics = async () => {
    try {
      const r = await fetch('/api/metrics');
      setMetrics(await r.text());
    } catch (e:any) {
      setMetrics('');
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(()=>{
    if (!auto) return; const t = setInterval(load, 30000); return ()=> clearInterval(t);
  },[auto]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Observability & Health</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm"><Switch id="auto" checked={auto} onCheckedChange={setAuto} /><Label htmlFor="auto">Auto-refresh 30s</Label></div>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2"><Activity className="h-5 w-5" /><span>Readiness</span></CardTitle>
        </CardHeader>
        <CardContent>
          {ready === null ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : (
            <Badge variant={ready ? 'default' : 'destructive'}>{ready ? 'Ready' : 'Not ready'}</Badge>
          )}
          {!ready && <Alert className="mt-3" variant="destructive"><AlertDescription>Critical dependencies failing. See diagnostics below.</AlertDescription></Alert>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2"><Server className="h-5 w-5" /><span>Dependencies</span></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {deps.map((d) => (
              <div key={d.id} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div className="font-medium capitalize">{d.id}</div>
                  <Badge variant={d.ok ? 'default' : (d.skipped ? 'secondary' : 'destructive')}>{d.ok ? 'ok' : (d.skipped ? 'skipped' : 'error')}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Checked: {new Date(d.checked_at).toLocaleString()} • Code: {d.code}</div>
                {d.error && <div className="text-xs mt-1">{d.error}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2"><Server className="h-5 w-5" /><span>Liveness</span></CardTitle>
        </CardHeader>
        <CardContent>
          {liveness ? (
            <div className="grid gap-3 md:grid-cols-2">
              {liveness.dependencies?.map((d:any)=> (
                <div key={d.name} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{d.name}</div>
                    <Badge variant={d.ok? 'default':'destructive'}>{d.ok? 'Healthy':'Unavailable'}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Checked: {new Date(d.checked_at).toLocaleString()} • Timeout: {d.timeout}ms</div>
                </div>
              ))}
            </div>
          ) : <div className="text-muted-foreground">Loading…</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prometheus Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Preview (first lines)</div>
            <Button size="sm" variant="outline" onClick={loadMetrics}><RefreshCw className="h-4 w-4 mr-2"/>Refresh metrics</Button>
          </div>
          <pre className="max-h-64 overflow-auto text-xs p-3 bg-muted/40 rounded border">{metrics || 'No metrics loaded'}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
