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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import apiFetch from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Brain,
  BarChart3,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Rocket,
} from "lucide-react";

interface ModelItem {
  modelId: string;
  name: string;
  version: string;
  type: string;
  status: "training" | "trained" | "deployed" | "shadow" | "archived";
  createdAt: string;
  deployedAt?: string;
  performance?: {
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
    profitFactor?: number;
    sortino?: number;
  };
}

interface ProposalVote {
  founderId: string;
  approve: boolean;
  votedAt: string;
}
interface ProposalItem {
  id: string;
  description: string;
  status: "pending" | "voting" | "approved" | "rejected" | "deployed";
  votes: ProposalVote[];
  requiredVotes: number;
  createdAt: string;
  createdBy: string;
}

function formatPct(v?: number) {
  if (v === undefined || v === null) return "--";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "--";
  const pct = Math.abs(n) <= 1.0 && Math.abs(n) >= 0 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

const MODEL_PROPOSAL_PREFIX = "MODEL-DEPLOY-";
function modelProposalId(modelId: string) {
  return `${MODEL_PROPOSAL_PREFIX}${modelId}`;
}

export default function ASCModelsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [refreshMs, setRefreshMs] = useState(15000);
  const intervalRef = useRef<any>(null);

  const [rbOpen, setRbOpen] = useState(false);
  const [rbFromModelId, setRbFromModelId] = useState<string | null>(null);
  const [rbToModelId, setRbToModelId] = useState<string | null>(null);
  const [rbFounderApproval, setRbFounderApproval] = useState(false);

  const deployedModel = useMemo(
    () => models.find((m) => m.status === "deployed") || null,
    [models],
  );
  const candidateModels = useMemo(
    () =>
      models.filter(
        (m) =>
          m.type === "rl_agent" &&
          (m.status === "trained" ||
            m.status === "shadow" ||
            m.status === "deployed"),
      ),
    [models],
  );

  useEffect(() => {
    const boot = async () => {
      await Promise.all([fetchModels(), fetchProposals()]);
    };
    boot();
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      Promise.all([fetchModels(), fetchProposals()]).catch(() => {});
    }, refreshMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshMs]);

  const fetchModels = async () => {
    try {
      const res = await apiFetch(`/api/v1/models/history`);
      const j = await res.json().catch(() => ({}));
      const items: any[] = Array.isArray(j?.items) ? j.items : Array.isArray(j?.records) ? j.records : [];
      const mapped = items.map((m: any) => ({
        modelId: m.modelId || m.id,
        name: m.name || m.model || m.id,
        version: m.version || m.rev || "",
        type: m.type || m.family || "",
        status: (m.status || m.state || "").toLowerCase(),
        createdAt: m.createdAt || m.timestamp,
        deployedAt: m.deployedAt || undefined,
        performance: m.performance || undefined,
      })).filter((m: any) => m.type === 'rl' || m.type === 'rl_agent');
      setModels(mapped);
    } catch (e) {
      // ignore
    }
  };
  const fetchProposals = async () => {
    try {
      const res = await apiFetch(`/api/v1/governance/proposals`);
      const j = await res.json().catch(() => ({}));
      const items: any[] = Array.isArray(j?.items) ? j.items : Array.isArray(j?.data?.items) ? j.data.items : [];
      const mapped: ProposalItem[] = items.map((p: any) => ({
        id: p.id,
        description: p.description || p.summary || '',
        status: (p.status || 'pending').toLowerCase(),
        votes: Array.isArray(p.votes) ? p.votes.map((v: any) => ({ founderId: v.founderId || v.user || '', approve: !!v.approve, votedAt: v.votedAt || v.timestamp || '' })) : [],
        requiredVotes: Number(p.requiredVotes || p.quorum || 3),
        createdAt: p.createdAt || p.timestamp || '',
        createdBy: p.createdBy || p.author || '',
      }));
      setProposals(mapped);
    } catch (e) {
      // ignore
    }
  };

  const ensureProposalExists = async (model: ModelItem) => {
    const pid = modelProposalId(model.modelId);
    const exists = proposals.some((p) => p.id === pid);
    if (exists) return pid;
    const resp = await apiFetch(`/api/v1/governance/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pid, description: `Deploy model ${model.name} (${model.modelId})` }),
    });
    const j = await resp.json().catch(()=>({}));
    if (!resp.ok) throw new Error(j.error || "Failed to create proposal");
    await fetchProposals();
    return pid;
  };

  const castVote = async (proposalId: string, approve: boolean) => {
    const founderId = user?.email || user?.id || "admin";
    const resp = await apiFetch(`/api/v1/governance/votes/${encodeURIComponent(proposalId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ founderId, approve }),
    });
    const j = await resp.json().catch(()=>({}));
    if (!resp.ok) throw new Error(j.error || "Vote failed");
  };

  const onApprove = async (model: ModelItem) => {
    try {
      setLoading(true);
      const pid = await ensureProposalExists(model);
      await castVote(pid, true);
      await fetchProposals();
      toast({
        title: "Approval recorded",
        description: `${model.name} approval vote recorded.`,
      });
    } catch (e: any) {
      toast({
        title: "Approve failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onReject = async (model: ModelItem) => {
    try {
      setLoading(true);
      const pid = await ensureProposalExists(model);
      await castVote(pid, false);
      await fetchProposals();
      toast({
        title: "Rejection recorded",
        description: `${model.name} rejection vote recorded.`,
      });
    } catch (e: any) {
      toast({
        title: "Reject failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onPromoteIfApproved = async (model: ModelItem) => {
    try {
      setLoading(true);
      const pid = modelProposalId(model.modelId);
      const prop = proposals.find((p) => p.id === pid);
      const approvals = prop ? prop.votes.filter((v) => v.approve).length : 0;
      const need = prop?.requiredVotes ?? 3;
      if (approvals < need) {
        toast({
          title: "Quorum not met",
          description: `${approvals} of ${need} approvals.`,
          variant: "destructive",
        });
        return;
      }
      const r = await apiFetch(`/api/v1/models/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model.modelId, founderApproval: true }),
      });
      const j = await r.json();
      if (!r.ok || j.status !== "success")
        throw new Error(j.error || "Promote failed");
      await fetchModels();
      toast({
        title: "Model promoted",
        description: `${model.name} is now production.`,
      });
    } catch (e: any) {
      toast({
        title: "Promote failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openRollback = (toModelId: string) => {
    setRbFromModelId(deployedModel?.modelId || null);
    setRbToModelId(toModelId);
    setRbFounderApproval(false);
    setRbOpen(true);
  };

  const doRollback = async () => {
    if (!rbFromModelId || !rbToModelId) return;
    try {
      setLoading(true);
      const r = await apiFetch(`/api/v1/models/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromModelId: rbFromModelId,
          toModelId: rbToModelId,
          founderApproval: true,
        }),
      });
      const j = await r.json();
      if (!r.ok || j.status !== "success")
        throw new Error(j.error || "Rollback failed");
      toast({
        title: "Rollback complete",
        description: `Rolled back to model ${rbToModelId}.`,
      });
      setRbOpen(false);
      await fetchModels();
    } catch (e: any) {
      toast({
        title: "Rollback failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProposalForModel = (m: ModelItem) =>
    proposals.find((p) => p.id === modelProposalId(m.modelId));
  const getProgressPct = (p?: ProposalItem) => {
    if (!p) return 0;
    const approvals = p.votes.filter((v) => v.approve).length;
    return Math.min(100, Math.round((approvals / p.requiredVotes) * 100));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                <Brain className="h-5 w-5" /> Candidate ASC Models
              </CardTitle>
              <CardDescription>
                Review RL agent candidates, vote, and perform governance actions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(refreshMs)}
                onValueChange={(v) => setRefreshMs(parseInt(v))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Refresh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10000">10s auto-refresh</SelectItem>
                  <SelectItem value="15000">15s auto-refresh</SelectItem>
                  <SelectItem value="30000">30s auto-refresh</SelectItem>
                  <SelectItem value="60000">60s auto-refresh</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => Promise.all([fetchModels(), fetchProposals()])}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[480px] w-full">
            <div className="space-y-4">
              {candidateModels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2" />
                  No candidate ASC models found
                </div>
              ) : (
                candidateModels.map((m) => {
                  const p = getProposalForModel(m);
                  const approvals = p
                    ? p.votes.filter((v) => v.approve).length
                    : 0;
                  const need = p?.requiredVotes ?? 3;
                  return (
                    <div
                      key={m.modelId}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            v{m.version} • {m.modelId}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              m.status === "deployed"
                                ? "bg-green-100 text-green-700"
                                : m.status === "shadow"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                            }
                          >
                            {m.status}
                          </Badge>
                          {m.status === "trained" && (
                            <Button
                              size="sm"
                              onClick={() => onPromoteIfApproved(m)}
                              disabled={loading}
                            >
                              <Rocket className="h-3 w-3 mr-1" /> Promote
                              (requires quorum)
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Sharpe
                          </p>
                          <p className="text-sm font-medium">
                            {m.performance?.sharpeRatio?.toFixed(2) ?? "--"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Win Rate
                          </p>
                          <p className="text-sm font-medium">
                            {formatPct(m.performance?.winRate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Max DD
                          </p>
                          <p className="text-sm font-medium text-destructive">
                            {formatPct(
                              Math.abs(m.performance?.maxDrawdown ?? 0),
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Profit Factor
                          </p>
                          <p className="text-sm font-medium">
                            {m.performance?.profitFactor?.toFixed(2) ?? "--"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Sortino
                          </p>
                          <p className="text-sm font-medium">
                            {m.performance?.sortino?.toFixed(2) ?? "--"}
                          </p>
                        </div>
                      </div>

                      {/* Quorum */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {approvals}/{need} approvals
                        </span>
                        <div className="w-32 bg-muted rounded-full h-1">
                          <div
                            className="bg-primary h-1 rounded-full transition-all"
                            style={{ width: `${getProgressPct(p)}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onApprove(m)}
                          disabled={loading}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onReject(m)}
                          disabled={loading}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRollback(m.modelId)}
                          disabled={loading || !deployedModel}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={rbOpen} onOpenChange={setRbOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback Production Model</DialogTitle>
            <DialogDescription>
              Select the target model to rollback to. Current production will be
              archived.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Current (from)</Label>
              <div className="text-sm text-muted-foreground">
                {rbFromModelId || "None"}
              </div>
            </div>
            <div>
              <Label>Rollback target (to)</Label>
              <Select
                value={rbToModelId || undefined}
                onValueChange={setRbToModelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {candidateModels.map((m) => (
                    <SelectItem key={m.modelId} value={m.modelId}>
                      {m.name} (v{m.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rb_approval"
                checked={rbFounderApproval}
                onCheckedChange={setRbFounderApproval}
              />
              <Label htmlFor="rb_approval">I have founder approval</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={doRollback}
              disabled={!rbToModelId || !rbFounderApproval || loading}
            >
              Confirm Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
