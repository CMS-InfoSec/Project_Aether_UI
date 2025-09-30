import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import HelpTip from "@/components/ui/help-tip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBaseUrl, apiFetch } from "@/lib/apiClient";

interface AlertItem {
  id: string;
  timestamp: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string;
  event: string;
  message: string;
  details?: Record<string, any>;
}

function severityBadge(sev: AlertItem["severity"]) {
  switch (sev) {
    case "critical":
      return <Badge variant="destructive">CRITICAL</Badge>;
    case "error":
      return <Badge variant="destructive">ERROR</Badge>;
    case "warning":
      return <Badge variant="secondary">WARNING</Badge>;
    default:
      return <Badge variant="outline">INFO</Badge>;
  }
}

function rowClass(sev: AlertItem["severity"]) {
  switch (sev) {
    case "critical":
      return "border-l-4 border-red-600 bg-red-50/40";
    case "error":
      return "border-l-4 border-red-400 bg-red-50/20";
    case "warning":
      return "border-l-4 border-amber-400 bg-amber-50/20";
    default:
      return "border-l-4 border-blue-400 bg-blue-50/10";
  }
}

export default function AlertsPanel() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [live, setLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const lastTsRef = useRef<string | null>(null);
  const stopRef = useRef(false);
  const [severity, setSeverity] = useState<
    "all" | "info" | "warning" | "error" | "critical"
  >("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    const base = getBaseUrl();
    const url = `${base}/api/v1/events/alerts/stream`;
    try {
      const es = new EventSource(url);
      esRef.current = es;
      setLive(true);
      es.addEventListener("init", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data || "[]") as AlertItem[];
          setItems((prev) => {
            const merged = [...data, ...prev];
            merged.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            );
            return merged.slice(0, 200);
          });
          if (data[0]?.timestamp) lastTsRef.current = data[0].timestamp;
        } catch {}
      });
      es.addEventListener("alert", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data || "{}") as AlertItem;
          setItems((prev) => {
            const merged = [data, ...prev];
            merged.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            );
            return merged.slice(0, 200);
          });
          lastTsRef.current = data.timestamp;
        } catch {}
      });
      es.onerror = () => {
        setLive(false);
        try {
          es.close();
        } catch {}
        esRef.current = null;
      };
    } catch {
      setLive(false);
    }

    return () => {
      stopRef.current = true;
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {}
        esRef.current = null;
      }
    };
  }, []);

  // Fallback polling if SSE not connected
  useEffect(() => {
    if (live) return;
    let timer: any;
    const poll = async () => {
      if (stopRef.current) return;
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (lastTsRef.current) params.set("since", lastTsRef.current);
      if (severity !== "all") params.set("severity", severity);
      try {
        const r = await apiFetch(`/api/v1/events/alerts?${params.toString()}`, {
          cache: "no-cache",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json().catch(() => null);
        const incoming: AlertItem[] = j?.data?.items || j?.items || [];
        if (Array.isArray(incoming) && incoming.length) {
          setItems((prev) => {
            const map = new Map(prev.map((p) => [p.id, p]));
            for (const a of incoming) map.set(a.id, a);
            const merged = Array.from(map.values());
            merged.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            );
            return merged.slice(0, 200);
          });
          if (incoming[0]?.timestamp) lastTsRef.current = incoming[0].timestamp;
        }
      } catch {}
      timer = setTimeout(poll, 3000);
    };
    poll();
    return () => clearTimeout(timer);
  }, [live, severity]);

  const eventOptions = Array.from(new Set(items.map((i) => i.event))).sort();
  const filtered = items.filter(
    (i) =>
      (severity === "all" ? true : i.severity === severity) &&
      (typeFilter === "all" ? true : i.event === typeFilter),
  );

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <CardTitle className="flex items-center gap-2">
          Alerts Feed
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`w-2 h-2 rounded-full ${live ? "bg-green-500" : "bg-gray-400"}`}
            ></span>
            {live ? "Live" : "Polling"}
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="min-w-[140px]">
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {eventOptions.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <HelpTip content="Streaming alerts from /events/alerts. Filter by severity and type." />
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded">
          <ScrollArea className="h-80">
            <div className="divide-y">
              {filtered.map((a) => (
                <div key={a.id} className={`p-3 ${rowClass(a.severity)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {severityBadge(a.severity)}
                      <div className="font-medium">
                        {a.source}: {a.event}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm mt-1">{a.message}</div>
                  {a.details && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.entries(a.details).map(([k, v]) => (
                        <span key={k} className="mr-3">
                          <span className="uppercase">{k}</span>: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">
                  No alerts match filters
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
