import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import HelpTip from "@/components/ui/help-tip";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiFetch from "@/lib/apiClient";
import { RefreshCw, Download } from "lucide-react";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";

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

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ef4444",
  "#9333ea",
  "#f59e0b",
  "#06b6d4",
];

function mapResult(raw: any): { curve: Array<{ t: number; pnl: number }>; metrics: RunMetrics; actions: Array<{ t: number; action: string; detail?: string }>; } {
  const d = raw?.data || raw || {};
  // PnL time series mapping (fallbacks)
  const series = Array.isArray(d.pnl) ? d.pnl : (Array.isArray(d.curve) ? d.curve : (Array.isArray(d.series) ? d.series : []));
  const curve = series.map((v: any, i: number) => {
    if (typeof v === 'number') return { t: i, pnl: v };
    const t = v.t ?? v.ts ?? v.time ?? i;
    const pnl = v.pnl ?? v.value ?? v.equity ?? 0;
    return { t: Number(t), pnl: Number(pnl) };
  });
  // Metrics
  const maxDrawdownPct = (() => {
    const dd = d.max_drawdown ?? d.maxDrawdown ?? d.metrics?.max_drawdown ?? d.metrics?.dd;
    return typeof dd === 'number' ? dd : undefined;
  })();
  const finalPnl = curve.length ? curve[curve.length - 1].pnl : (typeof d.final_pnl === 'number' ? d.final_pnl : undefined);
  const fillQuality = (() => {
    const fq = d.fill_quality ?? d.execution?.fill_quality ?? d.metrics?.fill_quality;
    return typeof fq === 'number' ? fq : undefined;
  })();
  // Actions timeline
  const actsSrc = Array.isArray(d.actions) ? d.actions : (Array.isArray(d.events) ? d.events : []);
  const actions = actsSrc.map((a: any, i: number) => ({ t: Number(a.t ?? a.ts ?? i), action: String(a.action || a.type || 'event'), detail: a.detail || a.note }));
  return { curve, metrics: { maxDrawdownPct, finalPnl, fillQuality }, actions };
}

