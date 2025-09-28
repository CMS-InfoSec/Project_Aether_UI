import { useEffect, useMemo, useState } from "react";
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
import HelpTip from "@/components/ui/help-tip";
import apiFetch, { getJson } from "@/lib/apiClient";
import {
  Brain,
  RefreshCw,
  Clock,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  User as UserIcon,
  Hash as HashIcon,
} from "lucide-react";

interface ModelItem {
  modelId: string;
  name: string;
  version: string;
  type: string;
  status: "training" | "trained" | "deployed" | "shadow" | "archived";
  createdAt: string;
  deployedAt?: string;
}

interface LineageData {
  trainingDatasetHash?: string;
  trainingDate?: string | number;
  retrainings?: Array<{
    timestamp?: string | number;
    datasetHash?: string;
    notes?: string;
  }>;
  driftEvents?: Array<{
    timestamp?: string | number;
    metric?: string;
    severity?: string;
    detail?: string;
  }>;
  approvals?: Array<{
    operatorId?: string;
    approved?: boolean;
    timestamp?: string | number;
    notes?: string;
  }>;
}

interface TimelineEvent {
  ts: number;
  type: "trained" | "retrained" | "drift" | "approval";
  label: string;
  details?: string;
  meta?: any;
  severity?: "info" | "warning" | "error" | "success";
}

function toTs(v: any): number {
  if (!v) return Date.now();
  const d = new Date(v);
  const n = d.getTime();
  return Number.isFinite(n) ? n : Number(v) || Date.now();
}

