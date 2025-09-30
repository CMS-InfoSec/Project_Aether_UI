import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import HelpTip from "@/components/ui/help-tip";
import apiFetch, { getJson, getBaseUrl } from "@/lib/apiClient";
import {
  RefreshCw,
  Download,
  Filter,
  Clock,
  User as UserIcon,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

interface ReportHistoryItem {
  id: string;
  timestamp: string | number;
  operatorId?: string;
  filters?: { trades?: boolean; compliance?: boolean; governance?: boolean };
  format?: "csv" | "json";
  status?: string;
}

export default function RegulatoryReportsTab() {
  const [filters, setFilters] = useState({
    trades: true,
    compliance: true,
    governance: true,
  });
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [degradedAudit, setDegradedAudit] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.trades) parts.push("Trade logs");
    if (filters.compliance) parts.push("Compliance checks");
    if (filters.governance) parts.push("Governance events");
    return parts.join(" • ") || "None";
  }, [filters]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      // Preferred endpoint
      try {
        const j = await getJson<any>("/api/v1/reports/history");
        const records: any[] = Array.isArray(j?.records)
          ? j.records
          : Array.isArray(j?.data?.records)
            ? j.data.records
            : Array.isArray(j)
              ? j
              : [];
        setHistory(
          records.map((it: any) => ({
            id: String(it.id || `${Date.now()}_${Math.random()}`),
            timestamp: it.timestamp || it.createdAt || Date.now(),
            operatorId: it.operatorId || it.operator || it.user || undefined,
            filters: it.filters || undefined,
            format:
              it.format === "csv" || it.format === "json"
                ? it.format
                : undefined,
            status: it.status || it.result || undefined,
          })),
        );
        setDegradedAudit(false);
        return;
      } catch {}

      // Fallback: degraded mode, subscribe to audit SSE
      setDegradedAudit(true);
      try {
        if (esRef.current) {
          try {
            esRef.current.close();
          } catch {}
          esRef.current = null;
        }
        const base = getBaseUrl();
        const es = new EventSource(`${base}/api/v1/system/audit`);
        esRef.current = es;
        es.onmessage = (ev) => {
          try {
            const it = JSON.parse(ev.data || "{}");
            const action = String(it.action || "").toLowerCase();
            if (!action.includes("report")) return;
            const h: ReportHistoryItem = {
              id: String(it.id || `${Date.now()}_${Math.random()}`),
              timestamp: it.timestamp || Date.now(),
              operatorId: it.actor || it.user || undefined,
              filters: it.details?.filters || undefined,
              format: it.details?.format || undefined,
              status: it.success === false ? "failed" : "success",
            };
            setHistory((prev) => [h, ...prev].slice(0, 200));
          } catch {}
        };
        es.onerror = () => {
          try {
            es.close();
          } catch {}
          esRef.current = null;
        };
      } catch {}
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    return () => {
      try {
        esRef.current?.close();
      } catch {}
    };
  }, []);

  const toggle = (key: keyof typeof filters) => (checked: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: !!checked }));
  };

  const generate = async (fmt: "csv" | "json") => {
    setGenerating(true);
    try {
      const body = { format: fmt, filters };
      const resp = await apiFetch(`/api/v1/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        // Attempt GET fallback
        const alt = await apiFetch(
          `/api/v1/reports/generate?format=${encodeURIComponent(fmt)}&trades=${filters.trades}&compliance=${filters.compliance}&governance=${filters.governance}`,
        );
        if (!alt.ok) throw new Error(`HTTP ${resp.status}`);
        await downloadResponse(alt, fmt);
      } else {
        await downloadResponse(resp, fmt);
      }

      // refresh history after successful generation
      loadHistory();
    } catch (e) {
      console.error("generate report failed", e);
    } finally {
      setGenerating(false);
    }
  };

  const downloadResponse = async (resp: Response, fmt: "csv" | "json") => {
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const disposition = resp.headers.get("content-disposition") || "";
    const match = disposition.match(
      /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i,
    );
    let filename =
      match?.[1] ||
      match?.[2] ||
      `regulatory-report-${new Date().toISOString().replace(/[:.]/g, "-")}.${fmt === "csv" ? "csv" : "json"}`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Regulatory Reports
            </CardTitle>
            <CardDescription>
              Generate exportable reports for trades, compliance, and governance
            </CardDescription>
          </div>
          <HelpTip content="Reports are generated server-side from selected categories. Choose CSV or JSON to download." />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <div className="font-medium">Filters</div>
                <HelpTip content="Select which datasets to include." />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={filters.trades}
                    onCheckedChange={toggle("trades")}
                  />
                  <span>Trade logs</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={filters.compliance}
                    onCheckedChange={toggle("compliance")}
                  />
                  <span>Compliance checks</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={filters.governance}
                    onCheckedChange={toggle("governance")}
                  />
                  <span>Governance events</span>
                </label>
              </div>
              <div className="text-xs text-muted-foreground">
                Included: {filterSummary}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <div className="font-medium">Output</div>
                <HelpTip content="Choose output format and generate the report." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => generate("csv")}
                  disabled={generating}
                >
                  {generating ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Generate CSV
                </Button>
                <Button onClick={() => generate("json")} disabled={generating}>
                  {generating ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Generate JSON
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Recent Report History
            </CardTitle>
            <CardDescription>
              Timestamps and operator IDs of recent generations
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loadingHistory}
          >
            {loadingHistory ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {degradedAudit && (
            <div className="p-3 mb-3 border rounded bg-yellow-50 text-yellow-800 text-sm">
              Degraded: audit history withheld/unavailable; approximating from
              live audit stream.
            </div>
          )}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {history.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No history found
                </div>
              )}
              {history.map((h) => (
                <div key={h.id} className="p-2 border rounded-md text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    {h.operatorId && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                        <span>{h.operatorId}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {h.format ? `Format: ${h.format.toUpperCase()}` : ""}
                    {h.filters
                      ? ` • Filters: ${Object.keys(h.filters)
                          .filter((k) => (h.filters as any)[k])
                          .join(", ")}`
                      : ""}
                    {h.status ? ` • Status: ${h.status}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
