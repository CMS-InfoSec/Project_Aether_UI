import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import HelpTip from "@/components/ui/help-tip";
import apiFetch from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Line,
} from "recharts";

function parseCsv(
  text: string,
): Array<{ t: string; price: number; volume: number }> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(/,|\t/).map((h) => h.trim().toLowerCase());
  const idxT = header.findIndex((h) => /time|t/.test(h));
  const idxP = header.findIndex((h) => /price|p/.test(h));
  const idxV = header.findIndex((h) => /vol|size|v/.test(h));
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/,|\t/).map((c) => c.trim());
    const t = idxT >= 0 ? cols[idxT] : new Date().toISOString();
    const price = Number(cols[idxP >= 0 ? idxP : 0]);
    const volume = Number(cols[idxV >= 0 ? idxV : 1]);
    if (Number.isFinite(price) && price > 0)
      rows.push({
        t,
        price,
        volume: Number.isFinite(volume) && volume > 0 ? volume : 1,
      });
  }
  return rows;
}

export default function ExecutionSimulatorPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [method, setMethod] = useState<"TWAP" | "VWAP" | "MARKET">("TWAP");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<string>("100");
  const [slices, setSlices] = useState<string>("10");
  const [orderBook, setOrderBook] = useState<
    Array<{ t: string; price: number; volume: number }>
  >([]);
  const [result, setResult] = useState<any | null>(null);
  const [running, setRunning] = useState(false);

  const upload = async (file: File) => {
    try {
      const text = await file.text();
      let data: any[] = [];
      if (/^\s*\[/.test(text) || /^\s*\{/.test(text)) {
        const json = JSON.parse(text);
        data = Array.isArray(json) ? json : json.data || json.rows || [];
      } else {
        data = parseCsv(text);
      }
      const parsed = data
        .map((r: any) => ({
          t: String(
            r.t || r.time || r.ts || r.date || new Date().toISOString(),
          ),
          price: Number(r.price || r.p),
          volume: Number(r.volume || r.v || r.size || 1),
        }))
        .filter((r: any) => Number.isFinite(r.price) && r.price > 0)
        .map((r: any) => ({
          ...r,
          volume: Number.isFinite(r.volume) && r.volume > 0 ? r.volume : 1,
        }));
      if (parsed.length === 0) throw new Error("No valid rows");
      setOrderBook(parsed);
      toast({
        title: "Order book loaded",
        description: `${parsed.length} rows`,
      });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Invalid file",
        variant: "destructive",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const simulate = async () => {
    if (orderBook.length === 0) {
      toast({
        title: "Missing data",
        description: "Upload order book first",
        variant: "destructive",
      });
      return;
    }
    setRunning(true);
    try {
      const body = {
        method,
        side,
        quantity: Number(quantity),
        slices: Number(slices),
        orderBook,
      };
      const r = await apiFetch("/api/v1/execution/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Failed");
      setResult(j.data || j);
    } catch (e: any) {
      toast({
        title: "Simulation failed",
        description: e?.message || "Error",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const chartData = useMemo(
    () =>
      (result?.perSlice || result?.chart || []).map((d: any) => ({
        t: d.t,
        cumCost: d.cumCost ?? d.cumcost ?? d.value ?? 0,
      })),
    [result],
  );

  const slipData = useMemo(() => {
    const rows = Array.isArray(result?.perSlice) ? result.perSlice : [];
    if (!rows.length || !result?.summary) return [] as any[];
    const benchPx = Number(result.summary.benchmarkPrice) || 0;
    const buy = String(side).toLowerCase() !== "sell";
    let cumQty = 0;
    let cumCost = 0;
    let cumBench = 0;
    let cumSlip = 0;
    const out: any[] = [];
    for (const r of rows) {
      const qty = Number(r.qty) || 0;
      const px = Number(r.price) || 0;
      const qSigned = (buy ? 1 : -1) * qty;
      cumQty += Math.abs(qSigned);
      cumCost += (buy ? 1 : -1) * qty * px;
      cumBench += (buy ? 1 : -1) * qty * benchPx;
      cumSlip = cumCost - cumBench; // positive is worse for buys
      const notional = Math.max(1e-9, cumQty * benchPx);
      const pct = cumSlip / notional;
      out.push({ t: r.t, cumSlipUsd: cumSlip, cumSlipPct: pct });
    }
    return out;
  }, [result, side]);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <CardTitle>Execution Simulator</CardTitle>
        <HelpTip content="Select execution style, upload order book (CSV/JSON). Shows cost and slippage-adjusted return. Source: /api/v1/execution/simulate." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <div className="flex items-center gap-2">
              <Label>Method</Label>
              <HelpTip content="TWAP, VWAP, or market order." />
            </div>
            <Select value={method} onValueChange={(v) => setMethod(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TWAP">TWAP</SelectItem>
                <SelectItem value="VWAP">VWAP</SelectItem>
                <SelectItem value="MARKET">Market</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Side</Label>
            </div>
            <Select value={side} onValueChange={(v) => setSide(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Quantity</Label>
            </div>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              min="0"
              step="0.0001"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Slices</Label>
              <HelpTip content="Number of slices for TWAP (VWAP uses volume weights; market ignores)." />
            </div>
            <Input
              value={slices}
              onChange={(e) => setSlices(e.target.value)}
              type="number"
              min="1"
              step="1"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label>Order book data (CSV/JSON)</Label>
          </div>
          <Input
            ref={fileRef}
            type="file"
            accept=".csv,.json,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          {orderBook.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Loaded {orderBook.length} rows
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={simulate}
            disabled={running || orderBook.length === 0}
          >
            {running ? "Simulating…" : "Run Simulation"}
          </Button>
          {result?.summary && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                Avg Px: {Number(result.summary.avgPrice).toFixed(4)}
              </Badge>
              <Badge variant="outline">
                Bench: {Number(result.summary.benchmarkPrice).toFixed(4)}
              </Badge>
              <Badge
                variant={
                  Number(result.summary.slippageBps) > 0
                    ? "destructive"
                    : "outline"
                }
              >
                Slippage: {Number(result.summary.slippageBps).toFixed(2)} bps
              </Badge>
            </div>
          )}
        </div>

        {chartData.length > 0 && (
          <div>
            <div className="font-medium mb-1">Cumulative Cost</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                  />
                  <YAxis />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="cumCost"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {slipData.length > 0 && (
          <div>
            <div className="font-medium mb-1">Slippage-adjusted Return</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={slipData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    tickFormatter={(v) => `${(Number(v) * 100).toFixed(2)}%`}
                  />
                  <RechartsTooltip
                    formatter={(v) =>
                      typeof v === "number" ? `${(v * 100).toFixed(2)}%` : v
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="cumSlipPct"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {result?.perSlice && (
          <div>
            <div className="font-medium mb-2">Per-slice executions</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Qty</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Cost</th>
                    <th className="text-left p-2">Cum Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perSlice.map((r: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 whitespace-nowrap">
                        {new Date(r.t).toLocaleTimeString()}
                      </td>
                      <td className="p-2">{Number(r.qty).toFixed(4)}</td>
                      <td className="p-2">{Number(r.price).toFixed(4)}</td>
                      <td className="p-2">{Number(r.cost).toFixed(2)}</td>
                      <td className="p-2">{Number(r.cumCost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
