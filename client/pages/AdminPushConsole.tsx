import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiFetch from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

export default function AdminPushConsole(){
  const [status,setStatus]=useState<any|null>(null);
  const [token,setToken]=useState('token1\ntoken2');
  const [title,setTitle]=useState('Aether Notice');
  const [body,setBody]=useState('Body...');
  const [url,setUrl]=useState('https://aether.app');
  const [timestamp,setTimestamp]=useState(new Date().toISOString());
  const [nonce,setNonce]=useState(1001);
  const [error,setError]=useState<string|null>(null);
  const [signature,setSignature]=useState<string>('');
  const [cooldown,setCooldown]=useState<number>(0);
  const [sentNonces,setSentNonces]=useState<Set<number>>(new Set());

  useEffect(()=>{
    let t: any; if (cooldown>0){ t=setTimeout(()=> setCooldown(cooldown-1), 1000); } return ()=> t && clearTimeout(t);
  },[cooldown]);

  const load=async()=>{const r=await apiFetch('/api/mobile/status');const j=await r.json();setStatus(j.data);setNonce((j.data?.last_nonce||1000)+1);};
  useEffect(()=>{load();},[]);

  const generateSignature = async (secret: string, payload: any) => {
    const enc = new TextEncoder();
    const body = JSON.stringify(payload);
    const canonical = `${timestamp}\n${nonce}\n${body}`;
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(canonical));
    const hex = Array.from(new Uint8Array(sig)).map(b=> b.toString(16).padStart(2,'0')).join('');
    setSignature(hex);
    return hex;
  };

  const send=async()=>{
    setError(null);
    try{
      if (!status) { await load(); }
      const tokens = token.split(/\n+/).filter(Boolean);
      const hostOk = (()=>{ try{ const h = new URL(url).hostname; return (status?.allowed_hosts||[]).includes(h);}catch{return false;} })();
      if (!hostOk){ setError(`URL host not allowed. Allowed: ${(status?.allowed_hosts||[]).join(', ')}`); return; }
      if (typeof nonce !== 'number' || nonce <= (status?.last_nonce||0) || sentNonces.has(nonce)) { setError('Invalid or duplicate nonce'); return; }
      const payload = { token: tokens, title, body, url, timestamp, nonce };
      let headers: Record<string,string> = { 'Content-Type':'application/json' };
      if (signature){ headers['X-Signature'] = signature; headers['X-Timestamp'] = timestamp; headers['X-Nonce'] = String(nonce); }
      const r=await apiFetch('/api/mobile/push',{method:'POST',headers,body:JSON.stringify(payload)});
      if (r.status === 429){ const ra = Number(r.headers.get('Retry-After')||'60'); setCooldown(isNaN(ra)?60:ra); throw new Error('Throttled. Please wait.'); }
      const j=await r.json();
      if(!r.ok) throw new Error(j.errors? JSON.stringify(j.errors): (j.detail||'Failed'));
      setSentNonces(prev=> new Set(prev).add(nonce));
      toast({ title:'Queued', description:`Processed tokens: ${j.data?.queued || 0}` });
      await load();
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
            <div className="text-sm">Ready: {String(status.ready)} • Queue: {status.queue_depth} • Last nonce: {status.last_nonce} • Allowed hosts: {(status.allowed_hosts||[]).join(', ')}</div>
          ) : 'Loading...'}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Send Push</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>Tokens (one per line)</Label>
          <Input placeholder="Tokens (one per line)" value={token} onChange={e=>setToken(e.target.value)} />
          <Label>Title</Label>
          <Input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <Label>Body</Label>
          <Input placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} />
          <Label>URL</Label>
          <Input placeholder="URL" value={url} onChange={e=>setUrl(e.target.value)} />
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <Label>Timestamp</Label>
              <Input placeholder="Timestamp" value={timestamp} onChange={e=>setTimestamp(e.target.value)} />
            </div>
            <div>
              <Label>Nonce</Label>
              <Input placeholder="Nonce" type="number" value={nonce} onChange={e=>setNonce(parseInt(e.target.value)||0)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Generate Signature</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Signature</DialogTitle>
                  <DialogDescription>Enter the shared secret to compute HMAC-SHA256 over timestamp+nonce+body.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="secret">Shared Secret</Label>
                  <Input id="secret" type="password" />
                </div>
                <DialogFooter>
                  <Button onClick={async ()=>{
                    const secret = (document.getElementById('secret') as HTMLInputElement)?.value || '';
                    if (!secret) { toast({ title:'Missing secret', description:'Enter a shared secret', variant:'destructive' }); return; }
                    const tokens = token.split(/\n+/).filter(Boolean);
                    const payload = { token: tokens, title, body, url, timestamp, nonce };
                    await generateSignature(secret, payload);
                    (document.querySelector('[data-radix-dialog-close]') as HTMLElement)?.click();
                  }}>Compute</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {signature && <span className="text-xs break-all">Sig: {signature.substring(0,24)}…</span>}
            <Button variant="ghost" onClick={()=> setSignature('')}>Clear Sig</Button>
          </div>

          <Button onClick={send} disabled={cooldown>0}>{cooldown>0? `Retry in ${cooldown}s` : 'Send'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
