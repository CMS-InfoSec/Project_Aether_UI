import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function StrategiesSignals() {
  const [registry, setRegistry] = useState<any[]>([]);
  // Stress Tests
  const [strategyId, setStrategyId] = useState<string>('');
  const [initialEquity, setInitialEquity] = useState<string>('10000');
  const [horizonDays, setHorizonDays] = useState<string>('30');
  const [confidence, setConfidence] = useState<string>('0.95');
  const [flashMagnitude, setFlashMagnitude] = useState<string>('');
  const [flashDuration, setFlashDuration] = useState<string>('');
  const [illiquidityMagnitude, setIlliquidityMagnitude] = useState<string>('');
  const [illiquidityDuration, setIlliquidityDuration] = useState<string>('');
  const [downtimeDuration, setDowntimeDuration] = useState<string>('');
  const [useOpenPositions, setUseOpenPositions] = useState<boolean>(true);
  const [stressLoading, setStressLoading] = useState(false);
  const [stressResult, setStressResult] = useState<any|null>(null);
  const [pinned, setPinned] = useState<boolean>(false);
  // Strategies explainability
  const [explainLimit, setExplainLimit] = useState<number>(10);
  const [explainCaps, setExplainCaps] = useState<{default_limit:number; max_limit:number}|null>(null);
  const [explainItems, setExplainItems] = useState<any[]>([]);
  const [explainLoading, setExplainLoading] = useState(false);
  // Forecast model explainability
  const [models, setModels] = useState<any[]>([]);
  const [modelId, setModelId] = useState<string>('');
  const [series, setSeries] = useState<string>('');
  const [modelExplain, setModelExplain] = useState<any|null>(null);
  const [modelExplainLoading, setModelExplainLoading] = useState(false);
  const [asset, setAsset] = useState('BTC');
  const [sentiment, setSentiment] = useState<any | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [social, setSocial] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadRegistry = async () => {
    setError(null);
    try {
      const r = await fetch('/api/strategies/flags');
      const j = await r.json();
      setRegistry(j.data || []);
    } catch (e:any) { setError(e.message); }
  };

  const loadModels = async () => { try { const r = await fetch('/api/models'); const j = await r.json(); setModels(j?.data || j || []); } catch {}
  };
  const loadExplainability = async () => {
    setExplainLoading(true);
    try { const r = await fetch('/api/strategies/explain'); const j = await r.json(); setExplainCaps(j?.caps||null); setExplainItems(j?.items||[]); }
    catch {}
    finally { setExplainLoading(false); }
  };

  const loadSentiment = async () => {
    if (!/^[A-Z0-9]{1,20}$/.test(asset.trim().toUpperCase())) { toast({ title:'Invalid symbol', description:'Use up to 20 alphanumerics', variant:'destructive' }); return; }
    try {
      const a = asset.trim().toUpperCase();
      const s = await fetch(`/api/news/sentiment?asset=${encodeURIComponent(a)}`);
      if (s.status === 422) { toast({ title:'Invalid symbol', description:'Unsupported symbol', variant:'destructive' }); return; }
      const sj = await s.json();
      setSentiment(sj);
      const n = await fetch('/api/news/latest'); setNews((await n.json()).items || []);
      const so = await fetch('/api/social/latest'); setSocial((await so.json()).items || []);
    } catch {}
  };

  useEffect(()=>{ loadRegistry(); loadModels(); loadExplainability(); }, []);
  useEffect(()=>{ if (strategyId){ const p = localStorage.getItem(`stressTest.pinned.${strategyId}`); if (p){ setPinned(JSON.parse(p)); } } }, [strategyId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Strategies & Signals</h1>
        <Button variant="outline" onClick={loadRegistry}><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Tabs defaultValue="registry">
        <TabsList>
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="stress">Stress Tests</TabsTrigger>
          <TabsTrigger value="explain">Explainability</TabsTrigger>
          <TabsTrigger value="ingest">Manual Ingest</TabsTrigger>
        </TabsList>

        <TabsContent value="registry">
          <Card>
            <CardHeader><CardTitle>Strategy Registry</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Weight</th><th className="text-left p-2">Status</th><th className="text-left p-2">Last Run</th></tr></thead>
                  <tbody>
                    {registry.map((r:any)=> (
                      <tr key={r.name} className="border-t"><td className="p-2">{r.name}</td><td className="p-2">{r.weight}</td><td className="p-2">{r.enabled? 'enabled':'disabled'}</td><td className="p-2">{new Date(r.last_run).toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment">
          <Card>
            <CardHeader><CardTitle>Sentiment & Feeds</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1"><Label>Asset</Label><Input value={asset} onChange={(e)=>setAsset(e.target.value.toUpperCase())} placeholder="BTC" /></div>
                <Button onClick={loadSentiment}>Load</Button>
              </div>
              {sentiment && (
                <div className="flex items-center space-x-3">
                  <div>Sentiment: <strong>{sentiment.sentiment}</strong></div>
                  <div className="text-xs">Flags: {Object.entries(sentiment.flags).filter(([_,v])=>v).map(([k])=>k).join(', ') || 'none'}</div>
                </div>
              )}

              {/* Admin-only Replay News Failures */}
              {user?.role === 'admin' && (
                <div className="border p-3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Replay News Failures</div>
                    <Button size="sm" variant="outline" onClick={async ()=>{
                      const ok = window.confirm('This will call POST /api/news/replay-failures to flush and replay failed news jobs. Continue?');
                      if(!ok) return;
                      try{
                        const r = await fetch('/api/news/replay-failures',{method:'POST'});
                        const j = await r.json();
                        if (!r.ok) throw new Error(j.detail||'Failed');
                        toast({ title:'Replayed', description:`Replayed ${j.flushed||0} items` });
                      }catch(e:any){ toast({ title:'Error', description:e.message||'Failed', variant:'destructive' }); }
                    }}>Replay Failures</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Admin only</div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium mb-2">News</div>
                  <ul className="list-disc pl-5 text-sm space-y-1">{news.map(n=> <li key={n.id}>{n.title}</li>)}</ul>
                </div>
                <div>
                  <div className="font-medium mb-2">Social</div>
                  <ul className="list-disc pl-5 text-sm space-y-1">{social.map(s=> <li key={s.id}><span className="text-muted-foreground mr-1">{s.author}</span>{s.text}</li>)}</ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress">
          <Card>
            <CardHeader><CardTitle>Strategy Stress Tests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Strategy</Label>
                  <Select value={strategyId} onValueChange={setStrategyId}>
                    <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                    <SelectContent>
                      {registry.map((r:any)=> (<SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Initial Equity (USD)</Label>
                  <Input type="number" step="0.01" value={initialEquity} onChange={e=> setInitialEquity(e.target.value)} />
                </div>
                <div>
                  <Label>Horizon (days)</Label>
                  <Input type="number" min={1} max={365} value={horizonDays} onChange={e=> setHorizonDays(e.target.value)} />
                </div>
                <div>
                  <Label>Confidence</Label>
                  <Select value={confidence} onValueChange={setConfidence}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.9">90%</SelectItem>
                      <SelectItem value="0.95">95%</SelectItem>
                      <SelectItem value="0.99">99%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>Flash magnitude (%)</Label><Input type="number" step="0.01" value={flashMagnitude} onChange={e=> setFlashMagnitude(e.target.value)} placeholder="-20" /></div>
                <div><Label>Flash duration (min)</Label><Input type="number" value={flashDuration} onChange={e=> setFlashDuration(e.target.value)} placeholder="15" /></div>
                <div className="flex items-center space-x-2 mt-6"><input type="checkbox" checked={useOpenPositions} onChange={e=> setUseOpenPositions(e.target.checked)} /><span>Use open positions</span></div>
                <div><Label>Illiquidity magnitude (%)</Label><Input type="number" step="0.01" value={illiquidityMagnitude} onChange={e=> setIlliquidityMagnitude(e.target.value)} placeholder="50" /></div>
                <div><Label>Illiquidity duration (min)</Label><Input type="number" value={illiquidityDuration} onChange={e=> setIlliquidityDuration(e.target.value)} placeholder="30" /></div>
                <div><Label>Downtime duration (min)</Label><Input type="number" value={downtimeDuration} onChange={e=> setDowntimeDuration(e.target.value)} placeholder="10" /></div>
              </div>
              <div className="flex items-center gap-2">
                <Button disabled={stressLoading || !strategyId || Number(initialEquity)<=0 || Number(horizonDays)<=0} onClick={async ()=>{
                  setStressLoading(true);
                  setPinned(false);
                  try {
                    const payload:any = { strategy_id: strategyId, initial_equity: Number(initialEquity), horizon_days: Number(horizonDays), confidence_level: Number(confidence), use_open_positions: useOpenPositions };
                    if (flashMagnitude) payload.flash_magnitude = Number(flashMagnitude)/100;
                    if (flashDuration) payload.flash_duration = Number(flashDuration);
                    if (illiquidityMagnitude) payload.illiquidity_magnitude = Number(illiquidityMagnitude)/100;
                    if (illiquidityDuration) payload.illiquidity_duration = Number(illiquidityDuration);
                    if (downtimeDuration) payload.downtime_duration = Number(downtimeDuration);
                    const r = await fetch('/api/strategies/stress-test', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                    const j = await r.json();
                    if (!r.ok){ toast({ title:'Error', description: j.detail || 'Stress test failed', variant:'destructive' }); }
                    else { setStressResult(j); if (strategyId) localStorage.setItem(`stressTest.${strategyId}`, JSON.stringify(j)); }
                  } catch { toast({ title:'Error', description:'Network error', variant:'destructive' }); }
                  finally { setStressLoading(false); }
                }}>{stressLoading? 'Running stress scenarios…':'Run Stress Test'}</Button>
                {stressResult && (
                  <Button variant="outline" onClick={()=>{
                    if (!strategyId || !stressResult) return;
                    const blob = new Blob([JSON.stringify(stressResult,null,2)],{type:'application/json'});
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `stress_${strategyId}.json`; a.click();
                  }}>Download JSON</Button>
                )}
              </div>
              {stressResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Results ready</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pinned? 'default':'outline'} onClick={()=> { const nv=!pinned; setPinned(nv); if (strategyId){ localStorage.setItem(`stressTest.pinned.${strategyId}`, JSON.stringify(nv)); } }} className="cursor-pointer">{pinned? 'Pinned':'Pin this run'}</Badge>
                      <Button variant="outline" size="sm" onClick={()=>{
                        const rows = (stressResult.scenarios||[]).map((s:any)=> ({ name: s.name, ...s.parameters, ...s.metrics }));
                        const headers = Array.from(rows.reduce((set:any,row:any)=>{ Object.keys(row).forEach(k=> set.add(k)); return set; }, new Set(['name'])));
                        const csv = [headers.join(',')].concat(rows.map((r:any)=> headers.map((h:string)=> r[h]!==undefined? r[h]: '').join(','))).join('\n');
                        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = `stress_${strategyId}.csv`; a.click();
                      }}>Download CSV</Button>
                      <Button variant="ghost" size="sm" onClick={()=> setStressResult(null)}>Clear</Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Card><CardHeader><CardTitle>Max Drawdown</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{(stressResult.metrics?.max_drawdown*100).toFixed(2)}%</CardContent></Card>
                    <Card><CardHeader><CardTitle>VaR</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{(stressResult.metrics?.var*100).toFixed(2)}%</CardContent></Card>
                    <Card><CardHeader><CardTitle>CVaR</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{(stressResult.metrics?.cvar*100).toFixed(2)}%</CardContent></Card>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Scenarios</div>
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Parameters</th><th className="text-left p-2">Metrics</th></tr></thead>
                        <tbody>
                          {(stressResult.scenarios||[]).map((s:any)=> (
                            <tr key={s.name} className="border-t"><td className="p-2">{s.name}</td><td className="p-2">{Object.entries(s.parameters||{}).map(([k,v])=> `${k}: ${v}`).join(', ')|| '—'}</td><td className="p-2">{Object.entries(s.metrics||{}).map(([k,v])=> `${k}: ${typeof v==='number'? v: String(v)}`).join(', ')}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="explain">
          <Card>
            <CardHeader><CardTitle>Explainability</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div>
                  <Label>Limit</Label>
                  <Input type="number" min={1} value={explainLimit} onChange={(e)=>{
                    const n = Math.max(1, Math.min(parseInt(e.target.value)||10, explainCaps?.max_limit||50));
                    setExplainLimit(n);
                  }} />
                  {explainCaps && <div className="text-xs text-muted-foreground">Showing {Math.min(explainLimit, explainCaps.max_limit)} of {explainCaps.max_limit} max</div>}
                </div>
                <Button variant="outline" onClick={loadExplainability}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
              </div>

              {explainLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {explainItems.map((it:any)=> (
                    <Card key={it.request_id || it.timestamp}>
                      <CardHeader className="space-y-1">
                        <CardTitle className="text-base">{it.strategy}</CardTitle>
                        <div className="text-xs text-muted-foreground">{new Date(it.timestamp).toLocaleString()}</div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {it.rationales && (
                          <div>
                            <div className="font-medium mb-1">Rationales</div>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                              {it.rationales.map((r:any,idx:number)=> (
                                <li key={idx}><span>{r.text}</span>{typeof r.weight==='number' && <Badge variant="outline" className="ml-2">w {r.weight}</Badge>}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {it.shap?.top_features && (
                          <div>
                            <div className="font-medium mb-1">Top Features</div>
                            <ul className="text-sm space-y-1">
                              {it.shap.top_features.map((f:any,idx:number)=> (
                                <li key={idx} className="flex items-center justify-between"><span>{f.feature}</span><span className="text-muted-foreground">{(f.weight*100).toFixed(1)}%</span></li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={()=>{
                            const blob = new Blob([JSON.stringify(it,null,2)],{type:'application/json'});
                            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `explain_${it.strategy}.json`; a.click();
                          }}>Download rationale JSON</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="font-medium mb-2">Forecast Model Explainability</div>
                <div className="grid md:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label>Model</Label>
                    <Select value={modelId} onValueChange={setModelId}>
                      <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                      <SelectContent>
                        {models.map((m:any)=> (<SelectItem key={m.modelId} value={m.modelId}>{m.name || m.modelId}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Sample series (optional CSV/JSON of numbers)</Label>
                    <Input value={series} onChange={(e)=> setSeries(e.target.value)} placeholder="1.2, 0.8, -0.3" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button disabled={!modelId || modelExplainLoading} onClick={async ()=>{
                    setModelExplainLoading(true);
                    try{
                      let q = '';
                      if (series.trim()){
                        const vals = series.includes('[')? JSON.parse(series): series.split(/[\s,]+/).filter(Boolean).map(Number);
                        if (!Array.isArray(vals) || vals.some((v:any)=> typeof v!=='number' || Number.isNaN(v))) throw new Error('invalid series');
                        q = `?data=${encodeURIComponent(JSON.stringify(vals))}`;
                      }
                      const r = await fetch(`/api/models/explain/${encodeURIComponent(modelId)}${q}`);
                      const j = await r.json();
                      if (!r.ok) throw new Error(j.detail || 'Failed');
                      setModelExplain(j);
                    }catch(e:any){ toast({ title:'Error', description: e.message || 'Failed', variant:'destructive' }); }
                    finally{ setModelExplainLoading(false); }
                  }}>{modelExplainLoading? 'Explaining…':'Run Forecast Explainability'}</Button>
                  {modelExplain && (
                    <Button variant="outline" onClick={()=>{
                      const blob = new Blob([JSON.stringify(modelExplain,null,2)],{type:'application/json'});
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `model_explain_${modelId}.json`; a.click();
                    }}>Download JSON</Button>
                  )}
                </div>

                {modelExplain && (
                  <div className="mt-3">
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead><tr><th className="text-left p-2">Feature</th><th className="text-left p-2">Importance</th><th className="text-left p-2">Rank</th></tr></thead>
                        <tbody>
                          {modelExplain.features?.slice().sort((a:any,b:any)=> b.importance - a.importance).map((f:any, idx:number)=> (
                            <tr key={f.name} className="border-t"><td className="p-2">{f.name}</td><td className="p-2">{(f.importance*100).toFixed(1)}%</td><td className="p-2">#{idx+1}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingest">
          <Card>
            <CardHeader><CardTitle>Manual Signal Ingest</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" onClick={async ()=>{
                try{ const r = await fetch('/api/signals/metrics'); const j = await r.json(); alert(JSON.stringify(j,null,2)); }catch{}
              }}>View Rate Limits</Button>
              <div>
                <Label htmlFor="source">Source</Label>
                <Input id="source" placeholder="tradingview" defaultValue="tradingview" />
              </div>
              <div>
                <Label htmlFor="idk">X-Idempotency-Key</Label>
                <Input id="idk" placeholder="unique-key" />
              </div>
              <div>
                <Label htmlFor="payload">Payload (JSON)</Label>
                <Textarea id="payload" rows={6} defaultValue='{"symbol":"BTC/USDT","signal":"buy"}' />
              </div>
              <Button onClick={async ()=>{
                const key = (document.getElementById('idk') as HTMLInputElement)?.value?.trim();
                const bodyText = (document.getElementById('payload') as HTMLTextAreaElement)?.value || '{}';
                try {
                  JSON.parse(bodyText);
                } catch { toast({ title:'Invalid JSON', description:'Fix payload JSON', variant:'destructive' }); return; }
                if (!key || !/^[A-Za-z0-9_-]+$/.test(key)) { toast({ title:'Invalid idempotency key', description:'Use A-Za-z0-9_-', variant:'destructive' }); return; }
                const res = await fetch('/api/signals/ingest', { method:'POST', headers:{ 'Content-Type':'application/json', 'X-Idempotency-Key': key }, body: bodyText });
                if (res.status === 202) { toast({ title:'Accepted', description:'Signal queued' }); }
                else if (res.status === 409) { toast({ title:'Duplicate', description:'Duplicate detected' }); }
                else { const j = await res.json().catch(()=>({detail:'Failed'})); toast({ title:'Error', description: j.detail || 'Failed', variant:'destructive' }); }
              }}>Validate & Send</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
