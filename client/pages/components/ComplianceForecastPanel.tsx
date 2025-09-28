import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import HelpTip from "@/components/ui/help-tip";
import apiFetch from "@/lib/apiClient";
import { AlertTriangle, BarChart3, Download, RefreshCw, SlidersHorizontal, TrendingDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, CartesianGrid } from "recharts";

interface PositionItem {
  id: string;
  symbol: string; // e.g., BTC/USDT
  amount: number;
  entry_price: number;
  current_price?: number;
  net_pnl: number;
  timestamp: string;
}

interface MarketsItem {
  symbol: string;
  realized_vol: number; // 0.05 = 5%
  source: string; // treat as venue
}

interface EffectiveConfig {
  derived?: {
    ASC?: {
      arbitrage?: { max_exposure?: number };
    };
    RISK_TIER_DEFAULTS?: Record<string, { max_position_size: number; risk_limit_percent: number; stop_loss_percent: number }>;
  };
}

type ForecastRow = {
  key: string;
  label: string;
  exposure: number;
  alloc: number;
  vol: number;
  venue: string;
  breachProbBase: number; // 0..1
  breachProbPolicy: number; // 0..1
};

function fmtPct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function safeNum(n: any, d: number) { const v = Number(n); return Number.isFinite(v) ? v : d; }

