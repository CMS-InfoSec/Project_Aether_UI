import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Activity, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Observability() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [deps, setDeps] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch('/api/health/ready');
      const j = await r.json();
      setReady(j.ready);
      const d = await fetch('/api/health/dependencies');
      setDeps(await d.json());
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Observability & Health</h1>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
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
