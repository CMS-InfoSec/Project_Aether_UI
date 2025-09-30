import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import HelpTip from "@/components/ui/help-tip";
import { useToast } from "@/hooks/use-toast";
import { postJson } from "@/lib/apiClient";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

function parseCsvMatrix(text: string): { symbols: string[]; matrix: number[][] } {
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split(/,|\t/).map((c) => c.trim()));
  if (rows.length < 2) throw new Error("CSV must include header and rows");
  let symbols: string[] = [];
  let startCol = 0;
  // Detect if first cell is blank or non-numeric label
  if (rows[0][0] === "" || isNaN(Number(rows[1][0]))) {
    symbols = rows[0].slice(1).map((s) => s.toUpperCase());
    startCol = 1;
  } else {
    symbols = rows[0].map((s) => s.toUpperCase());
  }
  const matrix: number[][] = [];
  for (let i = 1; i < rows.length; i++) {
    const entries = rows[i].slice(startCol);
    if (entries.length !== symbols.length)
      throw new Error("Row length does not match symbols length");
    const nums = entries.map((v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error("Invalid number in CSV");
      return n;
    });
    matrix.push(nums);
  }
  if (matrix.length !== symbols.length) throw new Error("Matrix must be square");
  return { symbols, matrix };
}

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#eab308",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#f43f5e",
  "#14b8a6",
];

export default function PortfolioOptimizerPanel() {
  const { toast } = useToast();
  const [covarianceId, setCovarianceId] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [expected, setExpected] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<"kelly" | "markowitz" | "risk-parity">("markowitz");
  const [riskAversion, setRiskAversion] = useState<number>(1);
  const [maxWeight, setMaxWeight] = useState<number>(0.5);
  const [running, setRunning] = useState(false);
  const [allocations, setAllocations] = useState<Array<{ symbol: string; weight: number }>>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Removed dependency on backend optimizer state; covariance managed client-side

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      let payload: { symbols: string[]; matrix: number[][] };
      if (/^\s*\{/.test(text)) {
        const j = JSON.parse(text);
        if (!Array.isArray(j.symbols) || !Array.isArray(j.matrix)) throw new Error("Invalid JSON format");
        payload = { symbols: j.symbols, matrix: j.matrix };
      } else {
        payload = parseCsvMatrix(text);
      }
      setCovarianceId(null);
      setSymbols(payload.symbols);
      setMatrix(payload.matrix);
      setExpected(Object.fromEntries(payload.symbols.map((s: string) => [s, 0.01])));
      toast({ title: "Uploaded", description: `Loaded ${payload.symbols.length} assets` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || "Invalid file", variant: "destructive" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const run = async () => {
    if (!matrix || symbols.length === 0) {
      toast({ title: "Missing covariance", description: "Upload a covariance matrix first", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const body: any = { method, expectedReturns: expected, riskAversion, riskLimits: { maxWeight }, symbols, matrix };
      const r = await postJson<any>("/api/v1/portfolio/optimize", body);
      if (r?.allocations) setAllocations(r.allocations);
      toast({ title: "Optimization complete", description: `${method === "kelly" ? "Kelly" : method === 'risk-parity' ? 'Risk Parity' : "Markowitz"} allocations ready` });
    } catch (e: any) {
      toast({ title: "Optimization failed", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const chartData = useMemo(() => {
    return allocations.map((a) => ({ name: a.symbol, value: Math.max(0, a.weight) }));
  }, [allocations]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex items-start justify-between">
        <CardTitle>Portfolio Optimizer</CardTitle>
        <HelpTip content="Upload covariance, set expected returns, choose optimization (Kelly/Markowitz/Risk-Parity), set risk limits, and compute allocations." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Label>Covariance matrix (CSV or JSON)</Label>
              <HelpTip content="CSV with header row/col of symbols, or JSON { symbols, matrix }" />
            </div>
            <Input ref={fileRef} type="file" accept=".csv,.json,.txt" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
            {symbols.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">Loaded: {symbols.join(", ")}</div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Method</Label>
              <HelpTip content="Kelly uses w=Σ⁻¹μ clipped to >=0. Markowitz uses mean-variance with risk aversion. Risk-Parity targets equal risk contribution (proxied by inverse-variance)." />
            </div>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="m-mark" value="markowitz" />
                <Label htmlFor="m-mark">Markowitz</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="m-kelly" value="kelly" />
                <Label htmlFor="m-kelly">Kelly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="m-rp" value="risk-parity" />
                <Label htmlFor="m-rp">Risk-Parity</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 items-end">
          {method === "markowitz" && (
            <div>
              <div className="flex items-center gap-2">
                <Label>Risk aversion (λ)</Label>
                <HelpTip content="Higher λ penalizes variance more strongly." />
              </div>
              <Input type="number" step="0.1" min="0.1" value={riskAversion} onChange={(e) => setRiskAversion(Math.max(0.1, Number(e.target.value) || 1))} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Label>Max weight</Label>
              <HelpTip content="Cap any single asset weight; post-cap weights are renormalized." />
            </div>
            <Input type="number" step="0.01" min="0.01" max="1" value={maxWeight} onChange={(e)=> setMaxWeight(Math.max(0.01, Math.min(1, Number(e.target.value)||0.5)))} />
          </div>
        </div>

        {symbols.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Expected returns (per period)</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setExpected(Object.fromEntries(symbols.map((s) => [s, 0.01]))) }>
                  Set all 1%
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExpected(Object.fromEntries(symbols.map((s) => [s, 0]))) }>
                  Set all 0%
                </Button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              {symbols.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Label className="min-w-[64px]">{s}</Label>
                  <Input type="number" step="0.0001" value={expected[s] ?? 0} onChange={(e) => setExpected((prev) => ({ ...prev, [s]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button disabled={running || symbols.length === 0} onClick={run}>
            {running ? "Optimizing…" : "Run Optimization"}
          </Button>
          {allocations.length > 0 && (
            <Badge variant="outline">{allocations.length} assets</Badge>
          )}
        </div>

        {allocations.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip />
                  <Legend />
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="font-medium mb-2">Allocations</div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Asset</th>
                      <th className="text-left p-2">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations
                      .slice()
                      .sort((a, b) => b.weight - a.weight)
                      .map((a) => (
                        <tr key={a.symbol} className="border-t">
                          <td className="p-2">{a.symbol}</td>
                          <td className="p-2">{(a.weight * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
