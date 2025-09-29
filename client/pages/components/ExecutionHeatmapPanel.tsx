import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HelpTip from "@/components/ui/help-tip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RefreshCw } from "lucide-react";
import apiFetch, { getJson } from "@/lib/apiClient";

interface RegimeRange {
  from: number;
  to: number;
}

interface HeatCell {
  p50Lat?: number;
  p95Lat?: number;
  p50Slip?: number;
  p95Slip?: number;
  fill?: number;
  symbol?: string;
  depthUsd?: number;
  predictedCost?: number;
  realizedCost?: number;
  discrepant?: boolean;
}

interface HeatRow {
  venue: string;
  byBucket: Record<string, HeatCell>;
}

const DISCREPANCY_THRESHOLD = 0.25;
const AUTO_REFRESH_MS = 30000;

const formatBucketLabel = (bucket: string) => {
  if (!bucket) return "-";
  const ts = Date.parse(bucket);
  if (Number.isFinite(ts)) {
    const date = new Date(ts);
    return `${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} ${date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (/^\d+$/.test(bucket)) {
    const num = Number(bucket);
    if (num > 1e10) {
      const date = new Date(num);
      if (!Number.isNaN(date.getTime())) {
        return `${date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })} ${date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
    }
  }
  return bucket;
};

const toCurrency = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
};

const getSlipGradient = (p95Slip?: number) => {
  const slip = Math.abs(p95Slip ?? 0);
  const intensity = Math.min(slip / 50, 1); // 50 bps -> full intensity
  return `rgba(239,68,68,${intensity})`;
};

const getLatencyGradient = (p95Lat?: number) => {
  const latency = Math.abs(p95Lat ?? 0);
  const intensity = Math.min(latency / 500, 1); // 500ms -> full intensity
  return `rgba(37,99,235,${intensity})`;
};

const diffPct = (pred?: number, real?: number) => {
  if (pred === undefined || real === undefined) return undefined;
  if (!Number.isFinite(pred) || !Number.isFinite(real)) return undefined;
  if (pred === 0) {
    if (Math.abs(real) === 0) return 0;
    return real > 0 ? 1 : -1;
  }
  return (real - pred) / Math.max(1e-9, Math.abs(pred));
};