export default function ScenarioLab() {
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
  const progressTimers = useRef<Record<string, any>>({});

  const presets: ScenarioConfig[] = [
    { name: "Flash Crash", priceJumpPct: -20, volSpikePct: 80, spreadWidenBps: 150, liquidityDrainPct: 70, durationMin: 20 },
    { name: "Rally on Thin Liquidity", priceJumpPct: 15, volSpikePct: 40, spreadWidenBps: 60, liquidityDrainPct: 60, durationMin: 45 },
  ];

  const selectedRuns = useMemo(() => runs.filter(r => selected[r.id]), [runs, selected]);

  const startProgress = (id: string) => {
    // Fallback local progress if server doesn't report
    const tick = () => setRuns(prev => prev.map(r => r.id === id ? { ...r, progress: Math.min(99, r.progress + Math.max(1, Math.round((100 - r.progress) / 20))) } : r));
    progressTimers.current[id] = window.setInterval(tick, 800);
  };
  const stopProgress = (id: string) => {
    const t = progressTimers.current[id];
    if (t) window.clearInterval(t);
    delete progressTimers.current[id];
  };

  const pollStatus = async (jobId: string) => {
    const endpoints = [
      `/api/sim/status/${encodeURIComponent(jobId)}`,
      `/api/sim/run/${encodeURIComponent(jobId)}`,
      `/api/sim/status?id=${encodeURIComponent(jobId)}`,
      `/sim/status/${encodeURIComponent(jobId)}`,
      `/sim/run/${encodeURIComponent(jobId)}`,
      `/sim/status?id=${encodeURIComponent(jobId)}`,
    ];
    for (const ep of endpoints) {
      try {
        const r = await apiFetch(ep);
        if (r.ok) return await r.json().catch(() => ({}));
      } catch {}
    }
    return null;
  };

  const runScenario = async () => {
    setRunning(true);
    try {
      const body = {
        scenario: {
          name: cfg.name,
          price_jump_pct: cfg.priceJumpPct / 100,
          vol_spike_pct: cfg.volSpikePct / 100,
          spread_widen_bps: cfg.spreadWidenBps,
          liquidity_drain_pct: cfg.liquidityDrainPct / 100,
          duration_min: cfg.durationMin,
        },
      };
      let r = await apiFetch('/api/sim/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 404) r = await apiFetch('/sim/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const text = await r.text();
      let j: any = {};
      if (text && text.trim()) { try { j = JSON.parse(text); } catch { j = { data: text }; } }

      const id: string = j.id || j.jobId || j.request_id || `${Date.now()}_${Math.random()}`;
      const base: RunResult = { id, name: cfg.name, status: r.status === 202 ? 'running' : 'completed', progress: r.status === 202 ? (j.progress ?? 1) : 100, curve: [], actions: [], metrics: {}, raw: j };
      setRuns(prev => [...prev, base]);
      setSelected(prev => ({ ...prev, [id]: true }));
      if (base.status === 'running') startProgress(id);

      const finalize = (raw: any) => {
        const mapped = mapResult(raw);
        setRuns(prev => prev.map(rr => rr.id === id ? { ...rr, status: 'completed', progress: 100, curve: mapped.curve, actions: mapped.actions, metrics: mapped.metrics, raw } : rr));
        stopProgress(id);
      };

      if (base.status === 'running') {
        let tries = 0;
        let done = false;
        while (!done && tries < 30) {
          await new Promise(res => setTimeout(res, Math.min(1500 + tries * 200, 4000)));
          tries++;
          const st = await pollStatus(id);
          if (st && (st.status === 'completed' || st.completed || st.data)) {
            finalize(st);
            done = true;
            break;
          }
          // If API returns progress only
          const prog = st?.progress;
          if (typeof prog === 'number') setRuns(prev => prev.map(rr => rr.id === id ? { ...rr, progress: Math.max(rr.progress, Math.min(99, Math.round(prog))) } : rr));
        }
        if (!done) {
          // Try to fetch result endpoint variations
          const endpoints = [
            `/api/sim/result/${encodeURIComponent(id)}`,
            `/api/sim/run/${encodeURIComponent(id)}/result`,
            `/sim/result/${encodeURIComponent(id)}`,
          ];
          for (const ep of endpoints) {
            try { const rr2 = await apiFetch(ep); if (rr2.ok) { const jj = await rr2.json().catch(() => ({})); finalize(jj); return; } } catch {}
          }
          // Give up gracefully; mark finished without data
          setRuns(prev => prev.map(rr => rr.id === id ? { ...rr, status: 'completed', progress: 100 } : rr));
          stopProgress(id);
        }
      } else {
        finalize(j);
      }
    } catch (e) {
      setRuns(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: 'failed' } : r));
    } finally {
      setRunning(false);
    }
  };

  const exportSelectedCsv = () => {
    const sels = selectedRuns;
    if (sels.length === 0) return;
    const maxLen = Math.max(...sels.map(s => s.curve.length));
    const header = ['t', ...sels.map(s => s.name)];
    const rows: string[] = [header.join(',')];
    for (let i = 0; i < maxLen; i++) {
      const t = sels[0]?.curve[i]?.t ?? i;
      const vals = [t, ...sels.map(s => (s.curve[i]?.pnl ?? ''))];
      rows.push(vals.join(','));
    }
    const csv = rows.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `scenario_lab_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
    a.click();
  };

  const overlayData = useMemo(() => {
    // Align by index/time key t
    const keySet = new Set<number>();
    runs.forEach(r => r.curve.forEach(p => keySet.add(p.t)));
    const keys = Array.from(keySet).sort((a,b)=> a-b);
    return keys.map(t => {
      const row: any = { t };
      runs.forEach((r, idx) => {
        row[`p${idx}`] = r.curve.find(p => p.t === t)?.pnl ?? null;
      });
      return row;
    });
  }, [runs]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>Scenario Lab</CardTitle>
          <CardDescription>Configure shocks and simulate strategy response via /api/sim/run</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <HelpTip content="Use presets or custom shocks. You can run multiple scenarios and compare results." />
          <Button variant="outline" size="sm" onClick={exportSelectedCsv} disabled={Object.values(selected).filter(Boolean).length===0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button size="sm" onClick={runScenario} disabled={running}>
            {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Run
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <div className="flex items-center gap-2"><Label>Price jump (%)</Label><HelpTip content="Instant shock to price; negative for drop." /></div>
            <Input type="number" step="0.1" value={cfg.priceJumpPct} onChange={(e)=> setCfg(c=> ({...c, priceJumpPct: Number(e.target.value)}))} />
          </div>
          <div>
            <div className="flex items-center gap-2"><Label>Vol spike (%)</Label><HelpTip content="Volatility increase; affects variance and tails." /></div>
            <Input type="number" step="0.1" value={cfg.volSpikePct} onChange={(e)=> setCfg(c=> ({...c, volSpikePct: Number(e.target.value)}))} />
          </div>
          <div>
            <div className="flex items-center gap-2"><Label>Spread widen (bps)</Label><HelpTip content="Bid/ask spread widening in basis points." /></div>
            <Input type="number" step="1" value={cfg.spreadWidenBps} onChange={(e)=> setCfg(c=> ({...c, spreadWidenBps: Number(e.target.value)}))} />
          </div>
          <div>
            <div className="flex items-center gap-2"><Label>Liquidity drain (%)</Label><HelpTip content="Percentage of orderbook depth removed." /></div>
            <Input type="number" step="1" value={cfg.liquidityDrainPct} onChange={(e)=> setCfg(c=> ({...c, liquidityDrainPct: Number(e.target.value)}))} />
          </div>
          <div>
            <div className="flex items-center gap-2"><Label>Duration (min)</Label><HelpTip content="Shock window length." /></div>
            <Input type="number" step="1" value={cfg.durationMin} onChange={(e)=> setCfg(c=> ({...c, durationMin: Number(e.target.value)}))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <Button key={p.name} variant="outline" size="sm" onClick={()=> setCfg({...p})}>{p.name}</Button>
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
                  <Line key={r.id} type="monotone" dataKey={`p${idx}`} name={r.name} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} hide={!selected[r.id]} />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted-foreground">Select runs to overlay; export includes selected overlays.</div>
        </div>

        <div>
          <div className="font-medium mb-2">Runs</div>
          <ScrollArea className="h-56">
            <div className="space-y-2">
              {runs.map((r, idx) => (
                <div key={r.id} className={`p-2 border rounded-md ${r.status==='failed' ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!selected[r.id]} onChange={(e)=> setSelected(prev => ({ ...prev, [r.id]: e.target.checked }))} />
                      <span className="font-medium">{r.name}</span>
                      <Badge variant={r.status==='completed' ? 'default' : (r.status==='running' ? 'secondary':'outline')}>{r.status}</Badge>
                    </label>
                    <div className="text-xs text-muted-foreground">{r.progress}%</div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-2 mt-1 text-sm">
                    <div>
                      <div className="text-muted-foreground">Max DD</div>
                      <div className="font-semibold">{r.metrics.maxDrawdownPct !== undefined ? `${(r.metrics.maxDrawdownPct*100).toFixed(2)}%` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Final PnL</div>
                      <div className="font-semibold">{r.metrics.finalPnl !== undefined ? r.metrics.finalPnl.toFixed(2) : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fill quality</div>
                      <div className="font-semibold">{r.metrics.fillQuality !== undefined ? `${Math.round(r.metrics.fillQuality*100)}%` : '—'}</div>
                    </div>
                  </div>
                  {r.actions && r.actions.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Actions timeline</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {r.actions.slice(0, 10).map((a, i2) => (
                          <Badge key={i2} variant="outline">t={a.t} {a.action}</Badge>
                        ))}
                        {r.actions.length > 10 && <span className="text-muted-foreground">+{r.actions.length-10} more</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {runs.length===0 && (
                <div className="text-sm text-muted-foreground">No scenarios yet. Configure shocks and click Run.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
