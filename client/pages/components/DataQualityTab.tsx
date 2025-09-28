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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import HelpTip from "@/components/ui/help-tip";
import apiFetch from "@/lib/apiClient";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Link as LinkIcon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

interface Anomaly {
  id: string;
  symbol: string;
  type: "stale_tick" | "outlier" | "volume_spike" | string;
  severity: "low" | "medium" | "high" | "critical" | string;
  detected_at: string;
  auto_mitigation?: "quarantined" | "down_weighted" | "none" | string;
  sample_url?: string;
  samples?: any;
  venue?: string;
  notes?: string;
}

type Severity = Anomaly["severity"];

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function severityBadgeVariant(sev: Severity) {
  switch (sev) {
    case "critical":
      return "destructive" as const;
    case "high":
      return "secondary" as const;
    case "medium":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function titleForType(t: string) {
  if (t === "stale_tick") return "Stale Tick";
  if (t === "outlier") return "Outlier";
  if (t === "volume_spike") return "Volume Spike";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function usePersistedMap(key: string) {
  const [map, setMap] = useState<Record<string, any>>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  }, [key, map]);
  return [map, setMap] as const;
}

export default function DataQualityTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [showSuppressed, setShowSuppressed] = useState(false);
  const [showRaw, setShowRaw] = useState<Anomaly | null>(null);
  const [ackedMap, setAckedMap] = usePersistedMap("dq_ack_map");
  const [suppressMap, setSuppressMap] = usePersistedMap("dq_suppress_map");
  const timerRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let r = await apiFetch("/api/data/anomalies");
      if (!r.ok) {
        r = await apiFetch("/data/anomalies");
      }
      if (!r.ok) {
        if (r.status !== 404) throw new Error(`HTTP ${r.status}`);
        setAnomalies([]);
      } else {
        const j = await r.json().catch(() => ({}));
        const arr: any[] = Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j)
            ? j
            : Array.isArray((j as any).items)
              ? (j as any).items
              : [];
        const items: Anomaly[] = arr.map((a: any) => ({
          id: String(
            a.id ??
              `${a.symbol || a.venue || "item"}_${a.type || "anomaly"}_${a.detected_at || Date.now()}`,
          ),
          symbol: String(a.symbol || "UNKNOWN"),
          type: String(a.type || a.kind || "anomaly"),
          severity: String(a.severity || a.level || "medium").toLowerCase(),
          detected_at: String(
            a.detected_at || a.timestamp || new Date().toISOString(),
          ),
          auto_mitigation: (a.auto_mitigation || a.mitigation || "none")
            .toString()
            .replace("-", "_") as any,
          sample_url: a.sample_url,
          samples: a.samples,
          venue: a.venue,
          notes: a.notes,
        }));
        setAnomalies(items);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load anomalies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 15000) as any; // 15s
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    let arr = [...anomalies];
    if (filterType !== "all") arr = arr.filter((a) => a.type === filterType);
    if (filterSeverity !== "all")
      arr = arr.filter((a) => a.severity === filterSeverity);
    if (!showSuppressed) arr = arr.filter((a) => !suppressMap[a.id]);
    arr.sort(
      (a, b) =>
        (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0) ||
        new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime(),
    );
    return arr;
  }, [anomalies, filterType, filterSeverity, showSuppressed, suppressMap]);

  const severe = useMemo(
    () =>
      filtered
        .filter((a) => a.severity === "critical" || a.severity === "high")
        .filter((a) => !ackedMap[a.id] && !suppressMap[a.id]),
    [filtered, ackedMap, suppressMap],
  );

  const acknowledge = async (a: Anomaly) => {
    setAckedMap((prev: any) => ({ ...prev, [a.id]: { at: Date.now() } }));
    try {
      await apiFetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Anomaly acknowledged: ${a.symbol}`,
          message: `${titleForType(a.type)} (${a.severity}) acknowledged by admin.`,
          severity: "info",
          category: "system",
          metadata: {
            anomaly_id: a.id,
            type: a.type,
            severity: a.severity,
            symbol: a.symbol,
          },
        }),
      });
    } catch {}
  };

  const suppress = async (a: Anomaly) => {
    setSuppressMap((prev: any) => ({ ...prev, [a.id]: { at: Date.now() } }));
    try {
      await apiFetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Anomaly suppressed: ${a.symbol}`,
          message: `${titleForType(a.type)} suppressed (will not be shown).`,
          severity: "warning",
          category: "system",
          metadata: {
            anomaly_id: a.id,
            type: a.type,
            severity: a.severity,
            symbol: a.symbol,
            action: "suppress",
          },
        }),
      });
    } catch {}
  };

  const unsuppress = (a: Anomaly) => {
    setSuppressMap((prev: any) => {
      const next = { ...prev };
      delete next[a.id];
      return next;
    });
  };

  const openRaw = (a: Anomaly) => {
    setShowRaw(a);
  };

  const stickyIcon = (sev: string) =>
    sev === "critical" ? (
      <ShieldAlert className="h-4 w-4" />
    ) : (
      <TriangleAlert className="h-4 w-4" />
    );

  return (
    <div className="space-y-4">
      {/* Sticky banners for severe anomalies */}
      {severe.length > 0 && (
        <div className="sticky top-0 z-10 space-y-2">
          {severe.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-md border bg-red-50 border-red-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-red-700">
                {stickyIcon(a.severity)}
                <span className="font-medium">
                  {titleForType(a.type)} detected
                </span>
                <span>•</span>
                <span className="font-mono">{a.symbol}</span>
                <Badge variant="destructive" className="ml-2 capitalize">
                  {a.severity}
                </Badge>
                {a.auto_mitigation && a.auto_mitigation !== "none" && (
                  <Badge variant="outline" className="ml-2">
                    {String(a.auto_mitigation).replace("_", "-")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => openRaw(a)}>
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => acknowledge(a)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Acknowledge
                </Button>
                <Button size="sm" variant="ghost" onClick={() => suppress(a)}>
                  <EyeOff className="h-3 w-3 mr-1" /> Suppress
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Data Quality <Badge variant="outline">Anomalies</Badge>
              </CardTitle>
              <CardDescription>
                Stale ticks, outliers, and volume spikes. Includes severity and
                auto-mitigation status.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <HelpTip content="Lists anomalies from data pipelines. Acknowledge or suppress and review raw samples." />
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
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm">Type</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="stale_tick">Stale Tick</SelectItem>
                  <SelectItem value="outlier">Outlier</SelectItem>
                  <SelectItem value="volume_spike">Volume Spike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Severity</span>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-suppressed"
                checked={showSuppressed}
                onCheckedChange={setShowSuppressed}
              />
              <label htmlFor="show-suppressed" className="text-sm">
                Show suppressed
              </label>
            </div>
            <Badge variant="secondary">{filtered.length} items</Badge>
          </div>

          <ScrollArea className="h-[520px]">
            <div className="space-y-3">
              {filtered.map((a) => (
                <div key={a.id} className="p-3 border rounded-md bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={severityBadgeVariant(a.severity)}
                        className="capitalize"
                      >
                        {a.severity}
                      </Badge>
                      <div className="font-medium">{titleForType(a.type)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.detected_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.auto_mitigation && a.auto_mitigation !== "none" ? (
                        <Badge
                          variant="outline"
                          className="capitalize inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="h-3 w-3" />{" "}
                          {String(a.auto_mitigation).replace("_", "-")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1"
                        >
                          <ShieldAlert className="h-3 w-3" /> no auto-mitigation
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Symbol</div>
                      <div className="font-mono">{a.symbol}</div>
                    </div>
                    {a.venue && (
                      <div>
                        <div className="text-muted-foreground">Venue</div>
                        <div className="font-mono">{a.venue}</div>
                      </div>
                    )}
                    {a.notes && (
                      <div className="md:col-span-2 lg:col-span-2">
                        <div className="text-muted-foreground">Notes</div>
                        <div>{a.notes}</div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {a.sample_url ? (
                      <a
                        href={a.sample_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3 mr-1" /> Raw Samples
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openRaw(a)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> View Raw
                      </Button>
                    )}
                    {!ackedMap[a.id] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledge(a)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Acknowledge
                      </Button>
                    )}
                    {suppressMap[a.id] ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => unsuppress(a)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Unsuppress
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => suppress(a)}
                      >
                        <EyeOff className="h-3 w-3 mr-1" /> Suppress
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <TriangleAlert className="h-6 w-6 mx-auto mb-2" />
                  <div>No anomalies match current filters</div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!showRaw} onOpenChange={(o) => !o && setShowRaw(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Raw Samples</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto bg-muted/50 rounded p-3 text-xs">
            {showRaw?.samples ? (
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(showRaw.samples, null, 2)}
              </pre>
            ) : (
              <div className="text-muted-foreground">
                No embedded samples.{" "}
                {showRaw?.sample_url ? "Use external link." : ""}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
