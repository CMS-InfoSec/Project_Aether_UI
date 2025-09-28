import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import HelpTip from "@/components/ui/help-tip";
import apiFetch from "@/lib/apiClient";
import { AlertTriangle, ShieldAlert, ShieldCheck, RefreshCw, Eye, EyeOff } from "lucide-react";

interface DefenseEvent {
  id: string;
  type: string;
  severity: "low"|"medium"|"high"|"critical"|string;
  actor: string;
  status: "active"|"mitigated"|"observed"|string;
  response: string;
  symbol?: string;
  venue?: string;
  detected_at: string;
  details?: string;
}

export default function ManipulationDefenseConsole() {
  const [events, setEvents] = useState<DefenseEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [override, setOverride] = useState<boolean>(false);
  const [autoDefense, setAutoDefense] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let r = await apiFetch('/api/defense/events');
      if (!r.ok) r = await apiFetch('/defense/events');
      if (r.ok) {
        const j = await r.json().catch(()=>({}));
        const data: any[] = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : (Array.isArray((j as any).items) ? (j as any).items : []));
        setEvents(data as DefenseEvent[]);
        const s = j?.settings || {};
        if (typeof s.operatorOverride === 'boolean') setOverride(s.operatorOverride);
        if (typeof s.autoDefenseEnabled === 'boolean') setAutoDefense(s.autoDefenseEnabled);
      } else { setEvents([]); }
    } catch { setEvents([]); }
    finally { setLoading(false); }
  };

  const severeActive = useMemo(() => events.filter(e => (e.severity==='critical'||e.severity==='high') && e.status==='active'), [events]);

  useEffect(()=> { load(); timerRef.current = window.setInterval(load, 15000) as any; return ()=> { if (timerRef.current) window.clearInterval(timerRef.current); }; }, []);

  const toggleOverride = async (val: boolean) => {
    setOverride(val);
    try { await apiFetch('/api/defense/override', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ override: val }) }); } catch {}
  };

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="inline-flex items-center gap-2">Manipulation Defense</CardTitle>
          <CardDescription>Detected spoofing/shilling events, responses, and operator overrides</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <HelpTip content="Auto-defense quarantines or down-weights in real time. Toggle override to pause automated actions." />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? <RefreshCw className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {severeActive.slice(0,3).map(e => (
          <div key={`banner_${e.id}`} className="p-3 rounded-md border bg-red-50 border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="h-4 w-4"/>
              <span className="font-semibold capitalize">{e.type}</span>
              <span>•</span>
              <span className="font-mono">{e.symbol || '-'}</span>
              <Badge variant="destructive" className="capitalize ml-2">{e.severity}</Badge>
              <Badge variant="outline" className="ml-2">{e.response}</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">Detected {new Date(e.detected_at).toLocaleTimeString()}</div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="override" checked={override} onCheckedChange={toggleOverride} />
            <label htmlFor="override" className="text-sm">Operator override (pause auto-defense)</label>
          </div>
          <Badge variant={override ? 'destructive' : 'outline'}>{override ? 'OVERRIDE ACTIVE' : 'AUTO-DEFENSE'}</Badge>
        </div>

        <ScrollArea className="h-64">
          <div className="space-y-2">
            {events.map((e)=> (
              <div key={e.id} className={`p-2 border rounded-md ${e.status==='active' ? 'border-red-200 bg-red-50/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={e.status==='active' ? 'destructive' : 'outline'} className="capitalize">{e.status}</Badge>
                    <div className="font-medium capitalize">{e.type}</div>
                    <Badge variant="outline" className="capitalize">{e.severity}</Badge>
                    {e.venue && <Badge variant="outline">{e.venue}</Badge>}
                    {e.symbol && <Badge variant="secondary">{e.symbol}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(e.detected_at).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-sm">Actor: <span className="capitalize">{e.actor}</span> • Response: <span>{e.response}</span></div>
                {e.details && <div className="text-xs text-muted-foreground mt-1">{e.details}</div>}
              </div>
            ))}
            {events.length===0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">No events</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
