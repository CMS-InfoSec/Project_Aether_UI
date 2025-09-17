import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminAutomationSocial(){
  const [source,setSource]=useState('twitter');
  const [priority,setPriority]=useState('standard');
  const [timestamp,setTimestamp]=useState(new Date().toISOString());
  const [nonce,setNonce]=useState(crypto.randomUUID());
  const [posts,setPosts]=useState('[{"external_id":"abc","author":"@user","content":"...","captured_at":"'+new Date().toISOString()+'"}]');
  const [result,setResult]=useState<any|null>(null);
  const [error,setError]=useState<string|null>(null);

  const submit=async()=>{
    setError(null); setResult(null);
    try{
      const body={ source, priority, timestamp, nonce, posts: JSON.parse(posts) };
      const r=await fetch('/api/automation/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json();
      if(!r.ok) throw new Error(j.detail||'Failed');
      setResult(j.data);
    }catch(e:any){ setError(e.message||'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Automation Social Ingest</h1><Button variant="outline" onClick={()=>setTimestamp(new Date().toISOString())}>Now</Button></div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>Compose Request</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Source" value={source} onChange={e=>setSource(e.target.value)} />
          <Input placeholder="Priority" value={priority} onChange={e=>setPriority(e.target.value)} />
          <Input placeholder="Timestamp" value={timestamp} onChange={e=>setTimestamp(e.target.value)} />
          <Input placeholder="Nonce" value={nonce} onChange={e=>setNonce(e.target.value)} />
          <Textarea rows={6} value={posts} onChange={e=>setPosts(e.target.value)} />
          <Button onClick={submit}>Submit</Button>
          {result && <div className="text-sm">Processed posts: {result.processed} (request {result.request_id})</div>}
        </CardContent>
      </Card>
    </div>
  );
}
