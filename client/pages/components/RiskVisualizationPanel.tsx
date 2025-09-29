import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import HelpTip from "@/components/ui/help-tip";
import { getJson } from "@/lib/apiClient";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Line,
} from "recharts";

interface RiskTier { id: string; label: string; maxDrawdown: number; pnlWarning: number }
interface RiskConfig { tiers: RiskTier[]; defaultTier: string }

export default function RiskVisualizationPanel() {
  const [riskCfg, setRiskCfg] = useState<RiskConfig | null>(null);
  const [tier, setTier] = useState<string>("");
  const [series, setSeries] = useState<Array<{ t: string; pnl: number; dd: number }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const j = await getJson<any>("/api/config/risk");
        const data: RiskConfig = j?.data || j;
        setRiskCfg(data);
        setTier(data?.defaultTier || data?.tiers?.[0]?.id || "moderate");
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const j = await getJson<any>("/api/reports/daily");
        const data = j?.data || j || {};
        const dr = Array.isArray(data.dailyReturnsData) ? data.dailyReturnsData : [];
        // Build cumulative PnL and drawdown from daily returns (% points)
        let equity = 1;
        let peak = 1;
        const s = dr.map((d: any) => {
          const ret = Number(d.returns) / 100 || 0;
          equity *= 1 + ret;
          if (equity > peak) peak = equity;
          const pnl = equity - 1;
          const dd = equity / peak - 1;
          const t = new Date(d.date || new Date()).toISOString();
          return { t, pnl, dd };
        });
        setSeries(s);
      } catch {
        setSeries([]);
      }
    })();
  }, []);

  const tierCfg = useMemo(() => riskCfg?.tiers.find((t) => t.id === tier) || null, [riskCfg, tier]);
  const data = useMemo(() => {
    const md = tierCfg?.maxDrawdown ?? 0.1;
    const pw = tierCfg?.pnlWarning ?? -0.05;
    return series.map((p) => ({
      ...p,
      ddBreach: p.dd <= -md ? p.dd : null,
      pnlBreach: p.pnl <= pw ? p.pnl : null,
      tShort: new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pnlPct: p.pnl * 100,
      ddPct: p.dd * 100,
      ddBreachPct: p.dd <= -md ? p.dd * 100 : null,
      pnlBreachPct: p.pnl <= pw ? p.pnl * 100 : null,
    }));
  }, [series, tierCfg]);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <CardTitle>Risk Visualization</CardTitle>
        <HelpTip content="PnL and drawdown over time. Threshold breaches marked in red. Filter by risk tier." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <Label>Risk Tier</Label>
            <HelpTip content="Select tier to evaluate breaches against tier limits." />
          </div>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(riskCfg?.tiers || []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label || t.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tShort" />
              <YAxis yAxisId={"left"} label={{ value: "%", angle: -90, position: "insideLeft" }} />
              <RechartsTooltip formatter={(value:any, name:any)=> [`${Number(value).toFixed(2)}%`, name]} />
              <Legend />
              <Line yAxisId={"left"} type="monotone" dataKey="pnlPct" name="PnL %" stroke="#2563eb" dot={false} />
              <Line yAxisId={"left"} type="monotone" dataKey="ddPct" name="Drawdown %" stroke="#64748b" dot={false} />
              <Line yAxisId={"left"} type="monotone" dataKey="pnlBreachPct" name="PnL Breach" stroke="#dc2626" dot={true} strokeDasharray="4 2" />
              <Line yAxisId={"left"} type="monotone" dataKey="ddBreachPct" name="DD Breach" stroke="#dc2626" dot={true} strokeDasharray="4 2" />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
