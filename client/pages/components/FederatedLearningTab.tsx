import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import HelpTip from "@/components/ui/help-tip";
import apiFetch from "@/lib/apiClient";
import { RefreshCw, Server, Shield, TrendingUp, Network } from "lucide-react";

interface NodeInfo {
  id: string;
  status: "online" | "offline" | string;
  dataCount?: number;
  lastUpdate?: string;
  epsilon?: number;
  delta?: number;
}

interface RoundInfo {
  round: number;
  totalRounds?: number;
  progress?: number; // 0-100
  accuracy?: number;
  loss?: number;
  startTime?: string;
  endTime?: string;
  lineage?: Record<string, any> | null;
  nodes?: NodeInfo[];
  epsilon?: number; // privacy budget
  delta?: number;
}

interface FederatedStatus {
  status?: string;
  currentRound?: number;
  totalRounds?: number;
  globalModel?: { version?: string; accuracy?: number; loss?: number };
  privacy?: { epsilon?: number; delta?: number };
  rounds?: RoundInfo[];
  nodes?: NodeInfo[];
}

function fmtPct(v?: number) {
  return typeof v === "number" ? `${(v * 100).toFixed(2)}%` : "—";
}
function toPct(v?: number) {
  return typeof v === "number" ? Math.max(0, Math.min(100, v)) : 0;
}

export default function FederatedLearningTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FederatedStatus | null>(null);
  const timerRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch("/api/v1/federated/rounds");
      if (!r.ok) {
        if (r.status === 404) {
          setData(null);
        } else {
          throw new Error(`HTTP ${r.status}`);
        }
      } else {
        const j = await r.json().catch(() => ([]));
        const roundsArr: RoundInfo[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        // Normalize into status shape
        const currentRound = roundsArr.reduce((m, rr) => Math.max(m, rr.round || 0), 0) || undefined;
        const nodes = roundsArr.find((rr) => rr.round === currentRound)?.nodes || [];
        const latest = roundsArr.find((rr) => rr.round === currentRound) || roundsArr[0];
        const status: FederatedStatus = {
          status: roundsArr.length ? "ok" : "empty",
          currentRound,
          totalRounds: roundsArr.length || undefined,
          globalModel: latest ? { accuracy: latest.accuracy, loss: latest.loss, version: String(latest.round) } : undefined,
          privacy: latest ? { epsilon: latest.epsilon, delta: latest.delta } : undefined,
          rounds: roundsArr,
          nodes,
        };
        setData(status);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 15000) as any;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const rounds = useMemo(
    () =>
      (data?.rounds || [])
        .slice()
        .sort((a, b) => (b.round || 0) - (a.round || 0)),
    [data],
  );
  const nodes = useMemo(() => data?.nodes || [], [data]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="inline-flex items-center gap-2">
              Federated Learning <Badge variant="outline">DP</Badge>
            </CardTitle>
            <CardDescription>
              Ongoing rounds, participating nodes, privacy budgets (ε, δ), and
              performance
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <HelpTip content="Displays rounds from /api/v1/federated/rounds. Privacy budgets shown as (ε, δ)." />
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="text-sm text-destructive">{error}</div>}
          {!data && !loading && (
            <div className="text-sm text-muted-foreground mb-3">No dedicated federated status endpoint; showing empty state.</div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-3 border rounded-md">
              <div className="text-xs text-muted-foreground">Global Model</div>
              <div className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" /> v
                {data?.globalModel?.version || "—"}
              </div>
              <div className="text-xs">
                Accuracy:{" "}
                <span className="font-semibold">
                  {fmtPct(data?.globalModel?.accuracy)}
                </span>
              </div>
              <div className="text-xs">
                Loss:{" "}
                <span className="font-semibold">
                  {typeof data?.globalModel?.loss === "number"
                    ? data!.globalModel!.loss!.toFixed(4)
                    : "—"}
                </span>
              </div>
            </div>
            <div className="p-3 border rounded-md">
              <div className="text-xs text-muted-foreground">Rounds</div>
              <div className="text-sm font-medium flex items-center gap-2">
                <Network className="h-4 w-4" /> {data?.currentRound ?? "—"} /{" "}
                {data?.totalRounds ?? "—"}
              </div>
              <div className="mt-2">
                <Progress
                  value={toPct(
                    data && data.totalRounds
                      ? ((data.currentRound || 0) / (data.totalRounds || 1)) *
                          100
                      : undefined,
                  )}
                />
              </div>
            </div>
            <div className="p-3 border rounded-md">
              <div className="text-xs text-muted-foreground">
                Privacy Budget
              </div>
              <div className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" /> ε={data?.privacy?.epsilon ?? "—"}{" "}
                · δ={data?.privacy?.delta ?? "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Training Rounds{" "}
              <HelpTip content="Per-round progress, privacy budget, performance, and lineage metadata." />
            </CardTitle>
            <CardDescription>Most recent first</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-3">
                {rounds.map((r) => (
                  <div key={r.round} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        Round {r.round}{" "}
                        {typeof r.totalRounds === "number" ? (
                          <span className="text-xs text-muted-foreground">
                            / {r.totalRounds}
                          </span>
                        ) : null}
                      </div>
                      <Badge variant="outline">
                        ε={r.epsilon ?? "—"} · δ={r.delta ?? "—"}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <Progress value={toPct(r.progress)} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        Acc:{" "}
                        <span className="font-semibold">
                          {fmtPct(r.accuracy)}
                        </span>
                      </div>
                      <div>
                        Loss:{" "}
                        <span className="font-semibold">
                          {typeof r.loss === "number" ? r.loss.toFixed(4) : "—"}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {r.endTime ? "Completed" : "In progress"}
                      </div>
                    </div>
                    {r.lineage && (
                      <div className="mt-2 p-2 bg-muted/40 rounded text-xs">
                        <div className="font-medium mb-1">Lineage</div>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(r.lineage, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
                {rounds.length === 0 && (
                  <div className="text-sm text-muted-foreground">No rounds</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Participating Nodes{" "}
              <HelpTip content="Nodes contributing updates this round and their stats." />
            </CardTitle>
            <CardDescription>Online status and last update</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-2">
                {(nodes.length ? nodes : rounds[0]?.nodes || []).map(
                  (n, idx) => (
                    <div key={n.id + idx} className="p-2 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{n.id}</div>
                        <Badge
                          variant={
                            n.status === "online" ? "default" : "secondary"
                          }
                          className="capitalize"
                        >
                          {n.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mt-1">
                        <div>
                          Data:{" "}
                          <span className="font-semibold">
                            {typeof n.dataCount === "number"
                              ? n.dataCount
                              : "—"}
                          </span>
                        </div>
                        <div>
                          ε:{" "}
                          <span className="font-semibold">
                            {typeof n.epsilon === "number" ? n.epsilon : "—"}
                          </span>
                        </div>
                        <div>
                          δ:{" "}
                          <span className="font-semibold">
                            {typeof n.delta === "number" ? n.delta : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last:{" "}
                        {n.lastUpdate
                          ? new Date(n.lastUpdate).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                  ),
                )}
                {nodes.length === 0 && !rounds[0]?.nodes?.length && (
                  <div className="text-sm text-muted-foreground">No nodes</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
