import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminStrategyReview(){
  const [items,setItems]=useState<any[]>([]);
  const [search,setSearch]=useState('');
  const [sel,setSel]=useState<any|null>(null);
  const [error,setError]=useState<string|null>(null);
  const load=async()=>{setError(null);try{const r=await fetch(`/api/strategy-review/strategies/pending?search=${encodeURIComponent(search)}`);const j=await r.json();setItems(j.data.items);}catch(e:any){setError(e.message||'Failed');}};
  useEffect(()=>{load();},[]);
  const approve=async()=>{if(!sel)return;const r=await fetch(`/api/strategy-review/strategies/${sel.strategy_id}/approve`,{method:'POST'});const j=await r.json();if(r.ok){setSel(null);load();}else{alert(j.detail||'Failed');}}
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Strategy Review</h1><Button variant="outline" onClick={load}>Refresh</Button></div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>Pending Strategies</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-3"><Input placeholder="Search name" value={search} onChange={e=>setSearch(e.target.value)} /><Button onClick={load}>Filter</Button></div>
          <div className="overflow-auto">
            <table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Submitter</th><th className="p-2 text-left">Metrics</th><th className="p-2"></th></tr></thead>
            <tbody>{items.map((it:any)=>(
              <tr key={it.strategy_id} className="border-t">
                <td className="p-2">{it.name}</td>
                <td className="p-2">{it.submitter?.name} <span className="text-xs text-muted-foreground">({it.submitter?.role})</span></td>
                <td className="p-2">Sharpe {it.metrics?.sharpe} • Win {it.metrics?.win_rate}% • Avg {it.metrics?.avg_return}</td>
                <td className="p-2 text-right"><Button size="sm" onClick={()=>setSel(it)}>Approve</Button></td>
              </tr>
            ))}</tbody></table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!sel} onOpenChange={()=>setSel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Strategy</DialogTitle><DialogDescription>Confirm approval for {sel?.name}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setSel(null)}>Cancel</Button>
            <Button onClick={approve}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
