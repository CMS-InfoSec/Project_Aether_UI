import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import HelpTip from "@/components/ui/help-tip";
import apiFetch, { getJson } from "@/lib/apiClient";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Cell,
} from "recharts";

interface ExplainFeature { name: string; value: number; contribution: number }
interface ExplainItem {
  id: string;
  timestamp: string;
  symbol: string;
  side: "BUY" | "SELL";
  decision: "enter" | "exit" | "hold";
  base_value: number;
  prediction: number;
  features: ExplainFeature[];
}

function toWaterfall(item?: ExplainItem) {
  if (!item) return [] as any[];
  const steps: any[] = [];
  let cum = 0;
  steps.push({ name: "Base", start: 0, delta: item.base_value, color: "#64748b" });
  cum += item.base_value;
  for (const f of item.features) {
    const start = Math.min(cum, cum + f.contribution);
    const delta = Math.abs(f.contribution);
    steps.push({ name: f.name, start, delta, color: f.contribution >= 0 ? "#16a34a" : "#ef4444", raw: f.contribution });
    cum += f.contribution;
  }
  steps.push({ name: "Prediction", start: 0, delta: item.prediction, color: "#0ea5e9" });
  return steps;
}

export default function ExplainabilityPanel() {
  const [items, setItems] = useState<ExplainItem[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/v1/explain?limit=${limit}`);
      if (!r.ok) {
        const j = await r.json().catch(()=>({}));
        throw new Error(j.detail || `HTTP ${r.status}`);
      }
      const j = await r.json();
      const list: ExplainItem[] = j?.data?.items || j?.items || [];
      setItems(list);
      setSelected(0);
    } catch {
      // Attempt fallback to strategies endpoint
      try {
        const r2 = await apiFetch("/api/strategies/explain");
        const j2 = await r2.json();
        const list = (j2?.items || []).map((it: any, idx: number) => ({
          id: it.request_id || `ex_${idx}`,
          timestamp: it.timestamp || new Date().toISOString(),
          symbol: it.symbol || it.strategy || "BTC/USDT",
          side: (it.side || "BUY").toUpperCase(),
          decision: (it.decision || "enter").toLowerCase(),
          base_value: Number(it.base_value || 0.5),
          prediction: Number(it.prediction || 0.6),
          features: Array.isArray(it.features)
            ? it.features.map((f: any) => ({ name: f.name || f.feature, value: Number(f.value || 0), contribution: Number(f.contribution || f.weight || 0) }))
            : []
        })) as ExplainItem[];
        setItems(list);
        setSelected(0);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const current = items[selected];
  const wf = useMemo(() => toWaterfall(current), [current]);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <CardTitle className="flex items-center gap-2">
          Explainability
        </CardTitle>
        <HelpTip content="Feature importance waterfall per trade decision. Source: /api/v1/explain" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Recent decisions</div>
            <div className="overflow-auto max-h-40 border rounded">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-left p-2">Decision</th>
                    <th className="text-left p-2">Pred</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id} className={`border-b cursor-pointer ${idx===selected? 'bg-muted/50':''}`} onClick={()=> setSelected(idx)}>
                      <td className="p-2 whitespace-nowrap">{new Date(it.timestamp).toLocaleString()}</td>
                      <td className="p-2 font-medium">{it.symbol}</td>
                      <td className="p-2">
                        <Badge variant={it.side === 'BUY' ? 'default' : 'secondary'}>{it.side}</Badge>
                      </td>
                      <td className="p-2 capitalize">{it.decision}</td>
                      <td className="p-2">{it.prediction.toFixed(3)}</td>
                    </tr>
                  ))}
                  {items.length===0 && (
                    <tr><td className="p-3 text-muted-foreground" colSpan={5}>No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <Label className="block text-xs mb-1">Limit</Label>
            <input type="number" min={1} max={50} value={limit} onChange={(e)=> setLimit(Math.max(1, Math.min(50, parseInt(e.target.value)||10)))} className="w-24 border rounded px-2 py-1 text-sm bg-background" />
            <Button size="sm" variant="outline" className="ml-2" onClick={load} disabled={loading}>{loading? 'Loading…':'Refresh'}</Button>
          </div>
        </div>

        {current && (
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="font-medium mb-1">Feature Impact (Waterfall)</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={wf} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={50} interval={0} />
                    <YAxis />
                    <Tooltip formatter={(value: any, name: any, props: any) => {
                      if (name === 'delta') return [`${props.payload.raw ?? props.payload.delta}`, 'Δ'];
                      return [value, name];
                    }} />
                    <Legend />
                    <Bar dataKey="start" stackId="a" fill="transparent" isAnimationActive={false} />
                    <Bar dataKey="delta" stackId="a">
                      {wf.map((entry, index) => (
                        <Cell key={`c-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">Top Features</div>
              <div className="space-y-1 text-sm">
                {current.features
                  .slice()
                  .sort((a,b)=> Math.abs(b.contribution) - Math.abs(a.contribution))
                  .slice(0,6)
                  .map((f)=> (
                    <div key={f.name} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-muted-foreground">value: {f.value}</div>
                      </div>
                      <Badge variant={f.contribution>=0? 'outline':'destructive'}>
                        {f.contribution>=0? '+':''}{f.contribution.toFixed(3)}
                      </Badge>
                    </div>
                  ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Base: {current.base_value.toFixed(3)} • Prediction: {current.prediction.toFixed(3)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
