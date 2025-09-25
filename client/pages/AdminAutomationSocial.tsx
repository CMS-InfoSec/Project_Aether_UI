import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import apiFetch from '@/lib/apiClient';

interface PostItem { external_id: string; author: string; content: string; captured_at: string; }

export default function AdminAutomationSocial(){
  const { toast } = useToast();

  // Form state
  const [source, setSource] = useState('twitter');
  const [priority, setPriority] = useState('standard');
  const [timestamp, setTimestamp] = useState(new Date().toISOString());
  const [nonce, setNonce] = useState(crypto.randomUUID());
  const [posts, setPosts] = useState<PostItem[]>([{
    external_id: 'abc', author: '@user', content: 'Example post', captured_at: new Date().toISOString()
  }]);

  // Limits
  const [limits, setLimits] = useState<{ used:number; max:number; window:number; retry_after?:number }|null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Signing
  const [sigOpen, setSigOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [sigExpiresAt, setSigExpiresAt] = useState<number | null>(null);
  const lastSignStringRef = useRef<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ processed:number; request_id:string } | null>(null);
  const [errorBanner, setErrorBanner] = useState<{ code:number; message:string } | null>(null);

  const payload = useMemo(() => ({ source, priority, timestamp, nonce, posts }), [source, priority, timestamp, nonce, posts]);
  const payloadString = useMemo(() => JSON.stringify(payload), [payload]);

  const fieldsValid = useMemo(() => {
    if (!source.trim() || !priority.trim()) return false;
    if (!timestamp || isNaN(Date.parse(timestamp))) return false;
    if (!nonce.trim()) return false;
    if (!Array.isArray(posts) || posts.length === 0) return false;
    for (const p of posts) {
      if (!p.external_id?.trim() || !p.author?.trim() || !p.content?.trim()) return false;
      if (!p.captured_at || isNaN(Date.parse(p.captured_at))) return false;
    }
    return true;
  }, [source, priority, timestamp, nonce, posts]);

  const signatureValid = useMemo(() => {
    if (!signature || !sigExpiresAt) return false;
    if (Date.now() > sigExpiresAt) return false;
    return true;
  }, [signature, sigExpiresAt]);

  // Invalidate signature when inputs change
  useEffect(() => {
    const str = `${timestamp}\n${nonce}\n${payloadString}`;
    if (lastSignStringRef.current && lastSignStringRef.current !== str) {
      setSignature(null); setSigExpiresAt(null);
    }
  }, [timestamp, nonce, payloadString]);

  const fetchLimits = useCallback(async () => {
    try {
      const r = await apiFetch('/api/automation/limits/me');
      const j = await r.json();
      const per = j?.data?.per_user;
      if (per) setLimits(per);
      if (per?.retry_after && per.retry_after > 0) setCooldown(per.retry_after);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function hmacSHA256Hex(message: string, key: string): Promise<string> {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
    const bytes = new Uint8Array(mac);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const generateSignature = useCallback(async () => {
    setErrorBanner(null);
    if (!secret) { toast({ title:'Missing secret', description:'Enter a shared secret', variant:'destructive' }); return; }
    const signString = `${timestamp}\n${nonce}\n${payloadString}`;
    const sig = await hmacSHA256Hex(signString, secret);
    setSignature(sig);
    setSigExpiresAt(Date.now() + 5 * 60 * 1000);
    lastSignStringRef.current = signString;
    setSigOpen(false);
    toast({ title:'Signature generated', description:'Valid for ~5 minutes' });
  }, [secret, timestamp, nonce, payloadString, toast]);

  const addPost = () => {
    setPosts(prev => [...prev, { external_id: '', author: '', content: '', captured_at: new Date().toISOString() }]);
  };
  const removePost = (idx:number) => { setPosts(prev => prev.filter((_,i)=> i!==idx)); };
  const updatePost = (idx:number, key: keyof PostItem, value: string) => {
    setPosts(prev => prev.map((p,i)=> i===idx ? { ...p, [key]: value } : p));
  };

  const submit = async () => {
    setErrorBanner(null); setResult(null); setSubmitting(true);
    try {
      const r = await apiFetch('/api/automation/social', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'X-Signature': signature || '', 'X-Timestamp': timestamp, 'X-Nonce': nonce }, body: payloadString
      });
      const j = await r.json().catch(()=>({}));
      if (r.status === 401) { setErrorBanner({ code: 401, message: j.detail || 'Signature required' }); return; }
      if (r.status === 429) {
        const ra = parseInt(r.headers.get('Retry-After') || '0', 10) || j.retry_after || 0;
        setCooldown(ra);
        setErrorBanner({ code: 429, message: 'Rate limited. Please wait.' });
        return;
      }
      if (r.status === 502) { setErrorBanner({ code: 502, message: j.detail || 'Upstream error' }); return; }
      if (!r.ok) { setErrorBanner({ code: r.status, message: j.detail || 'Request failed' }); return; }
      setResult(j.data);
      toast({ title:'Batch processed', description:`Processed ${j.data?.processed || 0} posts` });
      // Reset for next batch
      setNonce(crypto.randomUUID());
      setPosts([{ external_id: '', author: '', content: '', captured_at: new Date().toISOString() }]);
      setSignature(null); setSigExpiresAt(null);
      await fetchLimits();
    } catch (e:any) {
      setErrorBanner({ code: 0, message: e?.message || 'Network error' });
    } finally { setSubmitting(false); }
  };

  const ctaDisabled = submitting || cooldown > 0 || !fieldsValid || !signatureValid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automation Social Ingest</h1>
          <p className="text-muted-foreground">Compose and dispatch signed automation batches. HMAC required.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={()=> setTimestamp(new Date().toISOString())}>Now</Button>
          <Badge variant={cooldown>0? 'destructive':'secondary'}>{limits? `Usage: ${limits.used}/${limits.max}` : 'Loading limits…'}{cooldown>0? ` • Retry in ${cooldown}s` : ''}</Badge>
        </div>
      </div>

      {errorBanner && (
        <Alert variant={errorBanner.code===0? 'destructive':'destructive'}>
          <AlertTitle>{errorBanner.code ? `Error ${errorBanner.code}` : 'Error'}</AlertTitle>
          <AlertDescription>{errorBanner.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compose Request</CardTitle>
          <CardDescription>Fill in required fields. The JSON preview updates live and must be valid before sending.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm block mb-1">Source</label>
              <Input value={source} onChange={(e)=> setSource(e.target.value)} disabled={submitting} />
            </div>
            <div>
              <label className="text-sm block mb-1">Priority</label>
              <Input value={priority} onChange={(e)=> setPriority(e.target.value)} disabled={submitting} />
            </div>
            <div>
              <label className="text-sm block mb-1">Timestamp (ISO)</label>
              <Input value={timestamp} onChange={(e)=> setTimestamp(e.target.value)} disabled={submitting} />
            </div>
            <div>
              <label className="text-sm block mb-1">Nonce (UUID)</label>
              <Input value={nonce} onChange={(e)=> setNonce(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Posts</div>
              <Button variant="outline" size="sm" onClick={addPost} disabled={submitting}>Add Post</Button>
            </div>
            <div className="space-y-3">
              {posts.map((p,idx)=> (
                <div key={idx} className="grid gap-2 md:grid-cols-5 p-3 border rounded-md">
                  <Input placeholder="External ID" value={p.external_id} onChange={(e)=> updatePost(idx,'external_id', e.target.value)} disabled={submitting} />
                  <Input placeholder="Author" value={p.author} onChange={(e)=> updatePost(idx,'author', e.target.value)} disabled={submitting} />
                  <Input placeholder="Captured At (ISO)" value={p.captured_at} onChange={(e)=> updatePost(idx,'captured_at', e.target.value)} disabled={submitting} />
                  <Input placeholder="Content" value={p.content} onChange={(e)=> updatePost(idx,'content', e.target.value)} disabled={submitting} />
                  <div className="flex items-center justify-end">
                    <Button variant="outline" size="sm" onClick={()=> removePost(idx)} disabled={submitting}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">JSON Preview</div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant={fieldsValid? 'secondary':'destructive'}>{fieldsValid? 'Valid' : 'Invalid'}</Badge>
                <Badge variant={signatureValid? 'secondary':'destructive'}>{signatureValid? 'Signature ready' : 'No/expired signature'}</Badge>
              </div>
            </div>
            <Textarea value={JSON.stringify(payload, null, 2)} readOnly rows={8} />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Signature expires 5 minutes after generation. Changing inputs invalidates it.</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={()=> setSigOpen(true)} disabled={submitting}>Generate Signature</Button>
              <Button onClick={submit} disabled={ctaDisabled}>{submitting? 'Submitting…' : 'Submit Batch'}</Button>
            </div>
          </div>

          {result && (
            <div className="text-sm p-3 border rounded-md">Processed posts: {result.processed} (request {result.request_id})</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={sigOpen} onOpenChange={setSigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Signature</DialogTitle>
            <DialogDescription>Compute HMAC-SHA256 over: timestamp + "\\n" + nonce + "\\n" + body</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm">Shared Secret</label>
            <Input type="password" value={secret} onChange={(e)=> setSecret(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setSigOpen(false)}>Cancel</Button>
            <Button onClick={generateSignature}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
