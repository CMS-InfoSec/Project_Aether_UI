import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import HelpTip from "@/components/ui/help-tip";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiFetch, { postJson } from "@/lib/apiClient";
import { RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart as ReBarChart,
  Bar as ReBar,
  Tooltip as ReTooltip,
  Legend as ReLegend,
} from "recharts";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

interface ScenarioConfig {
  name: string;
  priceJumpPct: number; // +/- percent
  volSpikePct: number; // percent
  spreadWidenBps: number; // basis points
  liquidityDrainPct: number; // percent of depth removed
  durationMin: number; // minutes for shock window
}

interface RunMetrics {
  maxDrawdownPct?: number;
  finalPnl?: number;
  fillQuality?: number; // 0-1
}

interface RunResult {
  id: string;
  name: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number; // 0-100
  curve: Array<{ t: number; pnl: number }>;
  actions: Array<{ t: number; action: string; detail?: string }>; // timeline
  metrics: RunMetrics;
  raw?: any;
}

type AgentProfile = {
  type: "market_maker" | "arbitrage_bot" | "momentum_trader" | "spoofer";
  count: number;
  aggression: number;
  capital: number;
};

type AgentsRunResult = {
  id: string;
  pnl: Array<{ agent: string; pnl: number }>;
  spread_over_time: Array<{ t: number; spread_bps: number }>;
  metrics: {
    stability_index: number;
    avg_spread_bps: number;
    spread_vol_bps: number;
    midprice_drift_bps: number;
  };
  cfg: { profiles: AgentProfile[]; seed?: number; steps?: number };
};

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ef4444",
  "#9333ea",
  "#f59e0b",
  "#06b6d4",
];

function mapResult(raw: any): {
  curve: Array<{ t: number; pnl: number }>;
  metrics: RunMetrics;
  actions: Array<{ t: number; action: string; detail?: string }>;
} {
  const d = raw?.data || raw || {};
  // PnL time series mapping (fallbacks)
  const series = Array.isArray(d.pnl)
    ? d.pnl
    : Array.isArray(d.curve)
      ? d.curve
      : Array.isArray(d.series)
        ? d.series
        : Array.isArray(d.chart)
          ? d.chart
          : [];
  const curve = series.map((v: any, i: number) => {
    if (typeof v === "number") return { t: i, pnl: v };
    const t = v.t ?? v.ts ?? v.time ?? i;
    const pnl = v.pnl ?? v.value ?? v.equity ?? v.cumCost ?? 0;
    return { t: Number(t), pnl: Number(pnl) };
  });
  // Metrics
  const maxDrawdownPct = (() => {
    const dd =
      d.max_drawdown ??
      d.maxDrawdown ??
      d.metrics?.max_drawdown ??
      d.metrics?.dd;
    return typeof dd === "number" ? dd : undefined;
  })();
  const finalPnl = curve.length
    ? curve[curve.length - 1].pnl
    : typeof d.final_pnl === "number"
      ? d.final_pnl
      : undefined;
  const fillQuality = (() => {
    const fq =
      d.fill_quality ?? d.execution?.fill_quality ?? d.metrics?.fill_quality;
    return typeof fq === "number" ? fq : undefined;
  })();
  // Actions timeline
  const actsSrc = Array.isArray(d.actions)
    ? d.actions
    : Array.isArray(d.events)
      ? d.events
      : [];
  const actions = actsSrc.map((a: any, i: number) => ({
    t: Number(a.t ?? a.ts ?? i),
    action: String(a.action || a.type || "event"),
    detail: a.detail || a.note,
  }));
  return { curve, metrics: { maxDrawdownPct, finalPnl, fillQuality }, actions };
}

