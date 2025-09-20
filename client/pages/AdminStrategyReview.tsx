import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';

interface StrategyItem {
  strategy_id: string;
  name: string;
  submitter: { id: string; name: string; role: string };
  metrics: { sharpe: number; win_rate: number; avg_return: number };
  submitted_at: string;
}

interface PendingResponse {
  status: 'success' | 'error';
  data: {
    items: StrategyItem[];
    total: number;
    limit: number;
    offset: number;
    next_offset: number | null;
    supabase_degraded?: boolean;
  };
  detail?: string;
}

export default function AdminStrategyReview(){
  const { toast } = useToast();
  const [items, setItems] = useState<StrategyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number|null>(null);

  const [search, setSearch] = useState('');
  const [submitter, setSubmitter] = useState<string>('');
  const [sort, setSort] = useState<'name'|'sharpe'|'win_rate'|'avg_return'|'submitted_at'>('name');
  const [dir, setDir] = useState<'asc'|'desc'>('asc');
  const [minSharpe, setMinSharpe] = useState<string>('');
  const [minWin, setMinWin] = useState<string>('');
  const [minAvg, setMinAvg] = useState<string>('');

  const [sel, setSel] = useState<StrategyItem|null>(null);
  const [ack, setAck] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const [supabaseDegraded, setSupabaseDegraded] = useState(false);
  const [errorBanner, setErrorBanner] = useState<{code:number; message:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<StrategyItem|null>(null);

  const submitterOptions = useMemo(()=>{
    const set = new Map<string,string>();
    items.forEach(i=>{ set.set(i.submitter.id, `${i.submitter.name} (${i.submitter.id})`); });
    return Array.from(set.entries());
  },[items]);

  const buildQuery = useCallback((off:number)=>{
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(off));
    if (search.trim()) params.set('search', search.trim());
    if (submitter) params.set('submitter', submitter);
    if (minSharpe) params.set('min_sharpe', minSharpe);
    if (minWin) params.set('min_win_rate', minWin);
    if (minAvg) params.set('min_avg_return', minAvg);
    params.set('sort', sort);
    params.set('dir', dir);
    return params.toString();
  },[limit, search, submitter, minSharpe, minWin, minAvg, sort, dir]);

  const fetchPage = useCallback(async (off:number, mode: 'replace'|'append' = 'replace')=>{
    setLoading(true); setErrorBanner(null);
    try {
      const qs = buildQuery(off);
      const r = await fetch(`/api/strategy-review/strategies/pending?${qs}`);
      const degradedHeader = (r.headers.get('X-Supabase-Degraded')||'').toLowerCase() === 'true';
      if (!r.ok) {
        const j = await r.json().catch(()=>({ detail:`HTTP ${r.status}` }));
        setSupabaseDegraded(degradedHeader);
        setErrorBanner({ code: r.status, message: j.detail || r.statusText || 'Request failed' });
        return;
      }
      const j = await r.json() as PendingResponse;
      setSupabaseDegraded(Boolean(j?.data?.supabase_degraded) || degradedHeader);
      if (mode === 'replace') setItems(j.data.items); else setItems(prev => [...prev, ...j.data.items]);
      setTotal(j.data.total);
      setLimit(j.data.limit);
      setOffset(j.data.offset);
      setNextOffset(j.data.next_offset);
    } catch (e:any) {
      setErrorBanner({ code: 0, message: e?.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  },[buildQuery]);

  const reload = useCallback(()=> fetchPage(0,'replace'), [fetchPage]);
  const loadMore = useCallback(()=> { if (nextOffset!==null) fetchPage(nextOffset,'append'); }, [fetchPage, nextOffset]);

  useEffect(()=>{ reload(); },[]);

  const approve = useCallback(async()=>{
    if (!sel) return; if (!ack) { toast({ title:'Acknowledgement required', description:'Confirm the approval action', variant:'destructive' }); return; }
    setIsApproving(true);
    try {
      const r = await fetch(`/api/strategy-review/strategies/${encodeURIComponent(sel.strategy_id)}/approve`, { method:'POST', headers:{ 'X-Request-ID': `req_${Date.now()}` } });
      const j = await r.json().catch(()=>({}));
      if (r.ok || r.status === 503) {
        setItems(prev => prev.filter(it => it.strategy_id !== sel.strategy_id));
        setTotal(t=> Math.max(0, t-1));
        setSel(null); setAck(false);
        const auditId = j?.data?.audit_entry_id;
        toast({ title: r.status === 503 ? 'Approved (degraded)' : 'Strategy approved', description: auditId ? `Audit ${auditId}` : undefined, action: (
          <a href={auditId ? `/audit?ref=${encodeURIComponent(auditId)}` : '/audit'} className="underline text-xs">View audit</a>
        ) as any });
      } else {
        const msg = j.detail || j.message || 'Approval failed';
        toast({ title:'Approval failed', description: msg, variant:'destructive' });
      }
    } catch (e:any) {
      toast({ title:'Approval error', description: e?.message || 'Failed', variant:'destructive' });
    } finally { setIsApproving(false); }
  },[sel, ack, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Strategy Review</h1>
        <div className="flex items-center gap-2">
          <Select value={String(limit)} onValueChange={(v)=>{ setLimit(parseInt(v,10)); setOffset(0); fetchPage(0,'replace'); }}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Page size" /></SelectTrigger>
            <SelectContent>
              {[10,25,50].map(sz=> (<SelectItem key={sz} value={String(sz)}>{sz} / page</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={reload} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {errorBanner && (
        <Alert variant="destructive">
          <AlertTitle>{errorBanner.code ? `Error ${errorBanner.code}` : 'Error'}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{errorBanner.message}</span>
            <Button size="sm" variant="outline" onClick={reload}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {supabaseDegraded && (
        <Alert>
          <AlertTitle>Degraded mode</AlertTitle>
          <AlertDescription>
            Supabase unavailable. Showing in-memory data. Approvals will be applied in-memory and persisted later.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending Strategies</CardTitle>
          <CardDescription>Review and approve pending strategies. Sorting and filters are applied server-side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="md:col-span-2 flex gap-2">
              <Input placeholder="Search name" value={search} onChange={e=>setSearch(e.target.value)} />
              <Button onClick={()=>{ setOffset(0); fetchPage(0,'replace'); }} disabled={loading}>Filter</Button>
            </div>
            <div>
              <Select value={submitter} onValueChange={(v)=>{ setSubmitter(v === '__all__' ? '' : v); setOffset(0); fetchPage(0,'replace'); }}>
                <SelectTrigger><SelectValue placeholder="Submitter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Submitters</SelectItem>
                  {submitterOptions.map(([id,label])=> (<SelectItem key={id} value={id}>{label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="min Sharpe" value={minSharpe} onChange={e=>setMinSharpe(e.target.value)} />
              <Input placeholder="min Win%" value={minWin} onChange={e=>setMinWin(e.target.value)} />
              <Input placeholder="min Avg Ret" value={minAvg} onChange={e=>setMinAvg(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={(v:any)=>{ setSort(v); setOffset(0); fetchPage(0,'replace'); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort: Name</SelectItem>
                  <SelectItem value="submitted_at">Sort: Submitted</SelectItem>
                  <SelectItem value="sharpe">Sort: Sharpe</SelectItem>
                  <SelectItem value="win_rate">Sort: Win Rate</SelectItem>
                  <SelectItem value="avg_return">Sort: Avg Return</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dir} onValueChange={(v:any)=>{ setDir(v); setOffset(0); fetchPage(0,'replace'); }}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead>KPIs</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it)=> (
                <TableRow key={it.strategy_id}>
                  <TableCell>
                    <button className="text-primary hover:underline" onClick={()=> setDetail(it)}>{it.name}</button>
                  </TableCell>
                  <TableCell>
                    <a href={`/audit?query=submitter:${encodeURIComponent(it.submitter.id)}`} className="inline-flex items-center gap-2">
                      <Badge variant="secondary">{it.submitter.role}</Badge>
                      <span className="text-sm">{it.submitter.name}</span>
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Badge>Sharpe {Number(it.metrics.sharpe).toFixed(2)}</Badge>
                      <Badge>Win {Number(it.metrics.win_rate).toFixed(1)}%</Badge>
                      <Badge>Avg {Number(it.metrics.avg_return).toFixed(3)}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(it.submitted_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={()=>{ setSel(it); setAck(false); }}>Approve</Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pending strategies. See <a className="underline" href="/audit">Audit & Logs</a> for history.</TableCell></TableRow>
              )}
              {loading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-3">
            <div className="text-xs text-muted-foreground">Showing {items.length} of {total}</div>
            <div className="flex items-center gap-2">
              {nextOffset !== null && (
                <Button variant="outline" onClick={loadMore} disabled={loading}>Load more</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!sel} onOpenChange={(o)=>{ if(!o){ setSel(null); setAck(false);} }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Strategy</DialogTitle>
            <DialogDescription>Confirm approval for {sel?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Checkbox id="ack" checked={ack} onCheckedChange={(v)=> setAck(Boolean(v))} />
            <Label htmlFor="ack" className="text-sm">I understand this action will approve and activate the strategy. Create an audit record.</Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{ setSel(null); setAck(false); }} disabled={isApproving}>Cancel</Button>
            <Button onClick={approve} disabled={isApproving || !ack}>{isApproving? 'Approving…':'Approve'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={!!detail} onOpenChange={(o)=>{ if(!o) setDetail(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{detail?.name}</DrawerTitle>
            <DrawerDescription>Submitted {detail ? new Date(detail.submitted_at).toLocaleString() : ''}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-3">
            {detail && (
              <div className="text-sm">
                <div><span className="text-muted-foreground">Strategy ID:</span> {detail.strategy_id}</div>
                <div><span className="text-muted-foreground">Submitter:</span> {detail.submitter.name} ({detail.submitter.id}) • {detail.submitter.role}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge>Sharpe {Number(detail.metrics.sharpe).toFixed(2)}</Badge>
                  <Badge>Win {Number(detail.metrics.win_rate).toFixed(1)}%</Badge>
                  <Badge>Avg {Number(detail.metrics.avg_return).toFixed(3)}</Badge>
                </div>
              </div>
            )}
          </div>
          <DrawerFooter>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={()=> setDetail(null)}>Close</Button>
              {detail && <Button onClick={()=>{ setSel(detail); setAck(false); }}>Approve</Button>}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
