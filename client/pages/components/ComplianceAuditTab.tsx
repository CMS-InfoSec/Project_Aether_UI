import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import HelpTip from "@/components/ui/help-tip";
import apiFetch, { getJson } from "@/lib/apiClient";
import { RefreshCw, AlertTriangle, Shield, Filter } from "lucide-react";

interface ComplianceLog {
  id?: string;
  timestamp?: string;
  tradeId?: string;
  user?: string;
  rule?: string;
  status?: string; // pass | fail
  severity?: string; // info|warning|error
  message?: string;
  [k: string]: any;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  success: boolean;
}

export default function ComplianceAuditTab() {
  const [tradeId, setTradeId] = useState("");
  const [user, setUser] = useState("");
  const [ruleType, setRuleType] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [compliance, setCompliance] = useState<ComplianceLog[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    setNotice(null);
    try {
      // Compliance checks for a specific trade
      if (tradeId && tradeId.trim()) {
        try {
          const j = await getJson<any>(
            `/api/v1/compliance/checks/${encodeURIComponent(tradeId.trim())}`,
          );
          const items = Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j)
              ? j
              : [];
          setCompliance(items as ComplianceLog[]);
        } catch {
          setCompliance([]);
          setNotice(
            "Failed to fetch compliance checks for the given trade ID.",
          );
        }
      } else {
        setCompliance([]);
        setNotice(
          "Enter a trade ID to fetch compliance details. Historical logs unavailable.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Stream audit activity from events with SSE, fallback to polling
  useEffect(() => {
    let es1: EventSource | null = null;
    let es2: EventSource | null = null;
    let pollTimer: any;
    const normalize = (e: any): AuditLog | null => {
      const d = e?.data || e || {};
      const ts = String(d.timestamp || d.ts || new Date().toISOString());
      const id = String(d.id || `${d.type || d.action || "event"}_${ts}`);
      const actor = String(d.user || d.actor || d.account || "-");
      const action = String(d.action || d.type || "event");
      const details = d.symbol
        ? `${d.symbol} ${d.side || ""} ${d.qty || d.amount || ""}`.trim()
        : d.details || "";
      const success = d.success !== false;
      return { id, timestamp: ts, action, actor, details, success };
    };
    const add = (item: any) => {
      const n = normalize(item);
      if (!n) return;
      setAudit((prev) => [n, ...prev].slice(0, 200));
    };
    try {
      es1 = new EventSource("/api/v1/events/trades");
      es1.onmessage = (ev) => {
        try {
          add(JSON.parse(ev.data || "{}"));
        } catch {}
      };
    } catch {}
    try {
      es2 = new EventSource("/api/v1/events/balances");
      es2.onmessage = (ev) => {
        try {
          add(JSON.parse(ev.data || "{}"));
        } catch {}
      };
    } catch {}
    // Polling fallback if SSE fails to connect
    pollTimer = setInterval(async () => {
      if (!es1 && !es2) {
        try {
          const t = await getJson<any>(`/api/v1/events/trades?limit=50`).catch(
            () => [],
          );
          const b = await getJson<any>(
            `/api/v1/events/balances?limit=50`,
          ).catch(() => []);
          const arr = ([] as any[]).concat(
            Array.isArray(t?.data) ? t.data : t || [],
            Array.isArray(b?.data) ? b.data : b || [],
          );
          arr.slice(0, 50).forEach(add);
        } catch {}
      }
    }, 8000);
    return () => {
      try {
        es1?.close();
      } catch {}
      try {
        es2?.close();
      } catch {}
      try {
        clearInterval(pollTimer);
      } catch {}
    };
  }, []);

  const filteredCompliance = useMemo(() => {
    return compliance.filter((c) => {
      if (tradeId && !String(c.tradeId || c.trade_id || "").includes(tradeId))
        return false;
      if (
        user &&
        !String(c.user || c.actor || "")
          .toLowerCase()
          .includes(user.toLowerCase())
      )
        return false;
      const rule = String(c.rule || c.rule_type || c.type || "").toLowerCase();
      if (ruleType !== "all" && rule !== ruleType.toLowerCase()) return false;
      return true;
    });
  }, [compliance, tradeId, user, ruleType]);

  const isFailure = (c: ComplianceLog) => {
    const s = String(c.status || c.severity || "").toLowerCase();
    return s.includes("fail") || s.includes("error") || s.includes("violation");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="inline-flex items-center gap-2">
              Compliance & Audit
            </CardTitle>
            <CardDescription>
              Enter a trade ID to fetch compliance details; audit activity
              streams from events
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <HelpTip content="Compliance failures are highlighted; audit log fetched with admin API key." />
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Trade ID</div>
              <Input
                placeholder="e.g., BTC_001_20240121"
                value={tradeId}
                onChange={(e) => setTradeId(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">User</div>
              <Input
                placeholder="user@example.com"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Rule Type
              </div>
              <Select value={ruleType} onValueChange={setRuleType}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="limits">Limits</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="kyc">KYC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={refresh} className="w-full" variant="outline">
                <Filter className="h-4 w-4 mr-2" /> Apply
              </Button>
            </div>
          </div>
          {notice && (
            <div className="text-xs text-muted-foreground mt-2">{notice}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                Compliance Logs
              </CardTitle>
              <CardDescription>Recent compliance checks</CardDescription>
            </div>
            <HelpTip content="Failures highlighted in red; filter controls above." />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {filteredCompliance.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No compliance entries
                  </div>
                )}
                {filteredCompliance.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className={`p-3 border rounded-md ${isFailure(c) ? "border-destructive/50 bg-destructive/5" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {c.rule || c.rule_type || c.type || "Rule"}
                      </div>
                      <div className="flex items-center gap-2">
                        {isFailure(c) ? (
                          <Badge
                            variant="destructive"
                            className="text-xs inline-flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" /> Fail
                          </Badge>
                        ) : (
                          <Badge className="text-xs">Pass</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="mr-3">
                        Trade: {String(c.tradeId || c.trade_id || "-")}
                      </span>
                      <span>User: {String(c.user || c.actor || "-")}</span>
                    </div>
                    {c.message && (
                      <div className="text-sm mt-1">{c.message}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {c.timestamp
                        ? new Date(c.timestamp).toLocaleString()
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                Audit Log
              </CardTitle>
              <CardDescription>System audit trail</CardDescription>
            </div>
            <HelpTip content="Requires admin API key; fetched from /api/audit/logs or /api/system/audit." />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {audit.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No audit entries
                  </div>
                )}
                {audit.map((a) => (
                  <div key={a.id} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{a.action}</div>
                      <Badge
                        variant={a.success ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {a.success ? "success" : "failed"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="mr-3">Actor: {a.actor}</span>
                      <span>{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-sm mt-1">{a.details}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
