import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import HelpTip from "@/components/ui/help-tip";
import apiFetch, { getJson } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function parseRetentionMetrics(text: string) {
  const getNum = (re: RegExp) => {
    const m = text.match(re);
    return m ? Number(m[1]) : 0;
  };
  return {
    days: getNum(/aether_data_retention_days\s+(\d+(?:\.\d+)?)/),
    lastTs: getNum(/aether_data_last_purge_timestamp_seconds\s+(\d+(?:\.\d+)?)/),
    deleted: getNum(/aether_data_last_purge_deleted_total\s+(\d+(?:\.\d+)?)/),
    errors: getNum(/aether_data_last_purge_errors_total\s+(\d+(?:\.\d+)?)/),
  };
}

export default function DataRetentionPanel() {
  const [days, setDays] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [metrics, setMetrics] = useState<{days:number; lastTs:number; deleted:number; errors:number}>({ days: 30, lastTs: 0, deleted: 0, errors: 0 });

  const loadConfig = async () => {
    try {
      const j = await getJson<any>("/api/admin/config/data-retention", { admin: true });
      const d = j?.data || j;
      if (typeof d?.days === 'number') setDays(d.days);
    } catch {}
  };
  const loadMetrics = async () => {
    try {
      const r = await apiFetch("/api/metrics/retention");
      const text = await r.text();
      setMetrics(parseRetentionMetrics(text));
    } catch {}
  };

  useEffect(() => {
    loadConfig();
    loadMetrics();
  }, []);

  const lastPurgeAt = useMemo(() => metrics.lastTs ? new Date(metrics.lastTs * 1000).toLocaleString() : "never", [metrics.lastTs]);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>Data Retention</CardTitle>
          <CardDescription>Control retention window and perform manual purge. Stats sourced from Prometheus metrics.</CardDescription>
        </div>
        <HelpTip content="Adjust retention duration in days. Manual purge deletes data older than retention." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Label>Retention duration (days)</Label>
            <Badge variant="outline">{days}d</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Slider value={[days]} min={7} max={3650} step={1} onValueChange={(v)=> setDays(v[0])} className="max-w-xl" />
            <Button onClick={async ()=>{
              setSaving(true);
              try {
                const r = await apiFetch('/api/admin/config/data-retention', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ days }),
                  admin: true,
                });
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || 'Failed');
                toast({ title: 'Retention Updated', description: `${days} days` });
                loadMetrics();
              } catch(e:any) {
                toast({ title: 'Error', description: e?.message || 'Failed', variant: 'destructive' });
              } finally { setSaving(false); }
            }} disabled={saving}>
              {saving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin"/>Saving…</> : 'Save'}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">Range: 7–3650 days</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="destructive" onClick={async ()=>{
            if (!window.confirm('Manually purge data older than retention window?')) return;
            setPurging(true);
            try {
              const r = await apiFetch('/api/admin/data/purge', { method: 'POST', admin: true });
              const j = await r.json();
              if (!r.ok) throw new Error(j.message || 'Failed');
              toast({ title: 'Purge Complete', description: `${j.data?.deleted || 0} records deleted` });
              loadMetrics();
            } catch(e:any) {
              toast({ title: 'Purge Failed', description: e?.message || 'Failed', variant: 'destructive' });
            } finally { setPurging(false); }
          }} disabled={purging}>
            {purging ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin"/>Purging…</> : <><Trash2 className="h-4 w-4 mr-2"/>Manual Purge</>}
          </Button>
          <Button variant="outline" onClick={loadMetrics}>
            <RefreshCw className="h-4 w-4 mr-2"/>Refresh Stats
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">Retention (metrics)</div>
            <div className="text-lg font-semibold">{metrics.days} d</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">Last purge</div>
            <div className="text-lg font-semibold">{lastPurgeAt}</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">Deleted (last)</div>
            <div className="text-lg font-semibold">{metrics.deleted}</div>
          </div>
          <div className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">Errors (last)</div>
            <div className="text-lg font-semibold {metrics.errors>0?'text-red-600':''}">{metrics.errors}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
