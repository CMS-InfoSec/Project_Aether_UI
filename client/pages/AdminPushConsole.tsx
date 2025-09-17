import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminPushConsole(){
  const [status,setStatus]=useState<any|null>(null);
  const [token,setToken]=useState('token1\ntoken2');
  const [title,setTitle]=useState('Aether Notice');
  const [body,setBody]=useState('Body...');
  const [url,setUrl]=useState('https://aether.app');
  const [timestamp,setTimestamp]=useState(new Date().toISOString());
  const [nonce,setNonce]=useState(1001);
  const [error,setError]=useState<string|null>(null);

  const load=async()=>{const r=await fetch('/api/mobile/status');const j=await r.json();setStatus(j.data);setNonce((j.data?.last_nonce||1000)+1);};
  useEffect(()=>{load();},[]);

  const send=async()=>{
    setError(null);
    try{
      const tokens = token.split(/\n+/).filter(Boolean);
      const r=await fetch('/api/mobile/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ token: tokens, title, body, url, timestamp, nonce })});
      const j=await r.json();
      if(!r.ok) throw new Error(j.errors? JSON.stringify(j.errors): (j.detail||'Failed'));
      load();
    }catch(e:any){ setError(e.message||'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Mobile Push Console</h1><Button variant="outline" onClick={load}>Refresh Status</Button></div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>Status</CardTitle></CardHeader>
        <CardContent>
          {status ? (
            <div className="text-sm">Ready: {String(status.ready)} • Queue: {status.queue_depth} • Last nonce: {status.last_nonce}</div>
          ) : 'Loading...'}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Send Push</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Tokens (one per line)" value={token} onChange={e=>setToken(e.target.value)} />
          <Input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <Input placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} />
          <Input placeholder="URL" value={url} onChange={e=>setUrl(e.target.value)} />
          <Input placeholder="Timestamp" value={timestamp} onChange={e=>setTimestamp(e.target.value)} />
          <Input placeholder="Nonce" type="number" value={nonce} onChange={e=>setNonce(parseInt(e.target.value)||0)} />
          <Button onClick={send}>Send</Button>
        </CardContent>
      </Card>
    </div>
  );
}
