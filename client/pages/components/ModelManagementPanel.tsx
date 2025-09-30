import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import HelpTip from "@/components/ui/help-tip";
import apiFetch, { getJson, postJson } from "@/lib/apiClient";

interface ModelHistoryItem {
  modelId: string;
  name: string;
  version: string;
  type: string;
  status: string;
  createdAt?: string;
  logs?: Array<{ timestamp: string; stage?: string; message: string }>;
}
interface RegistryData {
  models: ModelHistoryItem[];
  policies: string[];
  lastCheckpoint: string | null;
  supabase_degraded?: boolean;
}

export default function ModelManagementPanel() {
  const [registry, setRegistry] = useState<RegistryData | null>(null);
  const [modelType, setModelType] = useState<'forecast' | 'rl_agent'>('rl_agent');
  const [policy, setPolicy] = useState<string>("");
  const [coins, setCoins] = useState<string>("BTC,ETH");
  const [retraining, setRetraining] = useState(false);
  const [logs, setLogs] = useState<Array<{ ts: string; msg: string }>>([]);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiFetch(`/api/v1/models/history`, { admin: true });
        const j = await r.json().catch(() => ({}));
        const items: any[] = Array.isArray(j?.items) ? j.items : Array.isArray(j?.records) ? j.records : [];
        const models: ModelHistoryItem[] = items.map((m: any) => ({
          modelId: m.modelId || m.id,
          name: m.name || m.model || m.id,
          version: m.version || m.rev || "",
          type: m.type || m.family || "",
          status: m.status || m.state || "",
          createdAt: m.createdAt || m.timestamp,
          logs: Array.isArray(m.logs) ? m.logs : undefined,
        }));
        const policies = Array.from(new Set(models.map((m) => (m.type === 'rl' || m.type === 'rl_agent') ? 'PPO' : 'LSTM')));
        const lastCheckpoint = j?.metadata?.last_checkpoint || null;
        setRegistry({ models, policies: policies.length ? policies : ["PPO","LSTM"], lastCheckpoint, supabase_degraded: Boolean(j?.supabase_degraded || j?.metadata?.supabase_degraded) });
        setDegraded(Boolean(j?.supabase_degraded || j?.metadata?.supabase_degraded));
        if (!policy && policies.length) setPolicy(policies[0]);
        const latest = models[0];
        if (latest?.logs?.length) {
          setLogs(latest.logs.slice(-100).map((l: any) => ({ ts: l.timestamp, msg: `[${l.stage || 'log'}] ${l.message}` })));
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [policy]);

  // Poll history for latest logs; SSE removed per API support

  const lastCheckpoint = useMemo(() => {
    if (!registry?.lastCheckpoint) return null;
    try { return new Date(registry.lastCheckpoint).toLocaleString(); } catch { return registry.lastCheckpoint; }
  }, [registry]);

  const runRetrain = async () => {
    const coinList = coins.split(/\s*,\s*/).filter(Boolean).slice(0, 10);
    if (coinList.length === 0) return;
    setRetraining(true);
    try {
      const payload: any = { model_type: modelType === 'rl_agent' ? 'rl' : 'forecast', coin: coinList };
      if (modelType === 'rl_agent') payload.algorithm = (policy || 'PPO').toLowerCase().replace(/\s+/g, '_');
      else payload.architecture = policy.toLowerCase() === 'transformer' ? 'transformer' : 'lstm';
      const r = await apiFetch(`/api/v1/models/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        admin: true,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || 'Failed');
    } catch (e) {}
    finally {
      setRetraining(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <CardTitle>AI Model Management</CardTitle>
        <HelpTip content="Trigger retraining, view last checkpoint, policies, and live logs." />
      </CardHeader>
      <CardContent className="space-y-4">
        {degraded && (
          <div className="p-3 border rounded bg-yellow-50 text-yellow-800 text-sm">Degraded: history storage unavailable; showing partial data.</div>
        )}
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <div className="flex items-center gap-2">
              <Label>Model type</Label>
              <HelpTip content="Select model family to retrain." />
            </div>
            <Select value={modelType} onValueChange={(v)=> setModelType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rl_agent">RL Agent</SelectItem>
                <SelectItem value="forecast">Forecast</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Policy/Architecture</Label>
              <HelpTip content="Available policies loaded from registry." />
            </div>
            <Select value={policy} onValueChange={setPolicy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(registry?.policies || ["PPO","LSTM"]).map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Label>Coins</Label>
              <HelpTip content="Comma-separated symbols (max 10)." />
            </div>
            <Input value={coins} onChange={(e)=> setCoins(e.target.value)} placeholder="BTC,ETH" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={runRetrain} disabled={retraining || !policy}>
            {retraining ? 'Starting…' : 'Trigger Retrain'}
          </Button>
          {lastCheckpoint && (
            <Badge variant="outline">Last checkpoint: {lastCheckpoint}</Badge>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="font-medium mb-2">Retraining Logs</div>
            <div className="border rounded h-52">
              <ScrollArea className="h-52 p-2">
                <pre className="text-xs whitespace-pre-wrap">
                  {logs.map((l, i) => `${new Date(l.ts).toLocaleTimeString()} ${l.msg}`).join("\n") || 'No logs yet'}
                </pre>
              </ScrollArea>
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Models Registry</div>
            <div className="border rounded max-h-52 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Model</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Version</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Last trained</th>
                  </tr>
                </thead>
                <tbody>
                  {(registry?.models || []).slice(0, 10).map((m: any) => (
                    <tr key={m.modelId} className="border-b">
                      <td className="p-2">{m.name}</td>
                      <td className="p-2">{m.type}</td>
                      <td className="p-2">{m.version}</td>
                      <td className="p-2">
                        <Badge variant={m.status === 'deployed' ? 'outline' : 'secondary'}>{m.status}</Badge>
                      </td>
                      <td className="p-2">{m.createdAt ? new Date(m.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {(!registry?.models || registry.models.length === 0) && (
                    <tr><td className="p-3 text-muted-foreground" colSpan={5}>No models in registry</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