export default function ComplianceForecastPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [markets, setMarkets] = useState<Record<string, MarketsItem>>({});
  const [baseCap, setBaseCap] = useState<number>(0.1); // default 10%
  const [policyCap, setPolicyCap] = useState<number>(0.1);
  const [capInput, setCapInput] = useState<string>("0.10");
  const [bucketBy, setBucketBy] = useState<"asset" | "venue">("asset");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [posRes, mktRes, cfgRes] = await Promise.all([
        apiFetch("/api/positions/open"),
        apiFetch("/api/markets/eligible?limit=100"),
        apiFetch("/api/config/effective"),
      ]);

      if (!posRes.ok) throw new Error(`Positions HTTP ${posRes.status}`);
      if (!mktRes.ok) throw new Error(`Markets HTTP ${mktRes.status}`);

      const posJson = await posRes.json();
      const items = Array.isArray(posJson?.items) ? posJson.items : (Array.isArray(posJson) ? posJson : []);
      const pos: PositionItem[] = items.map((p: any) => ({
        id: String(p.id),
        symbol: String(p.symbol),
        amount: safeNum(p.amount, 0),
        entry_price: safeNum(p.entry_price, 0),
        current_price: typeof p.current_price === 'number' ? p.current_price : undefined,
        net_pnl: safeNum(p.net_pnl, 0),
        timestamp: String(p.timestamp || new Date().toISOString()),
      }));
      setPositions(pos);

      const mktJson = await mktRes.json();
      const mktItems: MarketsItem[] = Array.isArray(mktJson?.items) ? mktJson.items : (Array.isArray(mktJson) ? mktJson : []);
      const mktMap: Record<string, MarketsItem> = {};
      for (const m of mktItems) {
        mktMap[m.symbol] = {
          symbol: m.symbol,
          realized_vol: safeNum((m as any).realized_vol, 0.08),
          source: String((m as any).source || "unknown"),
        };
      }
      setMarkets(mktMap);

      let cap = 0.1;
      try {
        if (cfgRes.ok) {
          const cfg: EffectiveConfig = await cfgRes.json();
          const fromCfg = cfg?.derived?.ASC?.arbitrage?.max_exposure;
          if (typeof fromCfg === 'number' && fromCfg > 0 && fromCfg < 1.0) cap = fromCfg;
        }
      } catch {}
      setBaseCap(cap);
      setPolicyCap((prev) => (prev !== cap ? prev : cap));
      setCapInput(cap.toFixed(2));
      setLastUpdated(Date.now());
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 10000) as any; // 10s
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [load]);

  const rows = useMemo<ForecastRow[]>(() => {
    if (!positions.length) return [];
    const exposureRows: ForecastRow[] = [];
    const totalExposure = positions.reduce((sum, p) => {
      const price = typeof p.current_price === 'number' ? p.current_price : p.entry_price;
      return sum + Math.max(0, p.amount * price);
    }, 0);

    for (const p of positions) {
      const price = typeof p.current_price === 'number' ? p.current_price : p.entry_price;
      const exposure = Math.max(0, p.amount * price);
      const alloc = totalExposure > 0 ? exposure / totalExposure : 0;
      const mkt = markets[p.symbol];
      const vol = mkt ? mkt.realized_vol : 0.08;
      const venue = mkt ? mkt.source : "unknown";
      const ratioBase = baseCap > 0 ? alloc / baseCap : 0;
      const ratioPolicy = policyCap > 0 ? alloc / policyCap : 0;
      // Smooth risk transform: higher vol & ratio => higher breach probability
      const baseScore = Math.pow(Math.max(0, ratioBase), 1.5) * (1 + vol * 5);
      const polScore = Math.pow(Math.max(0, ratioPolicy), 1.5) * (1 + vol * 5);
      const breachProbBase = clamp01(1 - Math.exp(-0.9 * baseScore));
      const breachProbPolicy = clamp01(1 - Math.exp(-0.9 * polScore));
      exposureRows.push({
        key: p.id,
        label: p.symbol,
        exposure,
        alloc,
        vol,
        venue,
        breachProbBase,
        breachProbPolicy,
      });
    }
    return exposureRows;
  }, [positions, markets, baseCap, policyCap]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; exposure: number; alloc: number; breachProbBase: number; breachProbPolicy: number }>();
    const totalExposure = rows.reduce((s, r) => s + r.exposure, 0) || 1;
    for (const r of rows) {
      const k = bucketBy === "asset" ? r.label : r.venue;
      const prev = map.get(k) || { label: k, exposure: 0, alloc: 0, breachProbBase: 0, breachProbPolicy: 0 };
      const w = r.exposure;
      // Weighted average by exposure
      const nextExposure = prev.exposure + w;
      const wPrev = prev.exposure / Math.max(1e-6, nextExposure);
      const wNew = w / Math.max(1e-6, nextExposure);
      map.set(k, {
        label: k,
        exposure: nextExposure,
        alloc: (prev.alloc * wPrev) + (r.alloc * wNew),
        breachProbBase: (prev.breachProbBase * wPrev) + (r.breachProbBase * wNew),
        breachProbPolicy: (prev.breachProbPolicy * wPrev) + (r.breachProbPolicy * wNew),
      });
    }
    const arr = Array.from(map.values()).sort((a, b) => b.exposure - a.exposure);
    return { items: arr, totalExposure };
  }, [rows, bucketBy]);

  const totals = useMemo(() => {
    const base = rows.reduce((s, r) => s + r.breachProbBase, 0);
    const pol = rows.reduce((s, r) => s + r.breachProbPolicy, 0);
    const red = base > 0 ? (base - pol) / base : 0;
    return { base, pol, red };
  }, [rows]);

  const topDrivers = useMemo(() => {
    return [...rows]
      .map(r => ({ key: r.label, venue: r.venue, score: r.breachProbBase * r.exposure, prob: r.breachProbBase }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [rows]);

  const applyPolicyCap = () => {
    const parsed = parseFloat(capInput);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 1) {
      setError("Leverage cap must be a number between 0 and 1.");
      return;
    }
    setError(null);
    setPolicyCap(parsed);
  };

  const onSliderChange = (v: number[]) => {
    const val = (v[0] ?? policyCap);
    setCapInput(val.toFixed(2));
  };

  const exportSnapshot = async (fmt: "json" | "csv") => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      baseCap,
      policyCap,
      bucketBy,
      totals,
      items: grouped.items,
      topDrivers,
      raw: rows,
    };
    if (fmt === "json") {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-forecast-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
    const header = ["label","exposure","alloc","breachProbBase","breachProbPolicy","bucketBy","baseCap","policyCap"];
    const lines = [header.join(",")];
    for (const it of grouped.items) {
      lines.push([
        JSON.stringify(it.label),
        it.exposure.toFixed(2),
        it.alloc.toFixed(6),
        it.breachProbBase.toFixed(6),
        it.breachProbPolicy.toFixed(6),
        bucketBy,
        baseCap.toFixed(4),
        policyCap.toFixed(4),
      ].join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-forecast-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">Compliance Forecasting <Badge variant="outline">Predictive</Badge></CardTitle>
          <CardDescription>
            Predict future rule-breach likelihood under current exposure. Visualize risk buckets and simulate policy changes.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <HelpTip content="Uses open positions, market vol, and config max_exposure to estimate breach probability. Lowering leverage cap reduces predicted breaches." />
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-lg space-y-3">
            <div className="text-sm font-medium flex items-center gap-2"><SlidersHorizontal className="h-4 w-4"/> Simulate Policy Change</div>
            <div className="text-xs text-muted-foreground">Lower leverage cap to reflect predicted breach reduction. Current cap: <strong>{(baseCap*100).toFixed(0)}%</strong></div>
            <div className="space-y-2">
              <Label htmlFor="cap">Leverage cap (fraction of capital)</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Slider min={0.02} max={0.5} step={0.01} value={[parseFloat(capInput) || policyCap]} onValueChange={onSliderChange} onValueCommit={onSliderChange} />
                </div>
                <Input id="cap" value={capInput} onChange={(e)=> setCapInput(e.target.value)} className="w-24" />
                <Button onClick={applyPolicyCap}>Apply</Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-emerald-600"/>
              <span>Predicted breach reduction:</span>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300">{fmtPct(Math.max(0, totals.red))}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={()=> exportSnapshot("json")}><Download className="h-4 w-4 mr-1"/> Export JSON</Button>
              <Button variant="outline" size="sm" onClick={()=> exportSnapshot("csv")}><Download className="h-4 w-4 mr-1"/> Export CSV</Button>
            </div>
          </div>
          <div className="p-4 border rounded-lg space-y-3">
            <div className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4"/> Settings</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Bucket by</div>
                <Select value={bucketBy} onValueChange={(v)=> setBucketBy(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Bucket by"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="venue">Venue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-muted-foreground">Positions</div>
                <div className="mt-1"><Badge variant="secondary">{positions.length}</Badge></div>
              </div>
              <div>
                <div className="text-muted-foreground">Base leverage cap</div>
                <div className="mt-1 font-mono">{(baseCap*100).toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Policy cap</div>
                <div className="mt-1 font-mono">{(policyCap*100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Risk Buckets ({bucketBy === 'asset' ? 'per-asset' : 'per-venue'})</div>
            <Badge variant="secondary">Total Exposure: ${grouped.totalExposure.toFixed(2)}</Badge>
          </div>
          <div className="h-64">
            {grouped.items.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grouped.items.map(it => ({
                  name: it.label,
                  Base: Math.round(it.breachProbBase * 1000) / 10,
                  Policy: Math.round(it.breachProbPolicy * 1000) / 10,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide={grouped.items.length > 12} interval={0} tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                  <YAxis unit="%" domain={[0, 100]} />
                  <RechartsTooltip formatter={(v:any, n:any)=> [`${Number(v).toFixed(1)}%`, n]} />
                  <Legend />
                  <Bar dataKey="Base" fill="#ef4444" name="Breach prob (base)" />
                  <Bar dataKey="Policy" fill="#10b981" name="Breach prob (policy)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground">No exposure data</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Top Drivers</div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {topDrivers.length ? topDrivers.map((d) => (
              <div key={d.key} className="p-3 border rounded-md">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{d.key}</div>
                  <Badge variant="outline">{d.venue}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Contribution score: {d.score.toFixed(2)}</div>
                <div className="text-xs">Breach probability: <span className="font-mono">{fmtPct(d.prob)}</span></div>
              </div>
            )) : (
              <div className="text-xs text-muted-foreground">No drivers identified</div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "–"}</div>
      </CardContent>
    </Card>
  );
}
