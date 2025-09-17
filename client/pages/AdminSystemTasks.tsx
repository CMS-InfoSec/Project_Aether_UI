import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminSystemTasks(){
  const [tasks,setTasks]=useState<{id:string;status:string;result?:any}[]>([]);
  const [coin,setCoin]=useState('BTC');
  const [interval,setIntervalStr]=useState('1h');
  const [lookback,setLookback]=useState(7);
  const [error,setError]=useState<string|null>(null);

  const triggerUser=async()=>{await fetch('/api/tasks/data-refresh',{method:'POST'});};
  const triggerGlobal=async()=>{await fetch('/api/data/refresh',{method:'POST'});};
  const requestSeries=async()=>{
    setError(null);
    try{
      const r=await fetch(`/api/data/price-series?coin=${coin}&interval=${interval}&lookback=${lookback}`);
      const j=await r.json();
      if(j.status==='queued'){
        const id=j.message;
        setTasks(t=>[{id, status:'PENDING'}, ...t]);
        poll(id);
      }
    }catch(e:any){ setError(e.message||'Failed'); }
  };
  const poll=async(id:string)=>{
    const r=await fetch(`/api/tasks/${id}`); const j=await r.json();
    setTasks(t=>t.map(x=> x.id===id? { id, status:j.status, result:j.result }: x));
    if(j.status==='PENDING' || j.status==='STARTED') setTimeout(()=>poll(id), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">System Tasks</h1><Button variant="outline" onClick={()=>{}}>Refresh</Button></div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Data Refresh</CardTitle></CardHeader>
          <CardContent className="space-x-2">
            <Button onClick={triggerUser}>Run data refresh</Button>
            <Button variant="outline" onClick={triggerGlobal}>Global refresh</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Historical Price Series</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Coin" value={coin} onChange={e=>setCoin(e.target.value)} />
            <Input placeholder="Interval" value={interval} onChange={e=>setIntervalStr(e.target.value)} />
            <Input placeholder="Lookback days" type="number" value={lookback} onChange={e=>setLookback(parseInt(e.target.value)||1)} />
            <Button onClick={requestSeries}>Request</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Requested Series</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Task</th><th className="p-2 text-left">Status</th></tr></thead>
            <tbody>{tasks.map(t=> (
              <tr key={t.id} className="border-t"><td className="p-2">{t.id}</td><td className="p-2">{t.status}</td></tr>
            ))}</tbody></table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
