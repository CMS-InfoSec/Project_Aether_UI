import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HelpTip from "@/components/ui/help-tip";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getJson, patchJson } from "@/lib/apiClient";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Scatter,
  ScatterChart,
} from "recharts";

interface Tier { id: string; label: string; maxDrawdown: number; pnlWarning: number }
interface RiskConfig { tiers: Tier[]; defaultTier: string }

export default function RiskTierPanel() {
  const [config, setConfig] = useState<RiskConfig | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [metrics, setMetrics] = useState<Array<{ t:string; pnl:number; dd:number }>>([]);
  const [auto, setAuto] = useState(true);

  const loadConfig = async () => {
    try {
      const j = await getJson<any>("/api/config/risk");
      const data: RiskConfig = j?.data || j;
      setConfig(data);
      setTiers(data.tiers);
      setSelectedTier(data.defaultTier || data.tiers[0]?.id || "");
    } catch {}
  };
  const loadMetrics = async () => {
    try {
      const j = await getJson<any>("/api/reports/daily");
      const data = j?.data || j || {};
      const dr = Array.isArray(data.dailyReturnsData) ? data.dailyReturnsData : [];
      let equity = 1;
      let peak = 1;
      const series = dr.map((d: any) => {
        const ret = Number(d.returns) / 100 || 0;
        equity *= 1 + ret;
        if (equity > peak) peak = equity;
        const pnl = equity - 1;
        const dd = equity / peak - 1;
        const t = new Date(d.date || new Date()).toISOString();
        return { t, pnl, dd };
      });
      setMetrics(series);
    } catch {
      setMetrics([]);
    }
  };

  useEffect(() => { loadConfig(); loadMetrics(); }, []);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(loadMetrics, 10000);
    return () => clearInterval(id);
  }, [auto]);

  const currentTier = useMemo(() => tiers.find(t => t.id === selectedTier) || tiers[0], [tiers, selectedTier]);

  const dataWithFlags = useMemo(() => {
    if (!currentTier) return [] as any[];
    return metrics.map((d) => ({
      ...d,
      pnlBreach: d.pnl <= currentTier.pnlWarning,
      ddBreach: d.dd <= -currentTier.maxDrawdown,
    }));
  }, [metrics, currentTier]);

  const pnlBreaches = useMemo(() => dataWithFlags.filter(d => d.pnlBreach), [dataWithFlags]);
  const ddBreaches = useMemo(() => dataWithFlags.filter(d => d.ddBreach), [dataWithFlags]);

  const save = async () => {
    try {
      const body: RiskConfig = { tiers, defaultTier: selectedTier } as any;
      const j = await patchJson<any>("/api/config/risk", body);
      const data = j?.data || j;
      setConfig(data);
      toast({ title: "Risk config saved", description: `Default: ${selectedTier}` });
    } catch (e:any) {
      toast({ title: "Save failed", description: e?.message || "Error", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <CardTitle>Risk Tiers</CardTitle>
        <HelpTip content="Configure tier thresholds and monitor live P&L and drawdown breaches." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <div className="flex items-center gap-2"><Label>Active Tier</Label></div>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tiers.map(t => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input id="auto" type="checkbox" checked={auto} onChange={(e)=> setAuto(e.target.checked)} className="mr-2" />
            <Label htmlFor="auto">Auto-refresh 10s</Label>
          </div>
          <div className="md:col-span-2 text-xs text-muted-foreground">
            Thresholds apply to breaches below zero. P&L warning triggers when cumulative P&L ≤ warning. Drawdown breach triggers when drawdown ≤ -maxDrawdown.
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="text-left p-2">Tier</th><th className="text-left p-2">P&L warning (≤)</th><th className="text-left p-2">Max drawdown (≤)</th></tr></thead>
            <tbody>
              {tiers.map((t, idx) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 font-medium">{t.label}</td>
                  <td className="p-2">
                    <Input type="number" step="0.001" value={t.pnlWarning} onChange={(e)=> setTiers((prev)=> prev.map((x,i)=> i===idx? { ...x, pnlWarning: Number(e.target.value) }: x))} />
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.001" value={t.maxDrawdown} onChange={(e)=> setTiers((prev)=> prev.map((x,i)=> i===idx? { ...x, maxDrawdown: Number(e.target.value) }: x))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={save}>Save</Button>
          {currentTier && (
            <Badge variant="outline">{currentTier.label}: P&L ≤ {currentTier.pnlWarning}, DD ≤ {-currentTier.maxDrawdown}</Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-64">
            <div className="font-medium mb-1">Cumulative P&L</div>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={dataWithFlags}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tickFormatter={(v)=> new Date(v).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} />
                <YAxis tickFormatter={(v)=> `${(v*100).toFixed(1)}%`} />
                <RechartsTooltip formatter={(v:any)=> `${(Number(v)*100).toFixed(2)}%`} />
                <Line type="monotone" dataKey="pnl" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Scatter data={pnlBreaches} fill="#ef4444" shape="circle" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64">
            <div className="font-medium mb-1">Drawdown</div>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={dataWithFlags}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tickFormatter={(v)=> new Date(v).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} />
                <YAxis tickFormatter={(v)=> `${(v*100).toFixed(1)}%`} />
                <RechartsTooltip formatter={(v:any)=> `${(Number(v)*100).toFixed(2)}%`} />
                <Line type="monotone" dataKey="dd" stroke="#10b981" strokeWidth={2} dot={false} />
                <Scatter data={ddBreaches} fill="#ef4444" shape="circle" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
