import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export default function AdminASC() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch('/api/strategy/controller/status');
      const j = await r.json();
      setPolicies(j.data.policies);
      setWeights(j.data.weights);
    } catch (e:any) { setError(e.message || 'Failed to load'); }
  };

  useEffect(()=>{ load(); }, []);

  const toggle = async (name:string, enable:boolean) => {
    await fetch(`/api/strategy/controller/policy/${encodeURIComponent(name)}/${enable? 'activate':'deactivate'}`, { method:'POST' });
    load();
  };

  const saveWeights = async () => {
    await fetch('/api/strategy/controller/reweight', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ weights }) });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Adaptive Strategy Controller</h1>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {policies.map(p => (
              <div key={p.name} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Sharpe: {p.kpis?.sharpe ?? '—'}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Label>Weight</Label>
                    <Input type="number" step="0.05" className="w-24" value={weights[p.name] ?? p.weight}
                      onChange={(e)=> setWeights(s => ({ ...s, [p.name]: Number(e.target.value) }))}
                    />
                  </div>
                  <Switch checked={p.enabled} onCheckedChange={(v)=> toggle(p.name, v)} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button onClick={saveWeights}>Save Weights</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
