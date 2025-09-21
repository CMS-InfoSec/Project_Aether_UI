import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Activity,
  Server,
  HeartPulse,
  Download,
  Copy,
  ExternalLink,
} from "lucide-react";
import copy from "@/lib/clipboard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import HelpTip from "@/components/ui/help-tip";
import { useAuth } from "@/contexts/AuthContext";

interface DependencyRow {
  id: string;
  ok: boolean;
  error?: string | null;
  code?: number;
  checked_at: string;
  timeout?: number;
  skipped?: boolean;
  request_id?: string;
}

export default function Observability() {
  const { user } = useAuth();
  const isPrivileged = user?.role === "admin";

  // Global readiness banner state
  const [ready, setReady] = useState<boolean | null>(null);
  const [readyDetails, setReadyDetails] = useState<any | null>(null);
  const [readyErr, setReadyErr] = useState<string | null>(null);

  // Dependencies (admin-only diagnostics)
  const [deps, setDeps] = useState<DependencyRow[]>([]);
  const [depsErr, setDepsErr] = useState<string | null>(null);
  const [selectedDep, setSelectedDep] = useState<DependencyRow | null>(null);

  // Liveness diagnostics (admin-only)
  const [liveDetails, setLiveDetails] = useState<any | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);

  // Metrics card (privileged)
  const [metrics, setMetrics] = useState<string>("");
  const [metricsErr, setMetricsErr] = useState<string | null>(null);
  const [metricsAuto, setMetricsAuto] = useState(false);
  const [metricsVisible, setMetricsVisible] = useState(true);

  // System tasks
  const [cooldownUser, setCooldownUser] = useState(0);
  const [cooldownGlobal, setCooldownGlobal] = useState(0);
  const [priceSymbol, setPriceSymbol] = useState("BTC/USDT");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<any | null>(null);
  const [stopPolling, setStopPolling] = useState(false);

  // Derived chips from readiness details
  const serviceCards = useMemo(() => {
    const list = readyDetails?.dependencies || [];
    const required = new Set(["Supabase", "Binance", "Redis"]);
    return list.map((d: any) => ({
      name: d.name,
      ok: !!d.ok,
      required: required.has(d.name),
      code: d.code,
      checked_at: d.checked_at,
      timeout: d.timeout,
      skipped: d.skipped,
    }));
  }, [readyDetails]);

  // Pollers
  const pollReadiness = useCallback(async () => {
    try {
      const r = await fetch("/api/health/ready", { cache: "no-cache" });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const j = await r.json();
      setReady(!!j.ready);
      localStorage.setItem("aether-ready", String(!!j.ready));
      window.dispatchEvent(
        new CustomEvent("aether:readiness", { detail: { ready: !!j.ready } }),
      );
      const d = await fetch("/api/health/ready/details", { cache: "no-cache" });
      setReadyDetails(await d.json());
      setReadyErr(null);
    } catch (e: any) {
      setReadyErr(e.message || "Failed");
      setReady(false);
    }
  }, []);

  const pollDependencies = useCallback(async () => {
    if (!isPrivileged) return;
    try {
      const d = await fetch("/api/health/dependencies", { cache: "no-cache" });
      const list: DependencyRow[] = await d.json();
      setDeps(list);
      setDepsErr(null);
    } catch (e: any) {
      setDepsErr(e.message || "Failed");
    }
  }, [isPrivileged]);

  const pollLiveness = useCallback(async () => {
    if (!isPrivileged) return;
    try {
      const r = await fetch("/api/health/live/details", { cache: "no-cache" });
      if (!r.ok) {
        if (r.status === 503) {
          setLiveErr("Service Unavailable");
        } else {
          setLiveErr(`${r.status} ${r.statusText}`);
        }
      }
      const j = await r.json().catch(() => null);
      setLiveDetails(j);
    } catch (e: any) {
      setLiveErr(e.message || "Failed");
    }
  }, [isPrivileged]);

  const fetchMetrics = useCallback(async () => {
    if (!isPrivileged) return;
    try {
      const r = await fetch("/api/metrics", { cache: "no-cache" });
      if (r.status === 401 || r.status === 403) {
        setMetricsVisible(false);
        return;
      }
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const txt = await r.text();
      setMetrics(txt);
      setMetricsErr(null);
    } catch (e: any) {
      setMetricsErr(e.message || "Failed");
    }
  }, [isPrivileged]);

  // Initial loads
  useEffect(() => {
    pollReadiness();
  }, [pollReadiness]);
  useEffect(() => {
    const a = setInterval(pollReadiness, 30000);
    return () => clearInterval(a);
  }, [pollReadiness]);

  useEffect(() => {
    pollDependencies();
  }, [pollDependencies]);
  useEffect(() => {
    if (!isPrivileged) return;
    const b = setInterval(pollDependencies, 15000);
    return () => clearInterval(b);
  }, [pollDependencies, isPrivileged]);

  useEffect(() => {
    pollLiveness();
  }, [pollLiveness]);
  useEffect(() => {
    if (!isPrivileged) return;
    const c = setInterval(pollLiveness, 30000); // offset naturally by initial call ordering
    return () => clearInterval(c);
  }, [pollLiveness, isPrivileged]);

  useEffect(() => {
    if (metricsAuto) {
      fetchMetrics();
      const t = setInterval(fetchMetrics, 30000);
      return () => clearInterval(t);
    }
  }, [metricsAuto, fetchMetrics]);

  // Cooldowns
  useEffect(() => {
    if (cooldownUser > 0) {
      const t = setInterval(
        () => setCooldownUser((v) => Math.max(0, v - 1)),
        1000,
      );
      return () => clearInterval(t);
    }
  }, [cooldownUser]);
  useEffect(() => {
    if (cooldownGlobal > 0) {
      const t = setInterval(
        () => setCooldownGlobal((v) => Math.max(0, v - 1)),
        1000,
      );
      return () => clearInterval(t);
    }
  }, [cooldownGlobal]);

  // Task polling with backoff
  useEffect(() => {
    let timer: any;
    let attempt = 0;
    const poll = async () => {
      if (!taskId || stopPolling) return;
      attempt += 1;
      try {
        const r = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
          cache: "no-cache",
        });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const j = await r.json();
        setTaskStatus(j);
        if (
          j.status === "SUCCESS" ||
          j.status === "FAILED" ||
          j.status === "CANCELLED"
        )
          return; // stop
      } catch (e) {
        /* keep polling with backoff */
      }
      const backoff = Math.min(15000, 1000 * Math.pow(1.5, attempt));
      timer = setTimeout(poll, backoff);
    };
    poll();
    return () => clearTimeout(timer);
  }, [taskId, stopPolling]);

  const stale = (ts?: string, ms = 60000) => {
    if (!ts) return false;
    const t = new Date(ts).getTime();
    return Date.now() - t > ms;
  };

  const copyText = async (text: string) => {
    await copy(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Observability & Health</h1>
        <div className="flex items-center gap-3">
          <HelpTip content="Refresh readiness, dependencies, liveness, and metrics." />
          <Button
            variant="outline"
            onClick={() => {
              pollReadiness();
              pollDependencies();
              pollLiveness();
              fetchMetrics();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh All
          </Button>
        </div>
      </div>

      {(ready === false || readyErr) && (
        <Alert variant="destructive">
          <AlertDescription>
            {!ready
              ? "System not ready. Investigate dependencies below."
              : readyErr}
          </AlertDescription>
        </Alert>
      )}

      {/* Readiness dashboard */}
      <Card>
        <CardHeader className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Readiness
          </CardTitle>
          <HelpTip content="Overall system readiness and dependency states." />
        </CardHeader>
        <CardContent>
          {ready === null ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={ready ? "default" : "destructive"}>
                {ready ? "Ready" : "Not Ready"}
              </Badge>
              {serviceCards.map((s: any) => (
                <Badge
                  key={s.name}
                  variant={s.ok ? "outline" : "destructive"}
                  className={`${s.required ? "" : "opacity-80"}`}
                >
                  {s.name}: {s.ok ? "ok" : s.skipped ? "skipped" : "error"}
                  {stale(s.checked_at) ? " • stale" : ""}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dependency Diagnostics (admin only) */}
      {isPrivileged && (
        <Card>
          <CardHeader className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" /> Dependency Diagnostics
            </CardTitle>
            <HelpTip content="Detailed status per external service with codes, timeouts, and request IDs." />
          </CardHeader>
          <CardContent>
            {depsErr && (
              <Alert variant="destructive">
                <AlertDescription>{depsErr}</AlertDescription>
              </Alert>
            )}
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2">Service</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Code</th>
                    <th className="text-left p-2">Checked</th>
                    <th className="text-left p-2">Timeout</th>
                    <th className="text-left p-2">Req ID</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deps.map((d) => (
                    <tr
                      key={d.id}
                      className={`border-t ${d.ok ? "" : "bg-destructive/5"}`}
                    >
                      <td className="p-2 font-medium capitalize">{d.id}</td>
                      <td className="p-2">
                        <Badge
                          variant={
                            d.ok
                              ? "outline"
                              : d.skipped
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {d.ok ? "ok" : d.skipped ? "skipped" : "error"}
                        </Badge>
                        {d.error && (
                          <div className="text-xs text-muted-foreground">
                            {d.error}
                          </div>
                        )}
                      </td>
                      <td className="p-2">{d.code ?? ""}</td>
                      <td className="p-2 whitespace-nowrap">
                        {new Date(d.checked_at).toLocaleString()}{" "}
                        {stale(d.checked_at) && (
                          <Badge variant="destructive" className="ml-2">
                            stale
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">{d.timeout ?? ""}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{d.request_id}</code>
                          {d.request_id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => copyText(d.request_id!)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDep(d)}
                          >
                            Diagnostics
                          </Button>
                          <Button size="sm" onClick={pollDependencies}>
                            Retry
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {deps.length === 0 && (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={7}>
                        No dependency data yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedDep && (
              <div className="mt-4 p-3 border rounded bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    Diagnostics: {selectedDep.id}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedDep(null)}
                  >
                    Close
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-2 text-sm mt-2">
                  <div>OK: {String(selectedDep.ok)}</div>
                  <div>Code: {selectedDep.code ?? "-"}</div>
                  <div>
                    Checked: {new Date(selectedDep.checked_at).toLocaleString()}
                  </div>
                  <div>Timeout: {selectedDep.timeout ?? "-"}</div>
                  <div>Skipped: {String(!!selectedDep.skipped)}</div>
                  <div>
                    Request ID: <code>{selectedDep.request_id}</code>
                  </div>
                </div>
                {selectedDep.error && (
                  <div className="mt-2 text-xs">Error: {selectedDep.error}</div>
                )}
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copyText(JSON.stringify(selectedDep, null, 2))
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Liveness Diagnostics (admin only) */}
      {isPrivileged && (
        <Card>
          <CardHeader className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5" /> Liveness Diagnostics
            </CardTitle>
            <HelpTip content="Current health of dependencies and services reporting in real-time." />
          </CardHeader>
          <CardContent>
            {liveErr && (
              <Alert variant="destructive">
                <AlertDescription>{liveErr}</AlertDescription>
              </Alert>
            )}
            {liveDetails ? (
              <div className="grid md:grid-cols-2 gap-3">
                {liveDetails.dependencies?.map((d: any) => (
                  <div
                    key={d.name}
                    className={`p-3 border rounded ${d.ok ? "" : "bg-destructive/5"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{d.name}</div>
                      <Badge variant={d.ok ? "outline" : "destructive"}>
                        {d.ok ? "Healthy" : "Unavailable"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Checked: {new Date(d.checked_at).toLocaleString()} •
                      Timeout: {d.timeout}ms
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">Loading…</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prometheus Metrics (privileged) */}
      {isPrivileged && metricsVisible && (
        <Card>
          <CardHeader className="flex items-start justify-between">
            <CardTitle>Prometheus Metrics</CardTitle>
            <HelpTip content="Raw Prometheus metrics. Use auto-refresh, download, copy, or open in a new tab." />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-sm">
                <span className={`inline-flex items-center gap-2`}>
                  <span
                    className={`w-2 h-2 rounded-full ${metricsErr ? "bg-red-500" : metrics ? "bg-green-500" : "bg-gray-400"}`}
                  ></span>
                  <span>
                    {metricsErr ? "Error" : metrics ? "Live" : "Idle"}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-metrics"
                    checked={metricsAuto}
                    onCheckedChange={setMetricsAuto}
                  />
                  <Label
                    htmlFor="auto-metrics"
                    className="inline-flex items-center gap-2"
                  >
                    Auto-refresh 30s{" "}
                    <HelpTip content="Toggle to fetch metrics automatically every 30 seconds." />
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={fetchMetrics}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([metrics], { type: "text/plain" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "metrics.txt";
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(metrics)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <a href="/api/metrics" target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </a>
                </Button>
              </div>
            </div>
            <pre className="max-h-64 overflow-auto text-xs p-3 bg-muted/40 rounded border whitespace-pre-wrap">
              {metrics || "No metrics loaded"}
            </pre>
            {metricsErr && (
              <Alert className="mt-2" variant="destructive">
                <AlertDescription>
                  Paused due to error: {metricsErr}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Tasks (privileged) */}
      {isPrivileged && (
        <Card>
          <CardHeader className="flex items-start justify-between">
            <CardTitle>System Tasks</CardTitle>
            <HelpTip content="Admin-only utilities to refresh data or queue background jobs." />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                disabled={cooldownUser > 0}
                onClick={async () => {
                  try {
                    await fetch("/api/tasks/data-refresh", { method: "POST" });
                    setCooldownUser(30);
                  } catch {}
                }}
              >
                User Data Refresh{" "}
                {cooldownUser > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {cooldownUser}s
                  </Badge>
                )}
              </Button>
              <Button
                disabled={cooldownGlobal > 0}
                variant="outline"
                onClick={async () => {
                  try {
                    await fetch("/api/data/refresh", { method: "POST" });
                    setCooldownGlobal(60);
                  } catch {}
                }}
              >
                Fleet-wide Refresh{" "}
                {cooldownGlobal > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {cooldownGlobal}s
                  </Badge>
                )}
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sym">Historical price-series symbol</Label>
                  <HelpTip content="Symbol for backfill job, e.g., BTC/USDT." />
                </div>
                <input
                  id="sym"
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                  value={priceSymbol}
                  onChange={(e) => setPriceSymbol(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    try {
                      const r = await fetch(
                        `/api/data/price-series?symbol=${encodeURIComponent(priceSymbol)}`,
                      );
                      const j = await r.json();
                      const id = j.message || j.task_id || "";
                      if (id) {
                        setTaskId(id);
                        setTaskStatus(null);
                        setStopPolling(false);
                      }
                    } catch {}
                  }}
                >
                  Queue Job
                </Button>
                {taskId && (
                  <Button variant="ghost" onClick={() => setStopPolling(true)}>
                    Stop Polling
                  </Button>
                )}
              </div>
            </div>
            {taskId && (
              <div className="text-sm">
                Task: <code>{taskId}</code> • Status:{" "}
                <Badge
                  variant={
                    taskStatus?.status === "SUCCESS" ? "outline" : "secondary"
                  }
                >
                  {taskStatus?.status || "PENDING"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
