import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import apiFetch from "@/lib/apiClient";
import { HelpTip } from '@/components/ui/help-tip';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface TaskRow { id: string; status: 'PENDING'|'STARTED'|'SUCCESS'|'FAILURE'|'REVOKED'; result?: any; error?: string; nextDelay?: number; }

const MAX_LOOKBACK_DAYS = 365;

export default function AdminSystemTasks(){
  const { toast } = useToast();

  const [errorBanner, setErrorBanner] = useState<{ code:number; message:string } | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  // Per-user data refresh
  const [userCooldown, setUserCooldown] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userRefreshing, setUserRefreshing] = useState(false);
  const [recentRuns, setRecentRuns] = useState<{ ts:number; type:'user'|'global'; status:'triggered'|'failed'; detail?:string }[]>([]);

  // Global refresh
  const [globalCooldown, setGlobalCooldown] = useState(0);
  const [globalRefreshing, setGlobalRefreshing] = useState(false);

  // Historical series form
  const [coin, setCoin] = useState('BTC');
  const [lookback, setLookback] = useState(7);
  const [interval, setIntervalStr] = useState('1h');
  const [source, setSource] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // Tasks tracking
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  // Cooldown tickers
  useEffect(()=>{ if (userCooldown<=0) return; const id = setInterval(()=> setUserCooldown(s=> s>0? s-1:0), 1000); return ()=> clearInterval(id); },[userCooldown]);
  useEffect(()=>{ if (globalCooldown<=0) return; const id = setInterval(()=> setGlobalCooldown(s=> s>0? s-1:0), 1000); return ()=> clearInterval(id); },[globalCooldown]);

  const addRecent = (type:'user'|'global', status:'triggered'|'failed', detail?:string)=> setRecentRuns(prev=> [{ ts: Date.now(), type, status, detail }, ...prev].slice(0,10));

  const triggerUser = async () => {
    setConfirmOpen(false); setErrorBanner(null); setUserRefreshing(true);
    try {
      const r = await apiFetch('/api/tasks/data-refresh', { method:'POST' });
      const j = await r.json().catch(()=>({}));
      if (r.status === 429) {
        const ra = parseInt(r.headers.get('Retry-After') || '60', 10) || 60;
        setUserCooldown(ra); addRecent('user','failed', '429');
        setErrorBanner({ code: 429, message: 'Per-user limiter active. Please wait.' });
        return;
      }
      if (!r.ok) { addRecent('user','failed', String(r.status)); setErrorBanner({ code: r.status, message: j.detail || 'Request failed' }); return; }
      if (j.status === 'triggered') { addRecent('user','triggered'); toast({ title:'Data refresh triggered' }); }
    } catch (e:any) { addRecent('user','failed', e?.message || 'error'); setErrorBanner({ code: 0, message: e?.message || 'Network error' }); }
    finally { setUserRefreshing(false); }
  };

  const triggerGlobal = async () => {
    setErrorBanner(null); setGlobalRefreshing(true);
    try {
      const r = await apiFetch('/api/data/refresh', { method:'POST' });
      const j = await r.json().catch(()=>({}));
      if (r.status === 429) {
        const ra = parseInt(r.headers.get('Retry-After') || '60', 10) || 60;
        setGlobalCooldown(ra); addRecent('global','failed','429');
        setErrorBanner({ code: 429, message: 'Fleet-wide cooldown active. Please wait.' });
        return;
      }
      if (!r.ok) { addRecent('global','failed', String(r.status)); setErrorBanner({ code: r.status, message: j.detail || 'Request failed' }); return; }
      if (j.status === 'triggered') { addRecent('global','triggered'); toast({ title:'Global data refresh triggered' }); }
    } catch (e:any) { addRecent('global','failed', e?.message || 'error'); setErrorBanner({ code: 0, message: e?.message || 'Network error' }); }
    finally { setGlobalRefreshing(false); }
  };

  const validateForm = () => {
    if (!coin.trim()) return false;
    if (lookback < 1 || lookback > MAX_LOOKBACK_DAYS) return false;
    const allowed = ['1m','5m','15m','1h','4h','1d'];
    if (!allowed.includes(interval)) return false;
    if (start && isNaN(Date.parse(start))) return false;
    if (end && isNaN(Date.parse(end))) return false;
    return true;
  };

  const requestSeries = async () => {
    setErrorBanner(null);
    if (!validateForm()) { setErrorBanner({ code: 400, message: 'Invalid form' }); return; }
    try {
      const url = new URL('/api/data/price-series', window.location.origin);
      url.searchParams.set('coin', coin.trim());
      url.searchParams.set('interval', interval);
      url.searchParams.set('lookback', String(lookback));
      if (source.trim()) url.searchParams.set('source', source.trim());
      if (start) url.searchParams.set('start', start);
      if (end) url.searchParams.set('end', end);
      const r = await apiFetch(url.toString());
      const j = await r.json();
      if (j.status === 'queued' && j.message) {
        const id = j.message as string;
        setTasks(prev => [{ id, status:'PENDING' }, ...prev]);
        pollTask(id, 3000);
      } else { setErrorBanner({ code: r.status, message: j.detail || 'Failed to queue' }); }
    } catch (e:any) { setErrorBanner({ code: 0, message: e?.message || 'Network error' }); }
  };

  const pollTask = useCallback(async (id: string, delayMs: number) => {
    if (!pollingEnabled) return;
    try {
      const r = await apiFetch(`/api/tasks/${encodeURIComponent(id)}`);
      if (r.status === 429) {
        const ra = parseInt(r.headers.get('Retry-After') || '15', 10) || 15;
        setTasks(prev => prev.map(t => t.id===id ? { ...t, nextDelay: ra*1000 } : t));
        setTimeout(()=> pollTask(id, Math.max(delayMs, ra*1000)), Math.max(delayMs, ra*1000));
        return;
      }
      const j = await r.json();
      setTasks(prev => prev.map(t => t.id===id ? { ...t, status: j.status, result: j.result, nextDelay: undefined } : t));
      if (j.status === 'PENDING' || j.status === 'STARTED') {
        const next = Math.min(30_000, Math.max(3_000, delayMs * 1.5));
        setTimeout(()=> pollTask(id, next), next);
      }
    } catch {
      const next = Math.min(30_000, Math.max(3_000, delayMs * 2));
      setTimeout(()=> pollTask(id, next), next);
    }
  }, [pollingEnabled]);

  const downloadJSON = (id:string) => {
    const row = tasks.find(t => t.id===id); if (!row?.result) return;
    const blob = new Blob([JSON.stringify(row.result, null, 2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${id}.json`; a.click();
  };
  const downloadCSV = (id:string) => {
    const row = tasks.find(t => t.id===id); if (!row?.result?.ohlcv) return;
    const lines = ['t,o,h,l,c,v', ...row.result.ohlcv.map((x:any)=> [x.t,x.o,x.h,x.l,x.c,x.v].join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'})); a.download = `${id}.csv`; a.click();
  };

  const ohlcToSeries = (row: TaskRow) => {
    const data = (row.result?.ohlcv || []).map((d:any)=> ({ time: new Date(d.t).toLocaleTimeString(), close: d.c }));
    return data;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold inline-flex items-center gap-2">System Tasks <HelpTip content="Trigger and monitor background jobs like data refreshes and price series fetches." /></h1>
        <div className="flex items-center gap-3">
          <Badge variant={pollingEnabled? 'secondary':'destructive'}>{pollingEnabled? 'Polling: ON':'Polling: OFF'}</Badge><HelpTip content="Background polling updates task statuses automatically. Toggle to pause." />
          <Button variant="outline" onClick={()=> setPollingEnabled(p=>!p)}>{pollingEnabled? 'Stop polling':'Start polling'}</Button>
        </div>
      </div>

      {errorBanner && (
        <Alert variant="destructive">
          <AlertTitle>{errorBanner.code ? `Error ${errorBanner.code}` : 'Error'}</AlertTitle>
          <AlertDescription>{errorBanner.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">Data Refresh <HelpTip content="Refreshes cached data for your account. Rate-limited per user (5/min)." /></CardTitle>
            <CardDescription>Per-user scoped cache refresh (limit 5/min). Adds entries to recent runs and activity feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Button onClick={()=> setConfirmOpen(true)} disabled={userCooldown>0 || userRefreshing}>{userRefreshing? 'Triggering…' : 'Trigger Data Refresh'}</Button>
              {userCooldown>0 && (<Badge variant="destructive">Cooldown {userCooldown}s</Badge>)}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium inline-flex items-center gap-2">Recent Runs <HelpTip content="Latest refresh attempts and outcomes for this session." /></div>
              <div className="space-y-1 text-sm">
                {recentRuns.length===0 && (<div className="text-muted-foreground">No recent runs</div>)}
                {recentRuns.map((r,i)=> (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-muted-foreground">{new Date(r.ts).toLocaleTimeString()}</span>
                    <Badge variant={r.type==='user'? 'secondary':'default'}>{r.type}</Badge>
                    <Badge variant={r.status==='triggered'? 'secondary':'destructive'}>{r.status}</Badge>
                    {r.detail && <span className="text-muted-foreground">{r.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">Global Data Refresh <HelpTip content="Admin-only fleet refresh with shared cooldown across all users." /></CardTitle>
            <CardDescription>Founder/Admin only. Shared 60s fleet cooldown. Avoid stacking triggers during cooldowns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={triggerGlobal} disabled={globalCooldown>0 || globalRefreshing}>{globalRefreshing? 'Triggering…' : 'Trigger Global Refresh'}</Button>
              {globalCooldown>0 && (<Badge variant="destructive">Cooldown {globalCooldown}s</Badge>)}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">Historical Price Series <HelpTip content="Queue OHLCV pulls for analysis; tasks appear below and auto-update until complete." /></CardTitle>
            <CardDescription>Queue OHLCV pulls; tasks will appear below and auto-track until completion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-6">
              <div className="md:col-span-1 space-y-1">
                <label className="text-xs inline-flex items-center gap-2">Symbol <HelpTip content="Asset symbol, e.g., BTC or BTC/USDT depending on the provider." /></label>
                <Input placeholder="Symbol (e.g. BTC)" value={coin} onChange={e=> setCoin(e.target.value)} />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="text-xs inline-flex items-center gap-2">Lookback days <HelpTip content={`History window length (1–${MAX_LOOKBACK_DAYS}).`} /></label>
                <Input placeholder="Lookback days" type="number" min={1} max={MAX_LOOKBACK_DAYS} value={lookback} onChange={e=> setLookback(Math.max(1, Math.min(MAX_LOOKBACK_DAYS, parseInt(e.target.value||'1',10))))} />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="text-xs inline-flex items-center gap-2">Interval <HelpTip content="Candle period, e.g., 1m, 5m, 15m, 1h, 4h, 1d." /></label>
                <Input placeholder="Interval (1m..1d)" value={interval} onChange={e=> setIntervalStr(e.target.value)} />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="text-xs inline-flex items-center gap-2">Source <HelpTip content="Optional data provider hint (leave blank for default)." /></label>
                <Input placeholder="Source (optional)" value={source} onChange={e=> setSource(e.target.value)} />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="text-xs inline-flex items-center gap-2">Start ISO <HelpTip content="Optional ISO8601 start timestamp to bound the range." /></label>
                <Input placeholder="Start ISO (optional)" value={start} onChange={e=> setStart(e.target.value)} />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="text-xs inline-flex items-center gap-2">End ISO <HelpTip content="Optional ISO8601 end timestamp to bound the range." /></label>
                <Input placeholder="End ISO (optional)" value={end} onChange={e=> setEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={requestSeries}>Request Series</Button>
              <HelpTip content="Queues a background job to fetch OHLCV; progress appears in Task Tracking." />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">Task Tracking <HelpTip content="Monitor queued jobs, status, and download results when completed." /></CardTitle>
          <CardDescription>Pending tasks poll every 3s with backoff to 30s. Downloads available on success.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left"><div className="inline-flex items-center gap-1">Task <HelpTip content="Background job identifier." /></div></th>
                  <th className="p-2 text-left"><div className="inline-flex items-center gap-1">Status <HelpTip content="Current job state: PENDING, STARTED, SUCCESS, FAILURE, REVOKED." /></div></th>
                  <th className="p-2 text-left"><div className="inline-flex items-center gap-1">Preview <HelpTip content="Quick chart of fetched series when available." /></div></th>
                  <th className="p-2 text-right"><div className="inline-flex items-center gap-1">Actions <HelpTip content="Download job output as JSON or CSV when completed." /></div></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t)=> (
                  <tr key={t.id} className="border-t align-top">
                    <td className="p-2">{t.id}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={t.status==='SUCCESS'? 'secondary' : t.status==='PENDING' || t.status==='STARTED' ? 'secondary' : 'destructive'}>{t.status}</Badge>
                        {t.nextDelay && <span className="text-xs text-muted-foreground">retry in {Math.round((t.nextDelay)/1000)}s</span>}
                      </div>
                    </td>
                    <td className="p-2 w-[360px]">
                      {t.status==='SUCCESS' && t.result?.ohlcv && (
                        <ChartContainer config={{ close: { label:'Close', color: 'hsl(var(--primary))' } }}>
                          <AreaChart data={ohlcToSeries(t)}>
                            <defs>
                              <linearGradient id={`fillClose-${t.id}`} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" hide />
                            <YAxis hide />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="close" stroke="hsl(var(--primary))" fillOpacity={1} fill={`url(#fillClose-${t.id})`} dot={false} />
                          </AreaChart>
                        </ChartContainer>
                      )}
                    </td>
                    <td className="p-2 text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={()=> downloadJSON(t.id)} disabled={t.status!=='SUCCESS'}>JSON</Button>
                      <Button variant="outline" size="sm" onClick={()=> downloadCSV(t.id)} disabled={t.status!=='SUCCESS'}>CSV</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length===0 && (<div className="text-center text-muted-foreground text-sm py-6">No tasks yet</div>)}
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">Confirm Data Refresh <HelpTip content="Confirms a per-user cache refresh request; subject to rate limits." /></DialogTitle>
            <DialogDescription>Per-user limit is 5 requests per minute. Continue?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setConfirmOpen(false)} disabled={userRefreshing}>Cancel</Button>
            <Button onClick={triggerUser} disabled={userRefreshing || userCooldown>0}>Trigger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