export default function ScenarioLab() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<ScenarioConfig>({
    name: "Custom",
    priceJumpPct: -5,
    volSpikePct: 50,
    spreadWidenBps: 50,
    liquidityDrainPct: 30,
    durationMin: 30,
  });
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [agentsCfg, setAgentsCfg] = useState<{
    profiles: AgentProfile[];
    seed?: number;
    steps?: number;
  }>({
    profiles: [
      { type: "market_maker", count: 3, aggression: 0.4, capital: 1 },
      { type: "arbitrage_bot", count: 2, aggression: 0.6, capital: 0.8 },
      { type: "momentum_trader", count: 3, aggression: 0.7, capital: 0.6 },
      { type: "spoofer", count: 1, aggression: 0.9, capital: 0.2 },
    ],
    seed: 42,
    steps: 200,
  });
  const [agentRuns, setAgentRuns] = useState<AgentsRunResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("agent_runs") || "[]");
    } catch {
      return [];
    }
  });
  const [selAgentRuns, setSelAgentRuns] = useState<Record<string, boolean>>({});
  const progressTimers = useRef<Record<string, any>>({});

  const presets: ScenarioConfig[] = [
    {
      name: "Flash Crash",
      priceJumpPct: -20,
      volSpikePct: 80,
      spreadWidenBps: 150,
      liquidityDrainPct: 70,
      durationMin: 20,
    },
    {
      name: "Volatility Spike",
      priceJumpPct: 0,
      volSpikePct: 120,
      spreadWidenBps: 40,
      liquidityDrainPct: 20,
      durationMin: 60,
    },
    {
      name: "Liquidity Drain",
      priceJumpPct: -5,
      volSpikePct: 30,
      spreadWidenBps: 80,
      liquidityDrainPct: 80,
      durationMin: 45,
    },
  ];

  const selectedRuns = useMemo(
    () => runs.filter((r) => selected[r.id]),
    [runs, selected],
  );

  const startProgress = (id: string) => {
    // Fallback local progress if server doesn't report
    const tick = () =>
      setRuns((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                progress: Math.min(
                  99,
                  r.progress + Math.max(1, Math.round((100 - r.progress) / 20)),
                ),
              }
            : r,
        ),
      );
    progressTimers.current[id] = window.setInterval(tick, 800);
  };
  const stopProgress = (id: string) => {
    const t = progressTimers.current[id];
    if (t) window.clearInterval(t);
    delete progressTimers.current[id];
  };

  const buildOrderBook = (c: ScenarioConfig) => {
    const points: Array<{ t: string; price: number; volume: number }> = [];
    const N = Math.max(10, Math.min(600, Math.round(c.durationMin * 2)));
    const base = 100;
    const jump = base * (c.priceJumpPct / 100);
    const spreadInfl = Math.max(0, c.spreadWidenBps) / 1e4;
    const volBase = 10;
    for (let i = 0; i < N; i++) {
      const t = new Date(Date.now() + i * 60000).toISOString();
      const shockPhase =
        i < Math.min(N, 5) ? 1 : Math.max(0, 1 - (i - 5) / (N - 5));
      const noise = (Math.random() - 0.5) * (c.volSpikePct / 100) * 0.5;
      const px = base + jump * shockPhase + base * noise;
      const vol = Math.max(
        1,
        volBase * (1 - c.liquidityDrainPct / 100) * (1 + spreadInfl),
      );
      points.push({ t, price: +px.toFixed(4), volume: +vol.toFixed(4) });
    }
    return points;
  };

  const runScenario = async () => {
    setRunning(true);
    try {
      const orderBook = buildOrderBook(cfg);
      const payload = {
        method: "TWAP",
        side: "buy",
        quantity: Math.max(1, Math.round((cfg.durationMin / 10) * 10)) / 10,
        slices: Math.max(5, Math.min(100, Math.round(cfg.durationMin))),
        orderBook,
      } as any;
      const j = await postJson<any>("/api/v1/execution/simulate", payload);

      const id: string =
        j?.data?.request_id || `${Date.now()}_${Math.random()}`;
      const mapped = mapResult(j);
      const res: RunResult = {
        id,
        name: cfg.name,
        status: "completed",
        progress: 100,
        curve: mapped.curve,
        actions: mapped.actions,
        metrics: mapped.metrics,
        raw: j,
      };
      setRuns((prev) => [...prev, res]);
      setSelected((prev) => ({ ...prev, [res.id]: true }));
      toast({ title: "Scenario complete", description: `${cfg.name}` });

      // No polling needed; endpoint returns synchronously
      if (false) {
        let tries = 0;
        let done = false;
        while (!done && tries < 30) {
          await new Promise((res) =>
            setTimeout(res, Math.min(1500 + tries * 200, 4000)),
          );
          tries++;
          const st = await pollStatus(id);
          if (st && (st.status === "completed" || st.completed || st.data)) {
            finalize(st);
            done = true;
            break;
          }
          // If API returns progress only
          const prog = st?.progress;
          if (typeof prog === "number")
            setRuns((prev) =>
              prev.map((rr) =>
                rr.id === id
                  ? {
                      ...rr,
                      progress: Math.max(
                        rr.progress,
                        Math.min(99, Math.round(prog)),
                      ),
                    }
                  : rr,
              ),
            );
        }
        if (!done) {
          // Try to fetch result endpoint variations
          const endpoints = [
            `/api/sim/result/${encodeURIComponent(id)}`,
            `/api/sim/run/${encodeURIComponent(id)}/result`,
            `/sim/result/${encodeURIComponent(id)}`,
            `/api/sim/results/${encodeURIComponent(id)}`,
            `/sim/results/${encodeURIComponent(id)}`,
            `/api/sim/results?id=${encodeURIComponent(id)}`,
            `/sim/results?id=${encodeURIComponent(id)}`,
          ];
          for (const ep of endpoints) {
            try {
              const rr2 = await apiFetch(ep);
              if (rr2.ok) {
                const jj = await rr2.json().catch(() => ({}));
                finalize(jj);
                return;
              }
            } catch {}
          }
          // Give up gracefully; mark finished without data
          setRuns((prev) =>
            prev.map((rr) =>
              rr.id === id ? { ...rr, status: "completed", progress: 100 } : rr,
            ),
          );
          stopProgress(id);
        }
      }
    } catch (e: any) {
      toast({
        title: "Scenario failed",
        description: e?.message || "Error",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const exportSelectedCsv = () => {
    const sels = selectedRuns;
    if (sels.length === 0) return;
    const maxLen = Math.max(...sels.map((s) => s.curve.length));
    const header = ["t", ...sels.map((s) => s.name)];
    const rows: string[] = [header.join(",")];
    for (let i = 0; i < maxLen; i++) {
      const t = sels[0]?.curve[i]?.t ?? i;
      const vals = [t, ...sels.map((s) => s.curve[i]?.pnl ?? "")];
      rows.push(vals.join(","));
    }
    const csv = rows.join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `scenario_lab_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
  };

  const overlayData = useMemo(() => {
    // Align by index/time key t
    const keySet = new Set<number>();
    runs.forEach((r) => r.curve.forEach((p) => keySet.add(p.t)));
    const keys = Array.from(keySet).sort((a, b) => a - b);
    return keys.map((t) => {
      const row: any = { t };
      runs.forEach((r, idx) => {
        row[`p${idx}`] = r.curve.find((p) => p.t === t)?.pnl ?? null;
      });
      return row;
    });
  }, [runs]);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/api/sim/agents/config");
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          const d = j?.data || j;
          if (d?.profiles) setAgentsCfg(d);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "agent_runs",
        JSON.stringify(agentRuns.slice(0, 20)),
      );
    } catch {}
  }, [agentRuns]);

  const saveAgentsCfg = async () => {
    try {
      await apiFetch("/api/sim/agents/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentsCfg),
      });
    } catch {}
  };

  const runAgents = async () => {
    try {
      let r = await apiFetch("/api/sim/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: agentsCfg }),
      });
      if (r.status === 404) {
        r = await apiFetch("/sim/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: agentsCfg }),
        });
      }
      const j = await r.json().catch(() => ({}));
      const data: AgentsRunResult = j?.data || j;
      if (data?.id) {
        setAgentRuns((prev) => [data, ...prev].slice(0, 20));
        setSelAgentRuns((prev) => ({ ...prev, [data.id]: true }));
      }
    } catch {}
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>Scenario Lab</CardTitle>
          <CardDescription>
            Configure shocks and simulate execution via
            /api/v1/execution/simulate
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <HelpTip content="Use presets or custom shocks. You can run multiple scenarios and compare results." />
          <Button
            variant="outline"
            size="sm"
            onClick={exportSelectedCsv}
            disabled={Object.values(selected).filter(Boolean).length === 0}
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button size="sm" onClick={runScenario} disabled={running}>
            {running ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}{" "}
            Run
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Market Ecology</div>
              <div className="text-sm text-muted-foreground">
                Configure agent profiles (market makers, arbitrage, momentum,
                spoofers) and simulate. Visualizes PnL per class, liquidity
                depth proxy, and systemic stability.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={saveAgentsCfg}>
                Save Config
              </Button>
              <Button size="sm" onClick={runAgents}>
                Run Agents
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Agent Profiles</div>
              <div className="space-y-2">
                {agentsCfg.profiles.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2 border rounded-md grid grid-cols-9 gap-2 items-center"
                  >
                    <div className="col-span-2 text-xs capitalize">
                      {p.type.replace("_", " ")}
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[11px]">Count</Label>
                      <Input
                        type="number"
                        value={p.count}
                        onChange={(e) =>
                          setAgentsCfg((c) => ({
                            ...c,
                            profiles: c.profiles.map((q, i) =>
                              i === idx
                                ? { ...q, count: Number(e.target.value) }
                                : q,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[11px]">Aggression</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={p.aggression}
                        onChange={(e) =>
                          setAgentsCfg((c) => ({
                            ...c,
                            profiles: c.profiles.map((q, i) =>
                              i === idx
                                ? {
                                    ...q,
                                    aggression: Math.max(
                                      0,
                                      Math.min(1, Number(e.target.value)),
                                    ),
                                  }
                                : q,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[11px]">Capital</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={p.capital}
                        onChange={(e) =>
                          setAgentsCfg((c) => ({
                            ...c,
                            profiles: c.profiles.map((q, i) =>
                              i === idx
                                ? {
                                    ...q,
                                    capital: Math.max(
                                      0,
                                      Number(e.target.value),
                                    ),
                                  }
                                : q,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAgentsCfg((c) => ({
                            ...c,
                            profiles: c.profiles.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <Label className="text-[11px]">Add Profile</Label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    onChange={(e) => {
                      const t = e.target.value as AgentProfile["type"];
                      if (!t) return;
                      setAgentsCfg((c) => ({
                        ...c,
                        profiles: [
                          ...c.profiles,
                          { type: t, count: 1, aggression: 0.5, capital: 0.5 },
                        ],
                      }));
                      e.currentTarget.selectedIndex = 0;
                    }}
                  >
                    <option value="">Select type…</option>
                    <option value="market_maker">market maker</option>
                    <option value="arbitrage_bot">arbitrage bot</option>
                    <option value="momentum_trader">momentum trader</option>
                    <option value="spoofer">spoofer</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                <div>
                  <Label className="text-[11px]">Seed</Label>
                  <Input
                    type="number"
                    value={agentsCfg.seed ?? ""}
                    onChange={(e) =>
                      setAgentsCfg((c) => ({
                        ...c,
                        seed: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Steps</Label>
                  <Input
                    type="number"
                    value={agentsCfg.steps ?? 200}
                    onChange={(e) =>
                      setAgentsCfg((c) => ({
                        ...c,
                        steps: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Latest Run</div>
              {agentRuns.length > 0 ? (
                <div className="space-y-3">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={agentRuns[0].pnl}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="agent" />
                        <YAxis />
                        <ReTooltip />
                        <ReLegend />
                        <ReBar dataKey="pnl" name="PnL" fill="#10b981" />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={agentRuns[0].spread_over_time}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" />
                        <YAxis />
                        <RechartsTooltip />
                        <Line
                          type="monotone"
                          dataKey="spread_bps"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                          name="Spread (bps)"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={agentRuns[0].spread_over_time.map((p) => ({
                          t: p.t,
                          depth_index: 1 / (1 + p.spread_bps / 100),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" />
                        <YAxis domain={[0, 1]} />
                        <RechartsTooltip />
                        <Line
                          type="monotone"
                          dataKey="depth_index"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Liquidity depth (proxy)"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      Stability:{" "}
                      <span className="font-semibold">
                        {Math.round(agentRuns[0].metrics.stability_index * 100)}
                        %
                      </span>
                    </div>
                    <div>
                      Avg Spread:{" "}
                      <span className="font-semibold">
                        {agentRuns[0].metrics.avg_spread_bps.toFixed(1)} bps
                      </span>
                    </div>
                    <div>
                      Spread Vol:{" "}
                      <span className="font-semibold">
                        {agentRuns[0].metrics.spread_vol_bps.toFixed(1)} bps
                      </span>
                    </div>
                    <div>
                      Mid Drift:{" "}
                      <span className="font-semibold">
                        {agentRuns[0].metrics.midprice_drift_bps.toFixed(1)} bps
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No agent run yet.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="font-medium mb-2">Agent Runs</div>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {agentRuns.map((r) => (
                  <div
                    key={r.id}
                    className="p-2 border rounded-md flex items-center justify-between text-sm"
                  >
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selAgentRuns[r.id]}
                        onChange={(e) =>
                          setSelAgentRuns((prev) => ({
                            ...prev,
                            [r.id]: e.target.checked,
                          }))
                        }
                      />
                      <span className="font-medium">Run {r.id.slice(-6)}</span>
                      <Badge variant="outline">
                        {new Date(
                          (r as any).started_at || Date.now(),
                        ).toLocaleTimeString()}
                      </Badge>
                    </label>
                    <div className="flex items-center gap-3 text-xs">
                      <span>
                        Stab {Math.round(r.metrics.stability_index * 100)}%
                      </span>
                      <span>Spread {r.metrics.avg_spread_bps.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
                {agentRuns.length === 0 && (
                  <div className="text-xs text-muted-foreground">No runs</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Label>Price jump (%)</Label>
              <HelpTip content="Instant shock to price; negative for drop." />
            </div>
            <Input
              type="number"
              step="0.1"
              value={cfg.priceJumpPct}
              onChange={(e) =>
                setCfg((c) => ({ ...c, priceJumpPct: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Vol spike (%)</Label>
              <HelpTip content="Volatility increase; affects variance and tails." />
            </div>
            <Input
              type="number"
              step="0.1"
              value={cfg.volSpikePct}
              onChange={(e) =>
                setCfg((c) => ({ ...c, volSpikePct: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Spread widen (bps)</Label>
              <HelpTip content="Bid/ask spread widening in basis points." />
            </div>
            <Input
              type="number"
              step="1"
              value={cfg.spreadWidenBps}
              onChange={(e) =>
                setCfg((c) => ({
                  ...c,
                  spreadWidenBps: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Liquidity drain (%)</Label>
              <HelpTip content="Percentage of orderbook depth removed." />
            </div>
            <Input
              type="number"
              step="1"
              value={cfg.liquidityDrainPct}
              onChange={(e) =>
                setCfg((c) => ({
                  ...c,
                  liquidityDrainPct: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Duration (min)</Label>
              <HelpTip content="Shock window length." />
            </div>
            <Input
              type="number"
              step="1"
              value={cfg.durationMin}
              onChange={(e) =>
                setCfg((c) => ({ ...c, durationMin: Number(e.target.value) }))
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.name}
              variant="outline"
              size="sm"
              onClick={() => setCfg({ ...p })}
            >
              {p.name}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={overlayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                {runs.map((r, idx) => (
                  <Line
                    key={r.id}
                    type="monotone"
                    dataKey={`p${idx}`}
                    name={r.name}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    hide={!selected[r.id]}
                  />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {/* Final PnL comparison */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart
                  data={runs
                    .filter((r) => selected[r.id])
                    .map((r, i) => ({
                      name: r.name,
                      value: r.metrics.finalPnl ?? 0,
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip />
                  <ReLegend />
                  <ReBar dataKey="value" name="Final PnL" fill="#10b981" />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
            {/* Max Drawdown comparison */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart
                  data={runs
                    .filter((r) => selected[r.id])
                    .map((r) => ({
                      name: r.name,
                      value: (r.metrics.maxDrawdownPct ?? 0) * 100,
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip />
                  <ReLegend />
                  <ReBar dataKey="value" name="Max DD %" fill="#ef4444" />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
            {/* Fill quality comparison */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart
                  data={runs
                    .filter((r) => selected[r.id])
                    .map((r) => ({
                      name: r.name,
                      value: (r.metrics.fillQuality ?? 0) * 100,
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip />
                  <ReLegend />
                  <ReBar dataKey="value" name="Fill %" fill="#3b82f6" />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Select runs to overlay; export includes selected overlays.
          </div>
        </div>

        <div>
          <div className="font-medium mb-2">Runs</div>
          <ScrollArea className="h-56">
            <div className="space-y-2">
              {runs.map((r, idx) => (
                <div
                  key={r.id}
                  className={`p-2 border rounded-md ${r.status === "failed" ? "border-destructive/50 bg-destructive/5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selected[r.id]}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [r.id]: e.target.checked,
                          }))
                        }
                      />
                      <span className="font-medium">{r.name}</span>
                      <Badge
                        variant={
                          r.status === "completed"
                            ? "default"
                            : r.status === "running"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {r.status}
                      </Badge>
                    </label>
                    <div className="text-xs text-muted-foreground">
                      {r.progress}%
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-2 mt-1 text-sm">
                    <div>
                      <div className="text-muted-foreground">Max DD</div>
                      <div className="font-semibold">
                        {r.metrics.maxDrawdownPct !== undefined
                          ? `${(r.metrics.maxDrawdownPct * 100).toFixed(2)}%`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Final PnL</div>
                      <div className="font-semibold">
                        {r.metrics.finalPnl !== undefined
                          ? r.metrics.finalPnl.toFixed(2)
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fill quality</div>
                      <div className="font-semibold">
                        {r.metrics.fillQuality !== undefined
                          ? `${Math.round(r.metrics.fillQuality * 100)}%`
                          : "—"}
                      </div>
                    </div>
                  </div>
                  {r.actions && r.actions.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        Actions timeline
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {r.actions.slice(0, 10).map((a, i2) => (
                          <Badge key={i2} variant="outline">
                            t={a.t} {a.action}
                          </Badge>
                        ))}
                        {r.actions.length > 10 && (
                          <span className="text-muted-foreground">
                            +{r.actions.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {runs.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No scenarios yet. Configure shocks and click Run.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
