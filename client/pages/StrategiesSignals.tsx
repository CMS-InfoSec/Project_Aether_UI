import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

export default function StrategiesSignals() {
  const [registry, setRegistry] = useState<any[]>([]);
  const [asset, setAsset] = useState('BTC');
  const [sentiment, setSentiment] = useState<any | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [social, setSocial] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRegistry = async () => {
    setError(null);
    try {
      const r = await fetch('/api/strategies/flags');
      const j = await r.json();
      setRegistry(j.data || []);
    } catch (e:any) { setError(e.message); }
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

  useEffect(()=>{ loadRegistry(); }, []);

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

        <TabsContent value="ingest">
          <Card>
            <CardHeader><CardTitle>Manual Signal Ingest</CardTitle></CardHeader>
            <CardContent className="space-y-3">
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