export default function ModelLineagePanel() {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [lineage, setLineage] = useState<Record<string, LineageData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const boot = async () => {
      try {
        const res = await apiFetch(`/api/models?type=rl_agent`);
        const j = await res.json().catch(() => ({ status: "error" }));
        if (j?.status === "success" && Array.isArray(j.data)) {
          setModels(j.data);
          if (j.data[0]?.modelId) setSelectedModelId(j.data[0].modelId);
        }
      } catch {}
    };
    boot();
  }, []);

  const fetchLineage = async (modelId: string) => {
    try {
      const j = await getJson<any>(
        `/api/governance/models/${encodeURIComponent(modelId)}/lineage`,
      );
      const d = j?.data || j || {};
      const mapped: LineageData = {
        trainingDatasetHash:
          d.trainingDatasetHash || d.datasetHash || d.dataset_hash,
        trainingDate: d.trainingDate || d.trainedAt || d.createdAt,
        retrainings: Array.isArray(d.retrainings)
          ? d.retrainings
          : Array.isArray(d.retrainingEvents)
            ? d.retrainingEvents
            : [],
        driftEvents: Array.isArray(d.driftEvents)
          ? d.driftEvents
          : Array.isArray(d.drifts)
            ? d.drifts
            : [],
        approvals: Array.isArray(d.approvals)
          ? d.approvals
          : Array.isArray(d.operatorApprovals)
            ? d.operatorApprovals
            : [],
      };
      setLineage((prev) => ({ ...prev, [modelId]: mapped }));
    } catch (e) {
      // keep silent but store empty to avoid re-fetching loop
      setLineage((prev) => ({ ...prev, [modelId]: {} }));
    }
  };

  useEffect(() => {
    if (selectedModelId && !lineage[selectedModelId]) {
      setLoading(true);
      fetchLineage(selectedModelId).finally(() => setLoading(false));
    }
  }, [selectedModelId]);

  const current = lineage[selectedModelId];

  const timeline: TimelineEvent[] = useMemo(() => {
    if (!current) return [];
    const events: TimelineEvent[] = [];
    if (current.trainingDate) {
      events.push({
        ts: toTs(current.trainingDate),
        type: "trained",
        label: "Initial training completed",
        details: current.trainingDatasetHash
          ? `Dataset ${current.trainingDatasetHash}`
          : undefined,
        severity: "success",
      });
    }
    for (const r of current.retrainings || []) {
      events.push({
        ts: toTs(r.timestamp),
        type: "retrained",
        label: "Retrained",
        details: r.datasetHash ? `Dataset ${r.datasetHash}` : r.notes,
        severity: "info",
      });
    }
    for (const d of current.driftEvents || []) {
      const sev = String(d.severity || "warning").toLowerCase();
      events.push({
        ts: toTs(d.timestamp),
        type: "drift",
        label: d.metric ? `Drift detected: ${d.metric}` : "Drift detected",
        details: d.detail,
        severity:
          sev.includes("critical") || sev === "error" ? "error" : "warning",
      });
    }
    for (const a of current.approvals || []) {
      events.push({
        ts: toTs(a.timestamp),
        type: "approval",
        label: a.approved
          ? `Approval by ${a.operatorId || "operator"}`
          : `Rejection by ${a.operatorId || "operator"}`,
        details: a.notes,
        severity: a.approved ? "success" : "error",
      });
    }
    return events.sort((a, b) => a.ts - b.ts);
  }, [current]);

  const selectedModel = models.find((m) => m.modelId === selectedModelId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="inline-flex items-center gap-2">
              <Brain className="h-5 w-5" /> Model Lineage
            </CardTitle>
            <CardDescription>
              Training datasets, drift events, and approvals per ASC model
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <HelpTip content="Select a model to view its lineage. Data pulled from /api/governance/models/{id}/lineage." />
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedModelId && fetchLineage(selectedModelId)}
              disabled={!selectedModelId || loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <div className="text-sm font-medium">Model</div>
              <Select
                value={selectedModelId}
                onValueChange={setSelectedModelId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.modelId} value={m.modelId}>
                      {m.name} (v{m.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedModel && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Model ID:</span>{" "}
                    {selectedModel.modelId}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {selectedModel.status}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {new Date(selectedModel.createdAt).toLocaleString()}
                  </div>
                  {selectedModel.deployedAt && (
                    <div>
                      <span className="font-medium">Deployed:</span>{" "}
                      {new Date(selectedModel.deployedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {current && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Training Dataset</div>
                  <div className="flex items-center gap-2 text-sm">
                    <HashIcon className="h-4 w-4" />
                    <span className="truncate">
                      {current.trainingDatasetHash || "N/A"}
                    </span>
                  </div>
                  {current.trainingDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(current.trainingDate).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-medium mb-2">Evolution Timeline</div>
              <ScrollArea className="h-80">
                <ol className="relative border-s pl-6">
                  {timeline.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No lineage events found
                    </div>
                  )}
                  {timeline.map((ev, idx) => (
                    <li key={idx} className="mb-6 ms-4">
                      <span
                        className={`absolute -start-1.5 flex h-3 w-3 rounded-full ring-2 ring-background ${ev.type === "drift" ? (ev.severity === "error" ? "bg-red-500" : "bg-yellow-500") : ev.type === "approval" ? (ev.severity === "success" ? "bg-green-600" : "bg-red-500") : "bg-primary"}`}
                      ></span>
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {ev.type === "trained" && "Initial training"}
                          {ev.type === "retrained" && "Retrained"}
                          {ev.type === "drift" && "Drift detected"}
                          {ev.type === "approval" && "Approval event"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ev.ts).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ev.label}
                        {ev.details ? ` — ${ev.details}` : ""}
                      </div>
                      <div className="mt-1">
                        {ev.type === "drift" && (
                          <Badge
                            variant={
                              ev.severity === "error"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs inline-flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />{" "}
                            {ev.severity === "error" ? "Critical" : "Warning"}
                          </Badge>
                        )}
                        {ev.type === "approval" && (
                          <Badge
                            variant={
                              ev.severity === "success"
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs inline-flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />{" "}
                            {ev.severity === "success"
                              ? "Approved"
                              : "Rejected"}
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
