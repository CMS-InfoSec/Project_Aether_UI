import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HelpTip from "@/components/ui/help-tip";
import { Badge } from "@/components/ui/badge";
import apiFetch from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Line,
  Legend,
} from "recharts";

function parseCsv(text: string): Array<{ t: string | number; v: number }> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(/,|\t/).map((h) => h.trim().toLowerCase());
  const idxT = header.findIndex((h) => /time|t|date|idx/.test(h));
  const idxV = header.findIndex((h) => /value|v|equity|price|pnl|ret/.test(h));
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/,|\t/).map((c) => c.trim());
    const t = idxT >= 0 ? cols[idxT] : i - 1;
    const v = Number(cols[idxV >= 0 ? idxV : 1]);
    if (Number.isFinite(v)) rows.push({ t, v });
  }
  return rows;
}

export default function BacktestingConsole() {
  const dataRef = useRef<HTMLInputElement | null>(null);
  const benchRef = useRef<HTMLInputElement | null>(null);
  const [series, setSeries] = useState<Array<{ t: any; v: number }>>([]);
  const [bench, setBench] = useState<Array<{ t: any; v: number }>>([]);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, isBench?: boolean) => {
    try {
      const text = await file.text();
      let arr: any[] = [];
      if (/^\s*\[/.test(text) || /^\s*\{/.test(text)) {
        const j = JSON.parse(text);
        arr = Array.isArray(j) ? j : j.data || j.rows || [];
        arr = arr
          .map((r: any) => ({
            t: r.t ?? r.time ?? r.idx ?? r.date ?? 0,
            v: Number(r.v ?? r.value ?? r.equity ?? r.price ?? r.pnl ?? 0),
          }))
          .filter((r: any) => Number.isFinite(r.v));
      } else {
        arr = parseCsv(text);
      }
      if (arr.length === 0) throw new Error("No valid rows");
      if (isBench) setBench(arr as any);
      else setSeries(arr as any);
      toast({
        title: isBench ? "Benchmark loaded" : "Data loaded",
        description: `${arr.length} rows`,
      });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Invalid file",
        variant: "destructive",
      });
    } finally {
      if (isBench && benchRef.current) benchRef.current.value = "";
      if (!isBench && dataRef.current) dataRef.current.value = "";
    }
  };

  const run = async () => {
    if (series.length === 0) {
      toast({
        title: "Missing data",
        description: "Upload historical data first",
        variant: "destructive",
      });
      return;
    }
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const payload = {
        data: series,
        benchmark: bench.length ? bench : undefined,
      };
      const r = await apiFetch("/api/v1/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 202)
        throw new Error(j.error || j.message || `HTTP ${r.status}`);
      // Fetch report after short delay
      setTimeout(async () => {
        try {
          const rr = await apiFetch("/api/reports/backtest?format=json");
          const rj = await rr.json().catch(() => ({}));
          const data = rj?.data || rj || null;
          setReport(data);
        } catch (e: any) {
          setError(e?.message || "Failed to fetch report");
        } finally {
          setRunning(false);
        }
      }, 800);
    } catch (e: any) {
      setError(e?.message || "Backtest failed");
      setRunning(false);
    }
  };

  const chartData = useMemo(() => {
    const eq = Array.isArray(report?.equityCurve) ? report.equityCurve : [];
    const init = eq[0]?.equity ?? 100000;
    // Build benchmark if provided; else flat baseline
    let benchSeries: Array<{ t: any; equity: number }> = [];
    if (bench.length) {
      const b0 = bench[0]?.v || 1;
      benchSeries = bench.map((b) => ({
        t: b.t,
        equity: init * (b.v / (b0 || 1)),
      }));
    } else if (eq.length) {
      benchSeries = eq.map((p: any) => ({ t: p.t, equity: init }));
    }
    const merged = eq.map((p: any, i: number) => ({
      t: p.t,
      equity: p.equity,
      benchmark:
        benchSeries[i]?.equity ?? benchSeries.find((x) => x.t === p.t)?.equity,
    }));
    return merged;
  }, [report, bench]);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <CardTitle>Backtesting Console</CardTitle>
        <HelpTip content="Upload historical data and run simulations. Results fetched from /api/v1/backtest and /api/reports/backtest." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Label>Historical data (CSV/JSON)</Label>
            </div>
            <Input
              ref={dataRef}
              type="file"
              accept=".csv,.json,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f, false);
              }}
            />
            {series.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Loaded {series.length} rows
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Benchmark (optional)</Label>
              <HelpTip content="Optional benchmark series; CSV/JSON with time,value columns." />
            </div>
            <Input
              ref={benchRef}
              type="file"
              accept=".csv,.json,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f, true);
              }}
            />
            {bench.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Loaded {bench.length} rows
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={run} disabled={running || series.length === 0}>
            {running ? "Running…" : "Run Backtest"}
          </Button>
          {report && (
            <div className="flex items-center gap-2 flex-wrap">
              {typeof report.sharpe === "number" && (
                <Badge variant="outline">Sharpe: {report.sharpe}</Badge>
              )}
              {typeof report.sortino === "number" && (
                <Badge variant="outline">Sortino: {report.sortino}</Badge>
              )}
              {typeof report.maxDrawdown === "number" && (
                <Badge variant="outline">
                  Max DD: {(report.maxDrawdown * 100).toFixed(1)}%
                </Badge>
              )}
              {typeof report.profitFactor === "number" && (
                <Badge variant="outline">PF: {report.profitFactor}</Badge>
              )}
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        {chartData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="equity"
                  name="Strategy"
                  stroke="#2563eb"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name="Benchmark"
                  stroke="#9CA3AF"
                  dot={false}
                  strokeDasharray="5 5"
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
