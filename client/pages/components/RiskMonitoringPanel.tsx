import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import HelpTip from "@/components/ui/help-tip";
import apiFetch from "@/lib/apiClient";
import { AlertTriangle, Activity, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";

interface BreachItem {
  id?: string;
  message: string;
  timestamp: string | number;
  severity?: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

function parsePrometheus(text: string): Record<string, number> {
  const metrics: Record<string, number> = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    // Example: portfolio_pnl 123.45 or metric{label="x"} 1.0
    const sp = line.trim().split(/\s+/);
    if (sp.length < 2) continue;
    const rawName = sp[0];
    const val = Number(sp[sp.length - 1]);
    if (!isFinite(val)) continue;
    const name = rawName.replace(/\{.*\}$/, "");
    metrics[name] = val; // last sample wins
  }
  return metrics;
}

function pickMetric(
  metrics: Record<string, number>,
  keys: string[],
  fallback?: number,
): number | undefined {
  for (const k of keys) {
    if (k in metrics) return metrics[k];
  }
  return fallback;
}

export default function RiskMonitoringPanel({
  range,
}: { range?: { from: number; to: number } } = {}) {
  const [breaches, setBreaches] = useState<BreachItem[]>([]);
  const [promText, setPromText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [perf, setPerf] = useState<Array<{ date: string; returns: number }>>(
    [],
  );
  const filteredPerf = useMemo(() => {
    if (!range || !range.from || !range.to) return perf;
    return perf.filter((p) => {
      const t = new Date(p.date).getTime();
      return Number.isFinite(t) && t >= range.from && t <= range.to;
    });
  }, [perf, range]);
  const timerRef = useRef<number | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      // Breaches
      let breachesData: any = null;
      try {
        let r = await apiFetch("/risk/breaches");
        if (!r.ok) {
          r = await apiFetch("/api/risk/breaches");
        }
        if (r.ok) {
          breachesData = await r.json().catch(() => null);
        } else if (r.status !== 404) {
          const j = await r.json().catch(() => ({}) as any);
          throw new Error(j?.detail || `Risk breaches HTTP ${r.status}`);
        }
      } catch (e: any) {
        if (String(e?.message || "").includes("Risk breaches"))
          setError(e.message);
      }
      const items: BreachItem[] = Array.isArray(breachesData)
        ? breachesData
        : Array.isArray(breachesData?.breaches)
          ? breachesData?.breaches
          : [];
      setBreaches(items.filter(Boolean));

      // Prometheus metrics: try /api/metrics then fallback to /metrics
      let metricsText = "";
      try {
        const r = await apiFetch("/api/metrics");
        if (r.ok) metricsText = await r.text();
      } catch {}
      if (!metricsText) {
        try {
          const r2 = await apiFetch("/metrics");
          if (r2.ok) metricsText = await r2.text();
        } catch {}
      }
      if (!metricsText) throw new Error("Metrics endpoint unavailable");
      setPromText(metricsText);

      // Mini performance chart (recent returns)
      try {
        const r = await apiFetch("/api/reports/daily");
        const j = await r.json().catch(() => ({}) as any);
        const dr = Array.isArray(j?.data?.dailyReturnsData)
          ? j.data.dailyReturnsData
          : Array.isArray(j?.dailyReturnsData)
            ? j.dailyReturnsData
            : [];
        const rows = dr.map((d: any) => ({
          date: d.date,
          returns: Number(d.returns) || 0,
        }));
        setPerf(rows.slice(-20));
      } catch {}

      setLastUpdated(Date.now());
    } catch (e: any) {
      setError(e?.message || "Failed to load risk data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 5000) as any;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const prom = useMemo(() => parsePrometheus(promText || ""), [promText]);

  const drawdown = useMemo(() => {
    // Common names: max_drawdown, portfolio_max_drawdown, aether_drawdown
    return pickMetric(prom, [
      "max_drawdown",
      "portfolio_max_drawdown",
      "aether_drawdown",
      "drawdown",
    ]);
  }, [prom]);

  const sharpe = useMemo(
    () => pickMetric(prom, ["sharpe_ratio", "portfolio_sharpe", "sharpe"]),
    [prom],
  );
  const hedge = useMemo(
    () => pickMetric(prom, ["hedge_ratio", "portfolio_hedge_ratio", "hedge"]),
    [prom],
  );
  const pnl = useMemo(
    () => pickMetric(prom, ["portfolio_pnl", "pnl_total", "pnl"]),
    [prom],
  );

  const fmtPct = (v?: number) =>
    v === undefined ? "N/A" : `${(v * 100).toFixed(2)}%`;
  const fmtNum = (v?: number) => (v === undefined ? "N/A" : v.toFixed(2));
  const fmtCur = (v?: number) =>
    v === undefined
      ? "N/A"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(v);

  const badgeFor = (ok: boolean, warn?: boolean) => (
    <Badge variant={ok ? "outline" : warn ? "secondary" : "destructive"}>
      {ok ? "OK" : warn ? "Warn" : "Breach"}
    </Badge>
  );

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Risk Monitoring{" "}
            <Badge variant="outline" className="ml-1">
              Live
            </Badge>
            {range ? (
              <Badge variant="secondary" className="ml-2">
                Filtered
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Live risk metrics and breach alerts. Auto-refreshes every 5 seconds.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <HelpTip content="Pulls Prometheus metrics (Sharpe, P&L, drawdown, hedge) and shows any current risk breaches." />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground flex items-center justify-between">
              Drawdown{" "}
              <HelpTip content="Maximum drawdown observed; negative values indicate decline from peak." />
            </div>
            <div className="flex items-center justify-between">
              <div
                className={`text-2xl font-semibold ${typeof drawdown === "number" && drawdown < 0 ? "text-destructive" : ""}`}
              >
                {fmtPct(drawdown)}
              </div>
              {badgeFor(
                typeof drawdown !== "number" ? true : drawdown > -0.05,
                typeof drawdown === "number"
                  ? drawdown <= -0.05 && drawdown > -0.1
                  : false,
              )}
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground flex items-center justify-between">
              Sharpe Ratio{" "}
              <HelpTip content="Risk-adjusted return; higher is better." />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{fmtNum(sharpe)}</div>
              {badgeFor(
                typeof sharpe !== "number" ? true : sharpe >= 1,
                typeof sharpe === "number"
                  ? sharpe < 1 && sharpe >= 0.5
                  : false,
              )}
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground flex items-center justify-between">
              Hedge Ratio{" "}
              <HelpTip content="Portion of portfolio hedged (e.g., USDT/short exposure). Target 20%–60%." />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{fmtPct(hedge)}</div>
              {badgeFor(
                typeof hedge !== "number" ? true : hedge >= 0.2 && hedge <= 0.6,
                typeof hedge === "number"
                  ? (hedge >= 0.1 && hedge < 0.2) ||
                      (hedge > 0.6 && hedge <= 0.8)
                  : false,
              )}
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground flex items-center justify-between">
              P&L <HelpTip content="Aggregate profit and loss." />
            </div>
            <div className="flex items-center justify-between">
              <div
                className={`text-2xl font-semibold ${typeof pnl === "number" ? (pnl >= 0 ? "text-accent" : "text-destructive") : ""}`}
              >
                {fmtCur(pnl)}
              </div>
              {badgeFor(typeof pnl !== "number" ? true : pnl >= 0)}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Breach Alerts</div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Activity className="h-3 w-3" /> {breaches.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {breaches.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No active breaches.
              </div>
            ) : (
              breaches.map((b, i) => (
                <div
                  key={b.id || i}
                  className="p-3 rounded-md border bg-red-50 border-red-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-red-700">
                      {b.message || b.metric || "Breach detected"}
                    </div>
                    <Badge variant="destructive">BREACH</Badge>
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {b.metric
                      ? `${b.metric}: ${b.value ?? ""}${typeof b.threshold !== "undefined" ? ` (threshold ${b.threshold})` : ""}`
                      : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(b.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Recent Performance</div>
            <HelpTip content="Sparkline of recent portfolio returns (last ~20 points)." />
          </div>
          <div className="h-32">
            {filteredPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={filteredPerf}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <RechartsTooltip
                    formatter={(v: any) => [
                      `${(Number(v) * 100).toFixed(2)}%`,
                      "Return",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="returns"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground">
                No performance data
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Last updated:{" "}
          {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "–"}
          {range
            ? ` • Window ${new Date(range.from).toLocaleTimeString()}–${new Date(range.to).toLocaleTimeString()}`
            : ""}
        </div>
      </CardContent>
    </Card>
  );
}
