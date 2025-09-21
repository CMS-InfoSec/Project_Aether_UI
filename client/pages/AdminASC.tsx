import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Activity, CircleAlert, Rocket, CheckCircle, XCircle, Download } from 'lucide-react';
import apiFetch from '@/lib/apiClient';

interface Policy { name: string; enabled: boolean; weight: number; kpis?: { sharpe?: number; win_rate?: number } }
interface StatusResp { weights: Record<string, number>; policies: Policy[]; exploration?: number; kpis?: Record<string, Record<string, any>>; rl?: { online: boolean; promoted_checkpoint?: string }; degraded?: boolean }

export default function AdminASC() {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [editWeights, setEditWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [histSymbol, setHistSymbol] = useState<string>('BTC/USDT');
  const [history, setHistory] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [persistenceSkipped, setPersistenceSkipped] = useState<boolean>(false);

  const load = async () => {
    setError(null); setLoading(true);
    try {
      const r = await apiFetch('/api/strategy/controller/status');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const data = (j.status === 'success' ? j.data : j) as StatusResp;
      setStatus(data);
      setEditWeights(data.weights || {});
    } catch (e:any) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const normalizeWeights = (w: Record<string, number>) => {
    const clamped: Record<string, number> = {};
    let l1 = 0; Object.entries(w).forEach(([k,v])=>{ const vv = Math.max(-1, Math.min(1, Number(v)||0)); clamped[k]=vv; l1 += Math.abs(vv); });
    if (l1 === 0) return { ok:false, weights: clamped };
    const norm: Record<string, number> = {}; Object.entries(clamped).forEach(([k,v])=> norm[k] = v / l1);
    return { ok:true, weights: norm };
  };

  const saveWeights = async () => {
    const res = normalizeWeights(editWeights);
    if (!res.ok) { toast({ title:'Validation', description:'Weights L1 norm must be > 0', variant:'destructive' }); return; }
    setSaving(true);
    try {
      const r = await apiFetch('/api/strategy/controller/reweight', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ weights: res.weights }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Failed to save');
      setPersistenceSkipped(!!j.persistence_skipped);
      toast({ title:'Weights saved', description: j.persistence_skipped ? 'Persistence skipped (degraded), in-memory active' : 'Persisted' });
      await load();
    } catch(e:any) { toast({ title:'Save failed', description: e.message || 'Failed', variant:'destructive' }); }
    finally { setSaving(false); }
  };

  const toggle = async (name:string, enable:boolean) => {
    const prev = status?.policies || [];
    // optimistic
    setStatus(s=> s? ({ ...s, policies: s.policies.map(p=> p.name===name? { ...p, enabled: enable }: p) }) : s);
    try {
      const r = await apiFetch(`/api/strategy/controller/policy/${encodeURIComponent(name)}/${enable? 'activate':'deactivate'}`, { method:'POST' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: enable? 'Policy activated':'Policy deactivated' });
    } catch(e:any) {
      toast({ title:'Toggle failed', description:e.message || 'Failed', variant:'destructive' });
      setStatus(s=> s? ({ ...s, policies: prev }) : s);
    }
  };

  const symbols = useMemo(()=> Object.keys(status?.kpis || {}).sort(), [status?.kpis]);

  const fetchHistory = async () => {
    setHistLoading(true);
    try { const r = await apiFetch(`/api/strategy/controller/history?symbol=${encodeURIComponent(histSymbol)}`); const j = await r.json(); if (j.status==='success') setHistory(j.data.items||[]); else setHistory(j.items||[]); }
    catch { /* noop */ }
    finally { setHistLoading(false); }
  };

  useEffect(()=>{ if (histSymbol) fetchHistory(); }, [histSymbol]);

  const exportJSON = () => {
    const payload = { symbol: histSymbol, items: history };
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `asc_history_${histSymbol.replace('/','-')}.json`; a.click();
  };

  const exportCSV = () => {
    const headers = ['ts','symbol','action','size_usdt','confidence','news_sentiment','rationale'];
    const rows = history.map((it:any)=> [it.ts, it.symbol, it.action, it.size_usdt, it.confidence, it.news_sentiment, `"${(it.rationale||'').replace(/"/g,'""')}"`].join(','));
    const blob = new Blob([[headers.join(',')].concat(rows).join('\n')], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `asc_history_${histSymbol.replace('/','-')}.csv`; a.click();
  };

  const l1 = useMemo(()=> Object.values(editWeights).reduce((s,v)=> s+Math.abs(Number(v)||0), 0), [editWeights]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Adaptive Strategy Controller</h1>
          <p className="text-muted-foreground">Tune strategy weights, toggle policies, and inspect decisions</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading? 'animate-spin':''}`} />Refresh</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {status?.degraded && (
        <Alert variant="destructive"><CircleAlert className="h-4 w-4" /><AlertDescription>Degraded persistence. Edits stay in-memory until backend recovers.</AlertDescription></Alert>
      )}

      {status?.rl && !status.rl.online && (
        <Alert variant="destructive"><AlertDescription>RL stack offline. RL-driven policies may be unavailable.</AlertDescription></Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Controller Status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controller Status</CardTitle>
            <CardDescription>Live snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Exploration ε</span><span className="font-medium">{status?.exploration?.toFixed(3) ?? '—'}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">RL</span>{status?.rl?.online ? <Badge variant="outline" className="text-green-700 border-green-300">Online</Badge> : <Badge variant="destructive">Offline</Badge>}</div>
            {status?.rl?.promoted_checkpoint && (
              <div className="text-xs">Checkpoint: <span className="font-mono">{status.rl.promoted_checkpoint}</span></div>
            )}
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1">Weights</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(status?.weights || {}).map(([k,v])=> (
                  <Badge key={k} variant="secondary" className="text-xs">{k}: {(v as number).toFixed(2)}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weights Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weights Editor</CardTitle>
            <CardDescription>Clamp [-1,1], normalized to L1=1 on save</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              {(status?.policies || []).map(p => (
                <div key={p.name} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2"><div className="font-medium">{p.name}</div><Badge variant={p.enabled? 'default':'secondary'}>{p.enabled? 'enabled':'disabled'}</Badge></div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`w_${p.name}`} className="text-xs">Weight</Label>
                    <Input id={`w_${p.name}`} type="number" step="0.05" className="w-28" value={editWeights[p.name] ?? p.weight} onChange={(e)=> setEditWeights(s => ({ ...s, [p.name]: Number(e.target.value) }))} />
                    {typeof p.kpis?.sharpe === 'number' && <Badge variant="outline" className="text-xs">Sharpe {p.kpis!.sharpe!.toFixed(2)}</Badge>}
                    {typeof p.kpis?.win_rate === 'number' && <Badge variant="outline" className="text-xs">Win {Math.round((p.kpis!.win_rate!*100))}%</Badge>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Current L1 norm: {l1.toFixed(2)} {l1===0 && <span className="text-red-600">(must be &gt; 0)</span>}</div>
              <Button onClick={saveWeights} disabled={saving || l1===0}>{saving? <><RefreshCw className="h-4 w-4 mr-2 animate-spin"/>Saving…</> : 'Normalize & Save'}</Button>
            </div>
            {persistenceSkipped && <div className="text-xs text-yellow-700">Persistence skipped (degraded). Weights active in-memory.</div>}
          </CardContent>
        </Card>
      </div>

      {/* Policies Registry */}
      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
          <CardDescription>Enable/disable policies with audit logging</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Sharpe</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(status?.policies || []).map(p => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.enabled ? <Badge variant="default">Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}</TableCell>
                    <TableCell>{(status?.weights?.[p.name] ?? p.weight).toFixed(2)}</TableCell>
                    <TableCell>{typeof p.kpis?.sharpe === 'number' ? p.kpis!.sharpe!.toFixed(2) : '—'}</TableCell>
                    <TableCell>{typeof p.kpis?.win_rate === 'number' ? `${Math.round(p.kpis!.win_rate!*100)}%` : '—'}</TableCell>
                    <TableCell className="text-right">
                      <Switch checked={p.enabled} onCheckedChange={(v)=> toggle(p.name, v)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Decision History & Explainability */}
      <Card>
        <CardHeader>
          <CardTitle>Decision History</CardTitle>
          <CardDescription>Action proposals, components, and SHAP summaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>Symbol</Label>
              <Input list="asc-symbols" value={histSymbol} onChange={(e)=> setHistSymbol(e.target.value.toUpperCase())} placeholder="BTC/USDT" />
              <datalist id="asc-symbols">{symbols.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchHistory} disabled={histLoading}>{histLoading? <><RefreshCw className="h-4 w-4 mr-2 animate-spin"/>Loading…</> : 'Load History'}</Button>
              <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2"/>CSV</Button>
              <Button variant="outline" onClick={exportJSON}><Download className="h-4 w-4 mr-2"/>JSON</Button>
            </div>
          </div>

          {histLoading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground"><Activity className="h-5 w-5 mr-2 animate-pulse" />Loading…</div>
          ) : history.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">No items</div>
          ) : (
            <div className="space-y-4">
              {history.map((it:any, idx:number)=> (
                <div key={idx} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{it.symbol} • {it.action} • {it.size_usdt} USDT</div>
                    <div className="text-sm text-muted-foreground">{new Date(it.ts || Date.now()).toLocaleString()}</div>
                  </div>
                  <div className="text-sm">Confidence: {(it.confidence*100).toFixed(1)}% • Sentiment: {(it.news_sentiment*100).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">{it.rationale}</div>
                  <div className="grid md:grid-cols-2 gap-3 mt-2">
                    <div>
                      <div className="text-xs font-medium mb-1">Components</div>
                      <div className="text-xs space-y-1">
                        {(it.components||[]).map((c:any)=> (
                          <div key={c.name} className="flex justify-between"><span>{c.name}</span><span>score {(c.score).toFixed(2)} • w {(c.weight).toFixed(2)} • bucket {(c.size_bucket).toFixed(2)}</span></div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium mb-1">SHAP</div>
                      <div className="text-xs space-y-1">
                        {(it.scores_shap||[]).map((s:any)=> (
                          <div key={s.feature} className="flex justify-between"><span>{s.feature}</span><span>{s.shap.toFixed(3)}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