export default function ExecutionHeatmapPanel({
  regimeRange,
}: {
  regimeRange?: RegimeRange | null;
}) {
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [symbolFilter, setSymbolFilter] = useState<string>("all");
  const [windowSize, setWindowSize] = useState<string>("1h");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [rows, setRows] = useState<HeatRow[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [discrepancies, setDiscrepancies] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const loadExecutionHeatmap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (venueFilter !== "all") params.set("venue", venueFilter);
      if (symbolFilter !== "all") params.set("symbol", symbolFilter);
      if (regimeRange) {
        params.set("from", String(regimeRange.from));
        params.set("to", String(regimeRange.to));
        params.set("window", "custom");
      } else {
        params.set("window", windowSize || "1h");
      }

      let latencyResp: any = null;
      const latencyEndpoints = [
        `/api/execution/latency?${params.toString()}`,
        `/execution/latency?${params.toString()}`,
      ];
      for (const ep of latencyEndpoints) {
        try {
          latencyResp = await getJson<any>(ep);
          if (latencyResp) break;
        } catch {}
      }
      const latencyItems: any[] = Array.isArray(latencyResp?.data)
        ? latencyResp.data
        : Array.isArray(latencyResp)
          ? latencyResp
          : [];

      let impactResp: any = null;
      const impactEndpoints = [
        `/api/execution/logs/realized?${params.toString()}`,
        `/api/execution/impact?${params.toString()}`,
        `/api/execution/realized-impact?${params.toString()}`,
        `/execution/logs/realized?${params.toString()}`,
        `/execution/impact?${params.toString()}`,
      ];
      for (const ep of impactEndpoints) {
        try {
          impactResp = await getJson<any>(ep);
          if (impactResp) break;
        } catch {}
      }
      const impactItems: any[] = Array.isArray(impactResp?.data)
        ? impactResp.data
        : Array.isArray(impactResp)
          ? impactResp
          : [];

      const symbolSet = new Set<string>();
      const latMap = new Map<string, HeatCell>();
      const bucketSet = new Set<string>();

      for (const it of latencyItems) {
        const venue = String(it.venue || it.exchange || it.name || "Unknown");
        const bucket = String(
          it.bucket || it.timeBucket || it.t || it.ts || it.hour || "0",
        );
        const symbol = String(it.symbol || it.pair || "").trim();
        if (symbol) symbolSet.add(symbol);
        if (symbolFilter !== "all" && symbol && symbol !== symbolFilter)
          continue;
        bucketSet.add(bucket);
        const key = `${venue}__${bucket}`;
        latMap.set(key, {
          p50Lat: Number(
            it.p50_latency_ms ?? it.p50 ?? it.lat_p50 ?? it.p50_latency,
          ) || 0,
          p95Lat: Number(
            it.p95_latency_ms ?? it.p95 ?? it.lat_p95 ?? it.p95_latency,
          ) || 0,
          p50Slip:
            Number(it.p50_slippage_bps ?? it.slip_p50 ?? it.p50_slip ?? 0) ||
            0,
          p95Slip:
            Number(it.p95_slippage_bps ?? it.slip_p95 ?? it.p95_slip ?? 0) ||
            0,
          fill:
            Number(it.fill_rate ?? it.fill ?? it.fills ?? it.fill_ratio ?? 0) ||
            0,
          symbol: symbol || undefined,
          depthUsd:
            Number(it.depth_usd ?? it.depthUsd ?? it.market_depth ?? 0) ||
            undefined,
        });
      }

      const merged: Record<string, HeatRow> = {};
      for (const it of impactItems) {
        const venue = String(it.venue || it.exchange || it.name || "Unknown");
        const bucket = String(
          it.bucket || it.timeBucket || it.t || it.ts || it.hour || "0",
        );
        const symbol = String(it.symbol || it.pair || "").trim();
        if (symbol) symbolSet.add(symbol);
        if (symbolFilter !== "all" && symbol && symbol !== symbolFilter)
          continue;
        bucketSet.add(bucket);
        const predicted = Number(
          it.predicted_cost ?? it.pred_cost ?? it.model_cost ?? 0,
        ) || 0;
        const realized = Number(
          it.realized_cost ?? it.realized ?? it.impact ?? it.slippage ?? 0,
        ) || 0;
        const key = `${venue}__${bucket}`;
        const base = latMap.get(key) || {};
        const discrepancy = diffPct(predicted, realized);
        const discrepant =
          discrepancy !== undefined
            ? Math.abs(discrepancy) > DISCREPANCY_THRESHOLD
            : Math.abs(realized) > 0;
        merged[venue] = merged[venue] || { venue, byBucket: {} };
        merged[venue].byBucket[bucket] = {
          ...base,
          symbol: base.symbol || (symbol || undefined),
          predictedCost: predicted,
          realizedCost: realized,
          discrepant,
        };
      }

      for (const [key, base] of latMap.entries()) {
        const [venue, bucket] = key.split("__");
        merged[venue] = merged[venue] || { venue, byBucket: {} };
        merged[venue].byBucket[bucket] = {
          ...merged[venue].byBucket[bucket],
          ...base,
        };
      }

      let bucketList = Array.from(bucketSet).sort((a, b) =>
        String(a).localeCompare(String(b)),
      );
      if (regimeRange) {
        const inRange = (raw: string) => {
          const ts = Date.parse(raw);
          if (Number.isFinite(ts)) return ts >= regimeRange.from && ts <= regimeRange.to;
          const numeric = Number(raw);
          if (Number.isFinite(numeric) && numeric > 1e9) {
            return numeric >= regimeRange.from && numeric <= regimeRange.to;
          }
          return true;
        };
        bucketList = bucketList.filter(inRange);
        for (const row of Object.values(merged)) {
          for (const keyBucket of Object.keys(row.byBucket)) {
            if (!inRange(keyBucket)) delete row.byBucket[keyBucket];
          }
        }
      }

      const tableRows = Object.values(merged)
        .map((row) => ({
          ...row,
          byBucket: bucketList.reduce<Record<string, HeatCell>>((acc, bucket) => {
            const cell = row.byBucket[bucket];
            if (symbolFilter !== "all" && symbolFilter && cell?.symbol) {
              if (cell.symbol !== symbolFilter) {
                return { ...acc, [bucket]: undefined as unknown as HeatCell };
              }
            }
            return { ...acc, [bucket]: cell };
          }, {}),
        }))
        .filter((row) =>
          venueFilter === "all"
            ? Object.values(row.byBucket).some((c) => c !== undefined)
            : row.venue === venueFilter,
        )
        .sort((a, b) => a.venue.localeCompare(b.venue));

      let discrepancyCount = 0;
      for (const row of tableRows) {
        for (const bucket of bucketList) {
          const cell = row.byBucket[bucket];
          if (cell?.discrepant) discrepancyCount++;
        }
      }

      setBuckets(bucketList);
      setRows(tableRows);
      setSymbols(["all", ...Array.from(symbolSet).sort()]);
      setDiscrepancies(discrepancyCount);
    } catch (err) {
      console.error("ExecutionHeatmapPanel", err);
      setError("Failed to load execution metrics");
    } finally {
      setLoading(false);
    }
  }, [venueFilter, symbolFilter, windowSize, regimeRange]);

  useEffect(() => {
    loadExecutionHeatmap();
  }, [loadExecutionHeatmap]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      loadExecutionHeatmap();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [autoRefresh, loadExecutionHeatmap]);

  const venueOptions = useMemo(() => {
    const venues = new Set<string>();
    for (const row of rows) venues.add(row.venue);
    return ["all", ...Array.from(venues).sort()];
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <CardTitle className="inline-flex items-center gap-2">Execution Heatmap</CardTitle>
          <CardDescription>
            Venue × time buckets comparing latency (P50/P95) and slippage from /execution/latency and realized impact logs
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {discrepancies > 0 && (
            <Badge variant="destructive">Δ {discrepancies}</Badge>
          )}
          <HelpTip content="Highlights predicted vs realized execution cost deltas. Background gradient blends slippage (red) and latency (blue)." />
          <Button
            variant="outline"
            size="sm"
            onClick={loadExecutionHeatmap}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label>Venue</Label>
              <HelpTip content="Filter to a single venue or view all." />
            </div>
            <Select value={venueFilter} onValueChange={setVenueFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All venues" />
              </SelectTrigger>
              <SelectContent>
                {venueOptions.map((venue) => (
                  <SelectItem key={venue} value={venue}>
                    {venue === "all" ? "All" : venue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label>Symbol</Label>
              <HelpTip content="Filter metrics for a specific trading pair." />
            </div>
            <Select value={symbolFilter} onValueChange={setSymbolFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All symbols" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol === "all" ? "All" : symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label>Window</Label>
              <HelpTip content="Aggregation window when no custom regime range is applied." />
            </div>
            <Select
              value={windowSize}
              onValueChange={setWindowSize}
              disabled={!!regimeRange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="6h">6 hours</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Auto-refresh</Label>
              <HelpTip content="Refresh execution metrics every 30 seconds." />
            </div>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Venue</th>
                {buckets.map((bucket) => (
                  <th key={bucket} className="p-2 text-center">
                    {formatBucketLabel(bucket)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    className="p-3 text-muted-foreground"
                    colSpan={Math.max(1, buckets.length + 1)}
                  >
                    {loading ? "Loading execution metrics…" : "No execution data"}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.venue} className="border-b">
                  <td className="p-2 font-medium">{row.venue}</td>
                  {buckets.map((bucket) => {
                    const cell = row.byBucket[bucket];
                    const slipColor = getSlipGradient(cell?.p95Slip);
                    const latencyColor = getLatencyGradient(cell?.p95Lat);
                    const diff = diffPct(cell?.predictedCost, cell?.realizedCost);
                    const diffLabel = diff !== undefined ? `${(diff * 100).toFixed(1)}%` : "-";
                    const costSummary = cell
                      ? `${(cell.predictedCost ?? 0).toFixed(2)} → ${(cell.realizedCost ?? 0).toFixed(2)}`
                      : "";
                    const gradient = cell
                      ? `linear-gradient(135deg, ${slipColor} 0%, ${slipColor} 60%, ${latencyColor} 60%, ${latencyColor} 100%)`
                      : undefined;
                    return (
                      <td key={`${row.venue}_${bucket}`} className="p-1 align-top">
                        <div
                          className={`h-full rounded-md border border-border/40 bg-muted/20 p-2 ${cell?.discrepant ? "ring-1 ring-destructive" : ""}`}
                          style={{
                            background: cell ? gradient : undefined,
                          }}
                          title={cell ? `Symbol: ${cell.symbol || "-"}\nDepth: ${toCurrency(cell.depthUsd)}\nLatency P50/P95: ${Math.round(cell.p50Lat ?? 0)} / ${Math.round(cell.p95Lat ?? 0)} ms\nSlip P50/P95: ${(cell.p50Slip ?? 0).toFixed(2)} / ${(cell.p95Slip ?? 0).toFixed(2)} bps\nFill: ${formatPercent(cell.fill ?? 0)}\nPredicted vs Realized: ${costSummary}` : "No data"}
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{formatBucketLabel(bucket)}</span>
                            {cell?.discrepant && (
                              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                                Δ
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 space-y-[2px] text-[11px]">
                            <div className="flex items-center justify-between">
                              <span>Latency</span>
                              <span>{cell ? `${Math.round(cell.p50Lat ?? 0)}/${Math.round(cell.p95Lat ?? 0)} ms` : "—"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Slippage</span>
                              <span>{cell ? `${(cell.p50Slip ?? 0).toFixed(1)}/${(cell.p95Slip ?? 0).toFixed(1)} bps` : "—"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Δ cost</span>
                              <span
                                className={
                                  diff !== undefined
                                    ? diff > DISCREPANCY_THRESHOLD
                                      ? "text-destructive"
                                      : diff < -DISCREPANCY_THRESHOLD
                                        ? "text-accent"
                                        : ""
                                    : ""
                                }
                              >
                                {diffLabel}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Fill</span>
                              <span>{cell ? formatPercent(cell.fill ?? 0) : "-"}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
