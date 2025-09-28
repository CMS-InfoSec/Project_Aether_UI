import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import HelpTip from "@/components/ui/help-tip";
import apiFetch, { getJson } from "@/lib/apiClient";
import { RefreshCw, BarChart3, ChevronRight, Rocket, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ModelItem {
  modelId: string;
  name: string;
  version: string;
  type: string;
  status: "training" | "trained" | "deployed" | "shadow" | "archived";
  createdAt: string;
}

interface ProposalVote { founderId: string; approve: boolean; votedAt: string; }
interface ProposalItem {
  id: string;
  description: string;
  status: "pending" | "voting" | "approved" | "rejected" | "deployed";
  votes: ProposalVote[];
  requiredVotes: number;
  createdAt: string;
  createdBy: string;
}

interface Metrics {
  oosPnl?: number;
  sharpe?: number;
  sortino?: number;
  cvar?: number;
  turnover?: number;
  breaches?: number;
  regimes?: Array<{ name: string; return?: number; sharpe?: number }>; // regime-wise perf
}

const MODEL_PROPOSAL_PREFIX = "MODEL-DEPLOY-";
const modelProposalId = (modelId: string) => `${MODEL_PROPOSAL_PREFIX}${modelId}`;

export default function ModelComparisonTab() {
  const { user } = useAuth();
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [canaryCap, setCanaryCap] = useState<number>(10);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [auditBanner, setAuditBanner] = useState<{ ts:number; modelId:string; cap:number } | null>(null);

  useEffect(() => {
    const boot = async () => {
      await Promise.all([fetchModels(), fetchProposals()]);
    };
    boot();
  }, []);

  const fetchModels = async () => {
    try {
      const r = await apiFetch(`/api/models?type=rl_agent`);
      const j = await r.json();
      if (j?.status === 'success') setModels(j.data || []);
    } catch {}
  };
  const fetchProposals = async () => {
    try {
      const r = await apiFetch(`/api/admin/proposals`);
      const j = await r.json();
      if (j?.status === 'success') setProposals(j.data || []);
    } catch {}
  };

  const ensureProposalExists = async (model: ModelItem) => {
    const pid = modelProposalId(model.modelId);
    const exists = proposals.some(p => p.id === pid);
    if (exists) return pid;
    const resp = await apiFetch(`/api/admin/proposals/${pid}`, {
      method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ proposalId: pid, description: `Deploy model ${model.name} (${model.modelId})` })
    });
    const j = await resp.json().catch(()=>({}));
    if (!resp.ok || j.status !== 'success') throw new Error(j.error || 'Failed to create proposal');
    await fetchProposals();
    return pid;
  };

  const quorumFor = (modelId: string) => {
    const p = proposals.find(pp => pp.id === modelProposalId(modelId));
    const approvals = p ? p.votes.filter(v => v.approve).length : 0;
    const need = p?.requiredVotes ?? 3;
    const pct = Math.min(100, Math.round((approvals/need)*100));
    return { approvals, need, pct };
  };

  const fetchLineage = async (id: string) => {
    try {
      const j = await getJson<any>(`/api/governance/models/${encodeURIComponent(id)}/lineage`);
      const d = j?.data || j || {};
      const breaches: number = Number(d?.breaches ?? d?.breachCount ?? (Array.isArray(d?.complianceBreaches) ? d.complianceBreaches.length : 0)) || 0;
      return { breaches } as Partial<Metrics>;
    } catch { return {}; }
  };

  const fetchBacktestMetrics = async (id: string) => {
    const tryEndpoints = [
      `/api/models/${encodeURIComponent(id)}/backtest`,
      `/api/models/backtest/${encodeURIComponent(id)}`,
      `/api/backtests/${encodeURIComponent(id)}`,
      `/api/reports/models/${encodeURIComponent(id)}`,
    ];
    for (const ep of tryEndpoints) {
      try {
        const j = await getJson<any>(ep);
        const d = j?.data || j || {};
        const m: Metrics = {
          oosPnl: Number(d.oos_pnl ?? d.pnl ?? d.total_return ?? d.oos?.pnl ?? 0) || undefined,
          sharpe: Number(d.sharpe ?? d.metrics?.sharpe) || undefined,
          sortino: Number(d.sortino ?? d.metrics?.sortino) || undefined,
          cvar: Number(d.cvar ?? d.metrics?.cvar ?? d.metrics?.CVaR) || undefined,
          turnover: Number(d.turnover ?? d.metrics?.turnover) || undefined,
          regimes: Array.isArray(d.regimes) ? d.regimes.map((r:any)=> ({ name: r.name || r.regime || '-', return: Number(r.return ?? r.returns ?? r.pnl ?? 0), sharpe: Number(r.sharpe ?? 0) })) : undefined,
        };
        return m;
      } catch {}
    }
    return {} as Metrics;
  };

  const loadModelData = async (id: string) => {
    setLoadingIds(prev => ({ ...prev, [id]: true }));
    try {
      const [ln, bt] = await Promise.all([fetchLineage(id), fetchBacktestMetrics(id)]);
      setMetrics(prev => ({ ...prev, [id]: { ...prev[id], ...ln, ...bt } }));
    } finally {
      setLoadingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    ids.forEach(id => { if (!metrics[id] && !loadingIds[id]) loadModelData(id); });
  }, [selected]);

  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);
  const tooMany = selectedIds.length > 4;

  const promoteWithCanary = async (modelId: string) => {
    const m = models.find(mm => mm.modelId === modelId);
    if (!m) return;
    try {
      setPromotingId(modelId);
      const pid = await ensureProposalExists(m);
      // Optional: record a self approval to move quorum forward (admin acts as founder)
      const founderId = user?.email || user?.id || 'admin';
      try { await apiFetch(`/api/admin/proposals/${pid}/vote`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ founderId, approve: true }) }); } catch {}
      await fetchProposals();
      const body = { modelId, mode: 'canary', cap: Math.max(1, Math.min(100, Math.round(canaryCap))) / 100, founderApproval: true };
      let r = await apiFetch('/api/models/rollout', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      if (r.status === 404) r = await apiFetch('/api/models/promote', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ modelId, canaryCap: body.cap, founderApproval: true }) });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j.error || j.detail || 'Promotion failed');
      setAuditBanner({ ts: Date.now(), modelId, cap: Math.round(body.cap*100) });
      await fetchProposals();
    } catch (e) {
      console.error(e);
    } finally {
      setPromotingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {auditBanner && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Badge variant="outline" className="mr-2">Audit</Badge>
                Canary rollout initiated for <span className="font-medium">{auditBanner.modelId}</span> with cap <span className="font-semibold">{auditBanner.cap}%</span> at {new Date(auditBanner.ts).toLocaleString()}.
              </div>
              <Badge variant="secondary">canary</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="inline-flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Model Comparison</CardTitle>
            <CardDescription>Select 2–4 candidate ASC models to compare OOS metrics and regimes</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <HelpTip content="Loads lineage and backtest metrics per model. Select up to four." />
            <Button variant="outline" size="sm" onClick={()=> Promise.all([fetchModels(), fetchProposals()])}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1 space-y-2">
              <div className="text-sm font-medium">Candidate Models</div>
              <div className="space-y-2 max-h-80 overflow-auto">
                {models.filter(m => m.type === 'rl_agent' && (m.status === 'trained' || m.status === 'shadow' || m.status === 'deployed')).map(m => {
                  const q = quorumFor(m.modelId);
                  return (
                    <div key={m.modelId} className={`p-2 border rounded-md ${selected[m.modelId] ? 'bg-muted/40' : ''}`}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2">
                          <Checkbox checked={!!selected[m.modelId]} onCheckedChange={(c)=> setSelected(prev => ({ ...prev, [m.modelId]: !!c }))} />
                          <span className="font-medium">{m.name} <span className="text-xs text-muted-foreground">(v{m.version})</span></span>
                        </label>
                        <Badge variant={m.status==='deployed' ? 'default':'outline'}>{m.status}</Badge>
                      </div>
                      <div className="mt-2">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-1.5 bg-primary" style={{ width: `${q.pct}%` }} />
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">Quorum: {q.approvals}/{q.need}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Canary cap (%)</div>
                        <div className="flex items-center gap-2">
                          <Input className="h-7 w-20" type="number" min={1} max={100} value={canaryCap} onChange={(e)=> setCanaryCap(Math.max(1, Math.min(100, Number(e.target.value)||10)))} />
                          <Button size="sm" onClick={()=> promoteWithCanary(m.modelId)} disabled={promotingId===m.modelId}>
                            {promotingId===m.modelId ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Promote
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {models.length===0 && (
                  <div className="text-sm text-muted-foreground">No models</div>
                )}
              </div>
              {tooMany && (
                <div className="text-xs text-destructive">Select up to 4 models</div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-medium mb-2">Out-of-sample metrics</div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Model</th>
                      <th className="text-right p-2">OOS PnL</th>
                      <th className="text-right p-2">Sharpe</th>
                      <th className="text-right p-2">Sortino</th>
                      <th className="text-right p-2">CVaR</th>
                      <th className="text-right p-2">Turnover</th>
                      <th className="text-right p-2">Breaches</th>
                      <th className="text-left p-2">Regimes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIds.map(id => {
                      const m = models.find(mm => mm.modelId===id);
                      const me = metrics[id] || {};
                      const loading = loadingIds[id];
                      return (
                        <tr key={id} className="border-b align-top">
                          <td className="p-2">
                            <div className="font-medium">{m?.name || id}</div>
                            <div className="text-xs text-muted-foreground">v{m?.version}</div>
                          </td>
                          <td className="p-2 text-right">{loading ? '…' : (me.oosPnl!==undefined ? me.oosPnl.toFixed(2) : '—')}</td>
                          <td className="p-2 text-right">{loading ? '…' : (me.sharpe!==undefined ? me.sharpe.toFixed(2) : '—')}</td>
                          <td className="p-2 text-right">{loading ? '…' : (me.sortino!==undefined ? me.sortino.toFixed(2) : '—')}</td>
                          <td className="p-2 text-right">{loading ? '…' : (me.cvar!==undefined ? (me.cvar*100).toFixed(2)+'%' : '—')}</td>
                          <td className="p-2 text-right">{loading ? '…' : (me.turnover!==undefined ? (me.turnover*100).toFixed(1)+'%' : '—')}</td>
                          <td className="p-2 text-right">{loading ? '…' : (me.breaches!==undefined ? me.breaches : '—')}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              {(me.regimes || []).map((r,i)=> (
                                <Badge key={i} variant="outline" className="text-xs">{r.name}: {r.return!==undefined ? (r.return*100).toFixed(1)+'%' : '—'}</Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {selectedIds.length===0 && (
                      <tr><td className="p-3 text-muted-foreground" colSpan={8}>Select models to compare</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
