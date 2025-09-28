import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HelpTip from "@/components/ui/help-tip";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import apiFetch from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";

interface StrategyFlag {
  name: string;
  weight: number;
  enabled: boolean;
  last_run: string;
}
interface Breakdown {
  rsi: number;
  macd: number;
  ema: number;
  sma: number;
  atr: number;
  updated_at: string;
}
interface SignalsMetrics {
  per_source: Record<string, { rate: number; limit: number }>;
  per_user: { rate: number; limit: number };
}

export default function StrategiesSignals() {
  const { user } = useAuth();

  // Registry & weighting
  const [registry, setRegistry] = useState<StrategyFlag[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loadingRegistry, setLoadingRegistry] = useState(false);

  // Telemetry
  const [asset, setAsset] = useState("BTC");
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const lastBreakdown = useRef<Breakdown | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Sentiment & external signals
  const [sentiment, setSentiment] = useState<any | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [social, setSocial] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<SignalsMetrics | null>(null);

  // Explainability
  const [explainLimit, setExplainLimit] = useState<number>(10);

  // Builder controls
  const [signalThreshold, setSignalThreshold] = useState<number>(0.5);
  const [hedgePercent, setHedgePercent] = useState<number>(0.3);
  const [builderSaving, setBuilderSaving] = useState<{ threshold?: boolean; hedge?: boolean; weights?: boolean }>({});
  const thresholdTimer = useRef<number | null>(null);
  const hedgeTimer = useRef<number | null>(null);

  // Backtest
  const [btRunning, setBtRunning] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);
  const [btCurve, setBtCurve] = useState<Array<{ idx:number; value:number }>>([]);
  const [btWinRate, setBtWinRate] = useState<number | null>(null);
  const [btDrawdown, setBtDrawdown] = useState<number | null>(null);
  const [explainCaps, setExplainCaps] = useState<{
    default_limit: number;
    max_limit: number;
  } | null>(null);
  const [explainItems, setExplainItems] = useState<any[]>([]);
  const [explainLoading, setExplainLoading] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [modelId, setModelId] = useState<string>("");
  const [series, setSeries] = useState<string>("");
  const [modelExplain, setModelExplain] = useState<any | null>(null);
  const [modelExplainLoading, setModelExplainLoading] = useState(false);
  const [shapInput, setShapInput] = useState<string>("");
  const [shapResult, setShapResult] = useState<any | null>(null);

  // Stress Tests
  const [strategyId, setStrategyId] = useState<string>("");
  const [initialEquity, setInitialEquity] = useState<string>("10000");
  const [horizonDays, setHorizonDays] = useState<string>("30");
  const [confidence, setConfidence] = useState<string>("0.95");
  const [flashMagnitude, setFlashMagnitude] = useState<string>("");
  const [flashDuration, setFlashDuration] = useState<string>("");
  const [illiquidityMagnitude, setIlliquidityMagnitude] = useState<string>("");
  const [illiquidityDuration, setIlliquidityDuration] = useState<string>("");
  const [downtimeDuration, setDowntimeDuration] = useState<string>("");
  const [useOpenPositions, setUseOpenPositions] = useState<boolean>(true);
  const [stressLoading, setStressLoading] = useState(false);
  const [stressResult, setStressResult] = useState<any | null>(null);
  const [pinned, setPinned] = useState<boolean>(false);

  // Manual ingest console
  const [ingSource, setIngSource] = useState<string>(
    localStorage.getItem("manualIngest.source") || "tradingview",
  );
  const [ingUser, setIngUser] = useState<string>(
    localStorage.getItem("manualIngest.user") || "",
  );
  const [ingKey, setIngKey] = useState<string>(
    localStorage.getItem("manualIngest.key") || "",
  );
  const [ingAuth, setIngAuth] = useState<string>(
    localStorage.getItem("manualIngest.auth") || "",
  );
  const [ingSig, setIngSig] = useState<string>(
    localStorage.getItem("manualIngest.sig") || "",
  );
  const [ingPayload, setIngPayload] = useState<string>(
    localStorage.getItem("manualIngest.payload") ||
      '{"symbol":"BTC/USDT","signal":"buy"}',
  );

  // Error banner
  const [error, setError] = useState<string | null>(null);

  const persistIngestDraft = () => {
    localStorage.setItem("manualIngest.source", ingSource);
    localStorage.setItem("manualIngest.user", ingUser);
    localStorage.setItem("manualIngest.key", ingKey);
    localStorage.setItem("manualIngest.auth", ingAuth);
    localStorage.setItem("manualIngest.sig", ingSig);
    localStorage.setItem("manualIngest.payload", ingPayload);
  };

  // Loaders
  const loadRegistry = async () => {
    setLoadingRegistry(true);
    setError(null);
    try {
      const r = await apiFetch("/api/strategies/flags");
      const j = await r.json();
      const items: StrategyFlag[] = j.data || [];
      setRegistry(items);
      setWeights(Object.fromEntries(items.map((i) => [i.name, i.weight])));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingRegistry(false);
    }
  };

  const loadTelemetry = async () => {
    setTelemetryLoading(true);
    try {
      const r = await apiFetch("/api/strategies/breakdown");
      const j = await r.json();
      lastBreakdown.current = breakdown;
      setBreakdown(j.data);
    } catch {
    } finally {
      setTelemetryLoading(false);
    }
  };

  const loadSentiment = async () => {
    const a = asset.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,20}$/.test(a)) {
      toast({
        title: "Invalid symbol",
        description: "Use up to 20 alphanumerics",
        variant: "destructive",
      });
      return;
    }
    try {
      const s = await apiFetch(
        `/api/news/sentiment?asset=${encodeURIComponent(a)}`,
      );
      if (s.status === 422) {
        toast({
          title: "Invalid symbol",
          description: "Unsupported symbol",
          variant: "destructive",
        });
        return;
      }
      if (s.status === 502) {
        toast({
          title: "Provider error",
          description: "Upstream sentiment provider failed",
          variant: "destructive",
        });
        return;
      }
      const sj = await s.json();
      setSentiment(sj);
      const n = await apiFetch("/api/news/latest");
      setNews((await n.json()).items || []);
      const so = await apiFetch("/api/social/latest");
      setSocial((await so.json()).items || []);
      const m = await apiFetch("/api/signals/metrics");
      setMetrics(await m.json());
    } catch {}
  };

  const loadExplainability = async () => {
    setExplainLoading(true);
    try {
      const r = await apiFetch("/api/strategies/explain");
      const j = await r.json();
      setExplainCaps(j?.caps || null);
      setExplainItems(j?.items || []);
    } catch {
    } finally {
      setExplainLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const r = await apiFetch("/api/models");
      const j = await r.json();
      setModels(j?.data || j || []);
    } catch {}
  };

  useEffect(() => {
    loadRegistry();
    loadModels();
    loadExplainability();
    loadTelemetry();
    // Load builder defaults
    (async () => {
      try {
        const r = await apiFetch('/api/config');
        const j = await r.json().catch(() => ({}));
        const th = j?.data?.strategies?.SIGNAL_CONFIRMATION_THRESHOLD;
        if (typeof th === 'number') setSignalThreshold(th);
      } catch {}
      try {
        const r2 = await apiFetch('/api/hedge/percent');
        const j2 = await r2.json().catch(() => ({}));
        const hp = j2?.data?.hedgePercent ?? j2?.hedgePercent ?? j2?.percent;
        if (typeof hp === 'number') setHedgePercent(hp);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    const id = setInterval(loadTelemetry, 30000);
    return () => clearInterval(id);
  }, [breakdown]);
  useEffect(() => {
    if (strategyId) {
      const p = localStorage.getItem(`stressTest.pinned.${strategyId}`);
      if (p) {
        setPinned(JSON.parse(p));
      }
    }
  }, [strategyId]);

  const trend = (k: keyof Breakdown) => {
    if (!breakdown || !lastBreakdown.current) return null;
    const curr = breakdown[k];
    const prev = lastBreakdown.current[k];
    if (typeof curr !== "number" || typeof prev !== "number") return null;
    if (curr > prev)
      return <ArrowUp className="h-4 w-4 text-green-600 inline" />;
    if (curr < prev)
      return <ArrowDown className="h-4 w-4 text-red-600 inline" />;
    return null;
  };

  const submitReweight = async () => {
    try {
      const r = await apiFetch("/api/strategy/controller/reweight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({ detail: "Failed" }));
        throw new Error(j.detail || "Failed");
      }
      toast({ title: "Reweighted", description: "Strategy weights updated" });
      await loadRegistry();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed",
        variant: "destructive",
      });
    }
  };

  const toggleTrading = async (name: string, enabled: boolean) => {
    try {
      const r = await apiFetch(
        `/api/strategies/${encodeURIComponent(name)}/trading`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !enabled }),
        },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.detail || "Failed");
      setRegistry((prev) =>
        prev.map((p) =>
          p.name === name
            ? { ...p, enabled: !enabled, last_run: new Date().toISOString() }
            : p,
        ),
      );
      toast({
        title: !enabled ? "Enabled" : "Disabled",
        description: `${name} trading ${!enabled ? "enabled" : "disabled"}`,
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed",
        variant: "destructive",
      });
    }
  };

  // Immediate apply (debounced) helpers
  const applySignalThreshold = (val: number) => {
    setSignalThreshold(val);
    if (thresholdTimer.current) window.clearTimeout(thresholdTimer.current);
    thresholdTimer.current = window.setTimeout(async () => {
      setBuilderSaving((s) => ({ ...s, threshold: true }));
      try {
        const r = await apiFetch('/api/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { strategies: { SIGNAL_CONFIRMATION_THRESHOLD: val } }, actor: (user?.email || 'builder') }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message || 'Failed to save threshold');
        toast({ title: 'Updated', description: `SIGNAL_CONFIRMATION_THRESHOLD = ${val.toFixed(2)}` });
      } catch (e:any) {
        toast({ title: 'Error', description: e?.message || 'Save failed', variant: 'destructive' });
      } finally {
        setBuilderSaving((s) => ({ ...s, threshold: false }));
      }
    }, 400) as any;
  };

  const applyHedgePercent = (val: number) => {
    setHedgePercent(val);
    if (hedgeTimer.current) window.clearTimeout(hedgeTimer.current);
    hedgeTimer.current = window.setTimeout(async () => {
      setBuilderSaving((s) => ({ ...s, hedge: true }));
      try {
        const r = await apiFetch('/api/hedge/percent', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hedgePercent: val }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message || j?.detail || 'Failed to save hedge');
        toast({ title: 'Updated', description: `Hedge ratio = ${(val*100).toFixed(1)}%` });
      } catch (e:any) {
        toast({ title: 'Error', description: e?.message || 'Save failed', variant: 'destructive' });
      } finally {
        setBuilderSaving((s) => ({ ...s, hedge: false }));
      }
    }, 400) as any;
  };

  const applyWeightsImmediate = async (next: Record<string, number>) => {
    setBuilderSaving((s) => ({ ...s, weights: true }));
    try {
      const r = await apiFetch('/api/strategy/controller/reweight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.detail || 'Failed to apply weights');
      toast({ title: 'Weights applied', description: 'Strategy allocations updated' });
      await loadRegistry();
    } catch (e:any) {
      toast({ title: 'Error', description: e?.message || 'Failed', variant: 'destructive' });
    } finally {
      setBuilderSaving((s) => ({ ...s, weights: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Strategies & Signals</h1>
        <div className="flex items-center gap-2">
          <HelpTip content="Refresh strategy registry and telemetry data." />
          <Button variant="outline" onClick={loadRegistry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Registry
          </Button>
          <Button variant="outline" onClick={loadTelemetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="registry">
        <TabsList>
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="stress">Stress Tests</TabsTrigger>
          <TabsTrigger value="explain">Explainability</TabsTrigger>
          <TabsTrigger value="ingest">Manual Ingest</TabsTrigger>
        </TabsList>

        {/* Strategy Builder */}
        <TabsContent value="builder">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex items-start justify-between">
                <CardTitle>Signal Confirmation Threshold</CardTitle>
                <HelpTip content="Threshold (0-1) required to confirm signals across strategies. Changes apply immediately." />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Value</div>
                  <div className="text-sm font-medium">{signalThreshold.toFixed(2)}</div>
                </div>
                <Slider value={[signalThreshold]} min={0} max={1} step={0.01} onValueChange={(v) => applySignalThreshold(Number(v?.[0] ?? 0))} />
                <div className="text-xs text-muted-foreground">
                  {builderSaving.threshold ? 'Saving…' : 'Auto-applied'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-start justify-between">
                <CardTitle>Hedge Ratio</CardTitle>
                <HelpTip content="Portfolio hedge ratio (0-1). Updates /api/hedge/percent and applies immediately." />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="min-w-[110px]">Ratio</Label>
                  <Input type="number" step="0.01" min="0" max="1" value={hedgePercent} onChange={(e)=> applyHedgePercent(Math.max(0, Math.min(1, Number(e.target.value))))} />
                  <Badge variant="outline">{(hedgePercent*100).toFixed(1)}%</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {builderSaving.hedge ? 'Saving…' : 'Auto-applied'}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Per-Strategy Weights</CardTitle>
                <HelpTip content="Adjust weights using dropdowns. Changes are applied immediately via reweight API." />
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2">Strategy</th>
                        <th className="text-left p-2">Weight</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registry.map((r)=> (
                        <tr key={r.name} className="border-t">
                          <td className="p-2 font-medium">{r.name}</td>
                          <td className="p-2 w-56">
                            <Select
                              value={String((weights[r.name] ?? r.weight).toFixed(2))}
                              onValueChange={(val)=>{
                                const n = Number(val);
                                const next = { ...weights, [r.name]: n };
                                setWeights(next);
                                applyWeightsImmediate(next);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 21 }).map((_, i)=> (i*0.05).toFixed(2)).map((v)=> (
                                  <SelectItem key={v} value={v}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Badge variant={r.enabled ? 'outline':'destructive'}>{r.enabled ? 'enabled':'disabled'}</Badge>
                          </td>
                        </tr>
                      ))}
                      {registry.length===0 && (
                        <tr><td className="p-2 text-muted-foreground" colSpan={3}>No strategies</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{builderSaving.weights ? 'Applying…' : ''}</div>
              </CardContent>
            </Card>

            {/* Run Backtest */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-start justify-between">
                <CardTitle>Run Backtest</CardTitle>
                <HelpTip content="Runs a quick backtest using current builder settings. Tries /backtest/run, falls back to /api/strategies/backtest, then reads latest report." />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={async ()=>{
                      setBtError(null); setBtRunning(true); setBtCurve([]); setBtWinRate(null); setBtDrawdown(null);
                      try {
                        const payload:any = { config: { threshold: signalThreshold, weights, hedge: hedgePercent } };
                        let r = await apiFetch('/backtest/run', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
                        if (r.status === 404) {
                          r = await apiFetch('/api/strategies/backtest', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
                        }
                        const j = await r.json().catch(()=> ({}));
                        if (!r.ok && r.status !== 202) throw new Error(j.detail || j.message || `HTTP ${r.status}`);
                        // Fetch latest report
                        let report:any = null;
                        try {
                          const rr = await apiFetch('/api/reports/backtest?format=json');
                          report = await rr.json().catch(()=> ({}));
                        } catch {}
                        const data = report?.data || report || {};
                        const curve = Array.isArray(data?.equity) ? data.equity : (Array.isArray(data?.curve) ? data.curve : (Array.isArray(data?.series) ? data.series : []));
                        const points = (curve || []).map((v:any, i:number)=> ({ idx:i, value: typeof v === 'number' ? v : (v.value ?? v.pnl ?? 0) }));
                        setBtCurve(points);
                        const wr = Number(data?.win_rate ?? data?.winRate ?? 0);
                        setBtWinRate(isFinite(wr) ? wr : null);
                        const dd = Number(data?.max_drawdown ?? data?.drawdown ?? 0);
                        setBtDrawdown(isFinite(dd) ? dd : null);
                      } catch (e:any) {
                        setBtError(e?.message || 'Backtest failed');
                      } finally {
                        setBtRunning(false);
                      }
                    }}
                    disabled={btRunning}
                  >
                    {btRunning ? 'Running…' : 'Run Backtest'}
                  </Button>
                  {btError && <div className="text-sm text-red-600">{btError}</div>}
                </div>

                {(btCurve.length>0 || btWinRate!==null || btDrawdown!==null) && (
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={btCurve}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="idx" />
                            <YAxis />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">Win Rate</div>
                      <div className="text-2xl font-semibold">{btWinRate!==null ? `${(btWinRate*100).toFixed(1)}%` : '—'}</div>
                      <div className="text-sm">Max Drawdown</div>
                      <div className="text-2xl font-semibold">{btDrawdown!==null ? `${(btDrawdown*100).toFixed(1)}%` : '—'}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Registry & weighting */}
        <TabsContent value="registry">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <CardTitle>Strategy Registry</CardTitle>
              <div className="flex items-center gap-2">
                <HelpTip content="View and adjust per-strategy weights. Click Enable/Disable to toggle trading." />
                <Button variant="outline" onClick={submitReweight}>
                  Submit Allocations
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Weight</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Last Run</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registry.map((r) => (
                      <tr key={r.name} className="border-t">
                        <td className="p-2 font-medium">{r.name}</td>
                        <td className="p-2 w-40">
                          <Input
                            type="number"
                            step="0.01"
                            value={weights[r.name] ?? r.weight}
                            onChange={(e) =>
                              setWeights((prev) => ({
                                ...prev,
                                [r.name]: Number(e.target.value),
                              }))
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Badge
                            variant={r.enabled ? "outline" : "destructive"}
                          >
                            {r.enabled ? "enabled" : "disabled"}
                          </Badge>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {new Date(r.last_run).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleTrading(r.name, r.enabled)}
                          >
                            {r.enabled ? "Disable" : "Enable"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {registry.length === 0 && !loadingRegistry && (
                      <tr>
                        <td className="p-2 text-muted-foreground" colSpan={5}>
                          No strategies
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telemetry */}
        <TabsContent value="telemetry">
          <Card>
            <CardHeader className="flex items-start justify-between">
              <CardTitle>Market Indicator Telemetry</CardTitle>
              <HelpTip content="Live technical indicators for the selected asset with trend arrows." />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="max-w-[200px] w-full">
                  <div className="flex items-center gap-2">
                    <Label>Asset</Label>
                    <HelpTip content="Asset symbol to analyze (e.g., BTC)." />
                  </div>
                  <Input
                    value={asset}
                    onChange={(e) => setAsset(e.target.value.toUpperCase())}
                    placeholder="BTC"
                  />
                </div>
                <Button onClick={loadTelemetry} disabled={telemetryLoading}>
                  {telemetryLoading ? "Loading…" : "Fetch"}
                </Button>
              </div>
              {breakdown && (
                <div className="grid md:grid-cols-5 gap-3">
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle className="text-sm">RSI</CardTitle>
                      <HelpTip content="Relative Strength Index; momentum oscillator." />
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                      {breakdown.rsi} {trend("rsi")}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle className="text-sm">MACD</CardTitle>
                      <HelpTip content="Moving Average Convergence Divergence; trend strength." />
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                      {breakdown.macd} {trend("macd")}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle className="text-sm">EMA</CardTitle>
                      <HelpTip content="Exponential Moving Average." />
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                      {breakdown.ema} {trend("ema")}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle className="text-sm">SMA</CardTitle>
                      <HelpTip content="Simple Moving Average." />
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                      {breakdown.sma} {trend("sma")}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle className="text-sm">ATR</CardTitle>
                      <HelpTip content="Average True Range; volatility measure." />
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                      {breakdown.atr} {trend("atr")}
                    </CardContent>
                  </Card>
                </div>
              )}
              {!breakdown && (
                <div className="text-sm text-muted-foreground">
                  No telemetry yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sentiment */}
        <TabsContent value="sentiment">
          <Card>
            <CardHeader className="flex items-start justify-between">
              <CardTitle>Sentiment & Feeds</CardTitle>
              <HelpTip content="Aggregate news/social sentiment and feed activity for an asset." />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Label>Asset</Label>
                  <Input
                    value={asset}
                    onChange={(e) => setAsset(e.target.value.toUpperCase())}
                    placeholder="BTC"
                  />
                </div>
                <Button onClick={loadSentiment}>Load</Button>
              </div>
              {metrics && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metrics.per_source || {}).map(([name, m]) => (
                    <Badge
                      key={name}
                      variant={m.rate >= m.limit ? "destructive" : "outline"}
                    >
                      {name}: {m.rate}/{m.limit}
                    </Badge>
                  ))}
                  <Badge
                    variant={
                      metrics.per_user.rate >= metrics.per_user.limit
                        ? "destructive"
                        : "outline"
                    }
                  >
                    user: {metrics.per_user.rate}/{metrics.per_user.limit}
                  </Badge>
                </div>
              )}
              {sentiment && (
                <div className="flex items-center space-x-3">
                  <div>
                    Sentiment: <strong>{sentiment.sentiment}</strong>
                  </div>
                  <div className="text-xs">
                    Flags:{" "}
                    {Object.entries(sentiment.flags)
                      .filter(([_, v]) => v)
                      .map(([k]) => k)
                      .join(", ") || "none"}
                  </div>
                </div>
              )}

              {user?.role === "admin" && (
                <div className="border p-3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Replay News Failures</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const ok = window.confirm(
                          "This will call POST /api/news/replay-failures to flush and replay failed news jobs. Continue?",
                        );
                        if (!ok) return;
                        try {
                          const r = await apiFetch("/api/news/replay-failures", {
                            method: "POST",
                          });
                          const j = await r.json();
                          if (!r.ok) throw new Error(j.detail || "Failed");
                          toast({
                            title: "Replayed",
                            description: `Replayed ${j.flushed || 0} items`,
                          });
                        } catch (e: any) {
                          toast({
                            title: "Error",
                            description: e.message || "Failed",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Replay Failures
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Admin only
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium mb-2">News</div>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {news.map((n) => (
                      <li key={n.id}>{n.title}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-2">Social</div>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {social.map((s) => (
                      <li key={s.id}>
                        <span className="text-muted-foreground mr-1">
                          {s.author}
                        </span>
                        {s.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stress Tests */}
        <TabsContent value="stress">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Stress Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Strategy</Label>
                    <HelpTip content="Choose a registered strategy to test." />
                  </div>
                  <Select value={strategyId} onValueChange={setStrategyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {registry.map((r) => (
                        <SelectItem key={r.name} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Initial Equity (USD)</Label>
                    <HelpTip content="Starting capital for the stress test simulation." />
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={initialEquity}
                    onChange={(e) => setInitialEquity(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Horizon (days)</Label>
                    <HelpTip content="Simulation length in days." />
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={horizonDays}
                    onChange={(e) => setHorizonDays(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Confidence</Label>
                    <HelpTip content="Risk confidence level used for VaR/CVaR calculations." />
                  </div>
                  <Select value={confidence} onValueChange={setConfidence}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.9">90%</SelectItem>
                      <SelectItem value="0.95">95%</SelectItem>
                      <SelectItem value="0.99">99%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Flash magnitude (%)</Label>
                    <HelpTip content="Shock size as a percent move (negative for drop)." />
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={flashMagnitude}
                    onChange={(e) => setFlashMagnitude(e.target.value)}
                    placeholder="-20"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Flash duration (min)</Label>
                    <HelpTip content="Duration of the flash crash scenario in minutes." />
                  </div>
                  <Input
                    type="number"
                    value={flashDuration}
                    onChange={(e) => setFlashDuration(e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <input
                    type="checkbox"
                    checked={useOpenPositions}
                    onChange={(e) => setUseOpenPositions(e.target.checked)}
                  />
                  <span className="inline-flex items-center gap-2">
                    Use open positions{" "}
                    <HelpTip content="Include your current positions as starting state for scenarios." />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Illiquidity magnitude (%)</Label>
                    <HelpTip content="Spread widening or slippage as percent." />
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={illiquidityMagnitude}
                    onChange={(e) => setIlliquidityMagnitude(e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Illiquidity duration (min)</Label>
                    <HelpTip content="How long illiquidity persists in minutes." />
                  </div>
                  <Input
                    type="number"
                    value={illiquidityDuration}
                    onChange={(e) => setIlliquidityDuration(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Downtime duration (min)</Label>
                    <HelpTip content="Exchange or system downtime in minutes." />
                  </div>
                  <Input
                    type="number"
                    value={downtimeDuration}
                    onChange={(e) => setDowntimeDuration(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={
                    stressLoading ||
                    !strategyId ||
                    Number(initialEquity) <= 0 ||
                    Number(horizonDays) <= 0
                  }
                  onClick={async () => {
                    setStressLoading(true);
                    setPinned(false);
                    try {
                      const payload: any = {
                        strategy_id: strategyId,
                        initial_equity: Number(initialEquity),
                        horizon_days: Number(horizonDays),
                        confidence_level: Number(confidence),
                        use_open_positions: useOpenPositions,
                      };
                      if (flashMagnitude)
                        payload.flash_magnitude = Number(flashMagnitude) / 100;
                      if (flashDuration)
                        payload.flash_duration = Number(flashDuration);
                      if (illiquidityMagnitude)
                        payload.illiquidity_magnitude =
                          Number(illiquidityMagnitude) / 100;
                      if (illiquidityDuration)
                        payload.illiquidity_duration =
                          Number(illiquidityDuration);
                      if (downtimeDuration)
                        payload.downtime_duration = Number(downtimeDuration);
                      const r = await apiFetch("/api/strategies/stress-test", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      const j = await r.json();
                      if (!r.ok) {
                        toast({
                          title: "Error",
                          description: j.detail || "Stress test failed",
                          variant: "destructive",
                        });
                      } else {
                        setStressResult(j);
                        if (strategyId)
                          localStorage.setItem(
                            `stressTest.${strategyId}`,
                            JSON.stringify(j),
                          );
                      }
                    } catch {
                      toast({
                        title: "Error",
                        description: "Network error",
                        variant: "destructive",
                      });
                    } finally {
                      setStressLoading(false);
                    }
                  }}
                >
                  {stressLoading
                    ? "Running stress scenarios…"
                    : "Run Stress Test"}
                </Button>
                {stressResult && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!strategyId || !stressResult) return;
                      const blob = new Blob(
                        [JSON.stringify(stressResult, null, 2)],
                        { type: "application/json" },
                      );
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `stress_${strategyId}.json`;
                      a.click();
                    }}
                  >
                    Download JSON
                  </Button>
                )}
              </div>
              {stressResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Results ready
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={pinned ? "default" : "outline"}
                        onClick={() => {
                          const nv = !pinned;
                          setPinned(nv);
                          if (strategyId) {
                            localStorage.setItem(
                              `stressTest.pinned.${strategyId}`,
                              JSON.stringify(nv),
                            );
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {pinned ? "Pinned" : "Pin this run"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const rows = (stressResult.scenarios || []).map(
                            (s: any) => ({
                              name: s.name,
                              ...s.parameters,
                              ...s.metrics,
                            }),
                          );
                          const headers = Array.from(
                            rows.reduce(
                              (set: any, row: any) => {
                                Object.keys(row).forEach((k) => set.add(k));
                                return set;
                              },
                              new Set(["name"]),
                            ) as Set<string>,
                          );
                          const csv = [Array.from(headers).join(",")]
                            .concat(
                              rows.map((r: any) =>
                                Array.from(headers)
                                  .map((h: string) =>
                                    r[h] !== undefined ? r[h] : "",
                                  )
                                  .join(","),
                              ),
                            )
                            .join("\n");
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(
                            new Blob([csv], { type: "text/csv" }),
                          );
                          a.download = `stress_${strategyId}.csv`;
                          a.click();
                        }}
                      >
                        Download CSV
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStressResult(null)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Card>
                      <CardHeader>
                        <CardTitle>Max Drawdown</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">
                        {(stressResult.metrics?.max_drawdown * 100).toFixed(2)}%
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>VaR</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">
                        {(stressResult.metrics?.var * 100).toFixed(2)}%
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>CVaR</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">
                        {(stressResult.metrics?.cvar * 100).toFixed(2)}%
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Scenarios</div>
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Parameters</th>
                            <th className="text-left p-2">Metrics</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stressResult.scenarios || []).map((s: any) => (
                            <tr key={s.name} className="border-t">
                              <td className="p-2">{s.name}</td>
                              <td className="p-2">
                                {Object.entries(s.parameters || {})
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ") || "—"}
                              </td>
                              <td className="p-2">
                                {Object.entries(s.metrics || {})
                                  .map(
                                    ([k, v]) =>
                                      `${k}: ${typeof v === "number" ? v : String(v)}`,
                                  )
                                  .join(", ")}
                              </td>
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
        </TabsContent>

        {/* Explainability */}
        <TabsContent value="explain">
          <Card>
            <CardHeader className="flex items-start justify-between">
              <CardTitle>Explainability</CardTitle>
              <HelpTip content="Model rationales, SHAP features, and feature importances." />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Limit</Label>
                    <HelpTip content="Number of recent explainability items to show." />
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={explainLimit}
                    onChange={(e) => {
                      const n = Math.max(
                        1,
                        Math.min(
                          parseInt(e.target.value) || 10,
                          explainCaps?.max_limit || 50,
                        ),
                      );
                      setExplainLimit(n);
                    }}
                  />
                  {explainCaps && (
                    <div className="text-xs text-muted-foreground">
                      Showing {Math.min(explainLimit, explainCaps.max_limit)} of{" "}
                      {explainCaps.max_limit} max
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={loadExplainability}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>

              {explainLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {explainItems.map((it: any) => (
                    <Card key={it.request_id || it.timestamp}>
                      <CardHeader className="space-y-1">
                        <CardTitle className="text-base">
                          {it.strategy}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {new Date(it.timestamp).toLocaleString()}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {it.rationales && (
                          <div>
                            <div className="font-medium mb-1">Rationales</div>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                              {it.rationales.map((r: any, idx: number) => (
                                <li key={idx}>
                                  <span>{r.text}</span>
                                  {typeof r.weight === "number" && (
                                    <Badge variant="outline" className="ml-2">
                                      w {r.weight}
                                    </Badge>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {it.shap?.top_features && (
                          <div>
                            <div className="font-medium mb-1">Top Features</div>
                            <ul className="text-sm space-y-1">
                              {it.shap.top_features.map(
                                (f: any, idx: number) => (
                                  <li
                                    key={idx}
                                    className="flex items-center justify-between"
                                  >
                                    <span>{f.feature}</span>
                                    <span className="text-muted-foreground">
                                      {(f.weight * 100).toFixed(1)}%
                                    </span>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const blob = new Blob(
                                [JSON.stringify(it, null, 2)],
                                { type: "application/json" },
                              );
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `explain_${it.strategy}.json`;
                              a.click();
                            }}
                          >
                            Download rationale JSON
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Forecast model explainability */}
              <div className="pt-4 border-t">
                <div className="font-medium mb-2">
                  Forecast Model Explainability
                </div>
                <div className="grid md:grid-cols-3 gap-3 items-end">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Model</Label>
                      <HelpTip content="Select a forecasting model to explain." />
                    </div>
                    <Select value={modelId} onValueChange={setModelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m: any) => (
                          <SelectItem key={m.modelId} value={m.modelId}>
                            {m.name || m.modelId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Label>
                        Sample series (optional CSV/JSON of numbers)
                      </Label>
                      <HelpTip content="Optional overrides: provide numbers to run feature importance on." />
                    </div>
                    <Input
                      value={series}
                      onChange={(e) => setSeries(e.target.value)}
                      placeholder="1.2, 0.8, -0.3"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    disabled={!modelId || modelExplainLoading}
                    onClick={async () => {
                      setModelExplainLoading(true);
                      try {
                        let q = "";
                        if (series.trim()) {
                          const vals = series.includes("[")
                            ? JSON.parse(series)
                            : series
                                .split(/[\s,]+/)
                                .filter(Boolean)
                                .map(Number);
                          if (
                            !Array.isArray(vals) ||
                            vals.some(
                              (v: any) =>
                                typeof v !== "number" || Number.isNaN(v),
                            )
                          )
                            throw new Error("invalid series");
                          q = `?data=${encodeURIComponent(JSON.stringify(vals))}`;
                        }
                        const r = await apiFetch(
                          `/api/models/explain/${encodeURIComponent(modelId)}${q}`,
                        );
                        const j = await r.json();
                        if (!r.ok) throw new Error(j.detail || "Failed");
                        setModelExplain(j);
                      } catch (e: any) {
                        toast({
                          title: "Error",
                          description: e.message || "Failed",
                          variant: "destructive",
                        });
                      } finally {
                        setModelExplainLoading(false);
                      }
                    }}
                  >
                    {modelExplainLoading
                      ? "Explaining…"
                      : "Run Forecast Explainability"}
                  </Button>
                  {modelExplain && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const blob = new Blob(
                          [JSON.stringify(modelExplain, null, 2)],
                          { type: "application/json" },
                        );
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `model_explain_${modelId}.json`;
                        a.click();
                      }}
                    >
                      Download JSON
                    </Button>
                  )}
                </div>

                {modelExplain && (
                  <div className="mt-3">
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left p-2">Feature</th>
                            <th className="text-left p-2">Importance</th>
                            <th className="text-left p-2">Rank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modelExplain.features
                            ?.slice()
                            .sort(
                              (a: any, b: any) => b.importance - a.importance,
                            )
                            .map((f: any, idx: number) => (
                              <tr key={f.name} className="border-t">
                                <td className="p-2">{f.name}</td>
                                <td className="p-2">
                                  {(f.importance * 100).toFixed(1)}%
                                </td>
                                <td className="p-2">#{idx + 1}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin-only Manual SHAP explorer */}
              {user?.role === "admin" && (
                <div className="pt-6 border-t space-y-2">
                  <div className="font-medium">
                    Manual SHAP Explorer (Admin)
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 items-end">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label>Model</Label>
                        <HelpTip content="Select a forecasting model to explain." />
                      </div>
                      <Select value={modelId} onValueChange={setModelId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((m: any) => (
                            <SelectItem key={m.modelId} value={m.modelId}>
                              {m.name || m.modelId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2">
                        <Label>Input (JSON array or map of numbers)</Label>
                        <HelpTip content="Provide numeric features as array or object; JSON only." />
                      </div>
                      <Textarea
                        rows={4}
                        value={shapInput}
                        onChange={(e) => setShapInput(e.target.value)}
                        placeholder="[1.2, 0.4, -0.1, 2.3]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={!modelId}
                      onClick={async () => {
                        try {
                          const parsed = JSON.parse(shapInput);
                          if (
                            !Array.isArray(parsed) &&
                            typeof parsed !== "object"
                          )
                            throw new Error("Input must be array or object");
                          const r = await apiFetch(
                            `/api/shap/${encodeURIComponent(modelId)}`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ input: parsed }),
                            },
                          );
                          const text = await r.text();
                          let j: any = {};
                          if (text && text.trim().length) {
                            try {
                              j = JSON.parse(text);
                            } catch {
                              /* ignore parse error */
                            }
                          }
                          if (!r.ok)
                            throw new Error(j.detail || `HTTP ${r.status}`);
                          const data = j.data || j;
                          setShapResult(data);
                          toast({
                            title: "SHAP ready",
                            description: `Request ${(data?.request_id || "").toString()}`,
                          });
                        } catch (e: any) {
                          toast({
                            title: "Error",
                            description: e.message || "Failed",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Run SHAP
                    </Button>
                    {shapResult && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const blob = new Blob(
                            [JSON.stringify(shapResult, null, 2)],
                            { type: "application/json" },
                          );
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `shap_${modelId}.json`;
                          a.click();
                        }}
                      >
                        Download JSON
                      </Button>
                    )}
                  </div>
                  {shapResult && (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left p-2">Feature</th>
                            <th className="text-left p-2">SHAP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(shapResult.features || []).map((f: any) => (
                            <tr key={f.name} className="border-t">
                              <td className="p-2">{f.name}</td>
                              <td className="p-2">{f.shap}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual ingest */}
        <TabsContent value="ingest">
          <Card>
            <CardHeader className="flex items-start justify-between">
              <CardTitle>Manual Signal Ingest</CardTitle>
              <HelpTip content="Send a signal payload directly to the API for testing or integrations." />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const r = await apiFetch("/api/signals/metrics");
                      const j = await r.json();
                      setMetrics(j);
                      toast({
                        title: "Limits",
                        description: "Fetched current limits",
                      });
                    } catch {
                      toast({
                        title: "Error",
                        description: "Failed to load metrics",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  View Rate Limits
                </Button>
                <Button variant="ghost" size="sm" onClick={persistIngestDraft}>
                  Save draft
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="source">Source</Label>
                    <HelpTip content="Name of the provider/source (e.g., tradingview)." />
                  </div>
                  <Input
                    id="source"
                    placeholder="tradingview"
                    value={ingSource}
                    onChange={(e) => setIngSource(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="user">Target User (optional)</Label>
                    <HelpTip content="Route signal to a specific user (admin only)." />
                  </div>
                  <Input
                    id="user"
                    placeholder="user_123"
                    value={ingUser}
                    onChange={(e) => setIngUser(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="idk">X-Idempotency-Key</Label>
                    <HelpTip content="Unique key to deduplicate requests." />
                  </div>
                  <Input
                    id="idk"
                    placeholder="unique-key"
                    value={ingKey}
                    onChange={(e) => setIngKey(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="auth">
                      Authorization (Bearer …) (optional)
                    </Label>
                    <HelpTip content="Optional Bearer token sent to the ingest endpoint." />
                  </div>
                  <Input
                    id="auth"
                    placeholder="Bearer xxx"
                    value={ingAuth}
                    onChange={(e) => setIngAuth(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sig">X-Provider-Signature (optional)</Label>
                    <HelpTip content="Optional HMAC/signature proving payload origin." />
                  </div>
                  <Input
                    id="sig"
                    placeholder="hex-signature"
                    value={ingSig}
                    onChange={(e) => setIngSig(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="payload">Payload (JSON)</Label>
                    <HelpTip content="JSON only. Keep under 16KB. Validate before sending." />
                  </div>
                  <Textarea
                    id="payload"
                    rows={6}
                    value={ingPayload}
                    onChange={(e) => setIngPayload(e.target.value)}
                  />
                </div>
              </div>
              {metrics && (
                <div className="text-xs text-muted-foreground">
                  Per-user: {metrics.per_user.rate}/{metrics.per_user.limit}.
                  Sources:{" "}
                  {Object.entries(metrics.per_source)
                    .map(([k, v]) => `${k} ${v.rate}/${v.limit}`)
                    .join(" • ")}
                </div>
              )}
              <Button
                onClick={async () => {
                  try {
                    const bodyText = ingPayload || "{}";
                    JSON.parse(bodyText);
                  } catch {
                    toast({
                      title: "Invalid JSON",
                      description: "Fix payload JSON",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!ingKey || !/^[A-Za-z0-9_-]+$/.test(ingKey)) {
                    toast({
                      title: "Invalid idempotency key",
                      description: "Use A-Za-z0-9_-",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (ingPayload.length > 16 * 1024) {
                    toast({
                      title: "Payload too large",
                      description: "Max 16 KB",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    const headers: Record<string, string> = {
                      "Content-Type": "application/json",
                      "X-Idempotency-Key": ingKey,
                    };
                    if (ingUser) headers["X-Target-User"] = ingUser;
                    if (ingAuth) headers["Authorization"] = ingAuth;
                    if (ingSig) headers["X-Provider-Signature"] = ingSig;
                    const res = await apiFetch("/api/signals/ingest", {
                      method: "POST",
                      headers,
                      body: ingPayload,
                    });
                    if (res.status === 202) {
                      toast({
                        title: "Accepted",
                        description: "Signal queued",
                      });
                      return;
                    }
                    const j = await res
                      .json()
                      .catch(() => ({ detail: res.statusText || "Failed" }));
                    const map: Record<number, string> = {
                      400: "Bad request – check required fields and formats",
                      401: "Unauthorized – invalid or missing auth",
                      403: "Forbidden – your role lacks permission",
                      409: "Duplicate – idempotency key already used",
                      413: "Payload too large – reduce size",
                      422: "Validation failed – fix schema",
                      429: "Rate limited – slow down and retry later",
                      500: "Server error – try again later",
                      502: "Upstream provider error – try again later",
                      503: "Service unavailable – retry with backoff",
                    };
                    toast({
                      title: `HTTP ${res.status}`,
                      description:
                        j.detail || map[res.status] || "Request failed",
                      variant: "destructive",
                    });
                  } catch {
                    toast({
                      title: "Network error",
                      description: "Please check connection",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Validate & Send
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
