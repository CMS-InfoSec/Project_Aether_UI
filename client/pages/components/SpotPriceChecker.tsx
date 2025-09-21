import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import apiFetch from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function SpotPriceChecker(){
  const [symbol,setSymbol]=useState('BTC/USDT');
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<{price:number;ts:string}|null>(null);
  const [auto,setAuto]=useState(false);
  const [killWarn,setKillWarn]=useState<string|null>(null);
  const timer=useRef<number|undefined>();

  const validate=(s:string)=>{
    const t=s.trim().toUpperCase();
    if (!t || t.length>20 || !/^[A-Z0-9]+\/[A-Z0-9]+$/.test(t)) return 'invalid symbol';
    return null;
  };

  const check=async()=>{
    setKillWarn(null);
    const v=validate(symbol);
    if (v){ setError(v); setAuto(false); return; }
    setError(null); setLoading(true);
    try{
      const r=await apiFetch(`/api/markets/price?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`);
      if (r.status===400){ const j=await r.json(); setError(j.detail?.message||'invalid'); setAuto(false); return; }
      if (r.status===503){ const j=await r.json().catch(()=>({message:'trading disabled'})); setKillWarn(j.message||'trading disabled'); setAuto(false); return; }
      if (!r.ok) throw new Error('fetch failed');
      const j=await r.json(); setResult({ price:j.price, ts:j.ts });
    }catch{ /* toast handled by parent patterns */ }
    finally{ setLoading(false); }
  };

  useEffect(()=>{
    if (auto && !error && !killWarn){
      timer.current = window.setInterval(check, 15000);
      return ()=>{ if (timer.current) window.clearInterval(timer.current); };
    }
  },[auto, error, killWarn]);

  return (
    <div className="space-y-3">
      {killWarn && (
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{killWarn}</AlertDescription></Alert>
      )}
      <div className="grid gap-2 md:grid-cols-3 items-end">
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Symbol</label>
          <Input value={symbol} onChange={(e)=>{ setSymbol(e.target.value.toUpperCase()); if (error) setError(null); }} placeholder="BTC/USDT" disabled={loading} />
          {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={check} disabled={loading}>{loading? <><RefreshCw className="h-4 w-4 mr-2 animate-spin"/>Checking…</>: 'Check Price'}</Button>
          <div className="flex items-center space-x-2 text-sm"><Switch checked={auto} onCheckedChange={(v)=> setAuto(v)} disabled={loading} /><span>Auto‑refresh every 15s</span></div>
        </div>
      </div>
      {result && (
        <div className="text-sm">Latest: <span className="font-mono">{result.price}</span> • Checked at {new Date(result.ts).toLocaleTimeString()} <Button variant="link" className="px-2" onClick={check}>Refresh now</Button></div>
      )}
    </div>
  );
}
