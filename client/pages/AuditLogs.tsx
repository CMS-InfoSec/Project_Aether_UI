import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiFetch, { getJson, getWsUrl } from "@/lib/apiClient";
import copy from "@/lib/clipboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import HelpTip from "@/components/ui/help-tip";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Link as LinkIcon,
} from "lucide-react";

interface TradeEvent {
  id: string;
  timestamp: string;
  symbol: string;
  side: string;
  size: number;
  price: number;
  pnl_usd?: number;
  status?: string;
  executor?: string;
  request_id?: string;
  hmac_verified?: boolean;
  decision_id?: string;
  regime?: string;
  rationale?: string;
  shap?: any;
  weights?: any;
  user_id?: string;
  trailing?: any;
}

interface BalanceEvent {
  id: string;
  timestamp: string;
  account: string;
  symbol: string;
  delta: number;
  reason?: string;
  request_id?: string;
  hmac_verified?: boolean;
}

type EventsPayload<T> = { total: number; items: T[]; next?: string | number };
interface EventsResponse<T> {
  status?: string;
  data?: EventsPayload<T>;
  total?: number;
  items?: T[];
  next?: string | number;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AuditLogs() {
  // Filters
  const [symbol, setSymbol] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const [since, setSince] = useState("");
  const [limit, setLimit] = useState(25);

  // Data state
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [balances, setBalances] = useState<BalanceEvent[]>([]);
  const [tNext, setTNext] = useState<string | number | undefined>();
  const [bNext, setBNext] = useState<string | number | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Caching headers
  const tradesETag = useRef<string | null>(null);
  const tradesLM = useRef<string | null>(null);
  const balancesETag = useRef<string | null>(null);
  const balancesLM = useRef<string | null>(null);

  // UI expanders
  const [openTrade, setOpenTrade] = useState<string | null>(null);
  const [openBalance, setOpenBalance] = useState<string | null>(null);

  // Polling
  const [auto, setAuto] = useState(true);

  const buildQuery = (cursorOrOffset?: string | number) => {
    const p = new URLSearchParams();
    if (symbol) p.set("symbol", symbol);
    if (action) p.set("status", action);
    if (since) p.set("since", new Date(since).toISOString());
    if (typeof cursorOrOffset === "string" && cursorOrOffset) p.set("cursor", cursorOrOffset);
    if (typeof cursorOrOffset === "number") p.set("offset", String(cursorOrOffset));
    p.set("limit", String(limit));
    return p.toString();
  };

  const fetchTrades = useCallback(
    async (cursor?: string | number, append = false) => {
      const qs = buildQuery(cursor);
      const headers: Record<string, string> = {};
      if (tradesETag.current) headers["If-None-Match"] = tradesETag.current;
      if (tradesLM.current) headers["If-Modified-Since"] = tradesLM.current;
      const r = await apiFetch(`/api/events/trades?${qs}`, { headers });
      if (r.status === 304) return; // keep cache
      const et = r.headers.get("ETag");
      if (et) tradesETag.current = et;
      const lm = r.headers.get("Last-Modified");
      if (lm) tradesLM.current = lm;
      const j: EventsResponse<TradeEvent> = await r.json().catch(() => ({} as any));
      const data: EventsPayload<TradeEvent> = j.data || { total: j.total as any, items: (j.items as any) || [], next: j.next };
      setTNext(data.next);
      setTrades((prev) => (append ? prev.concat(data.items) : data.items));
    },
    [symbol, action, since, limit],
  );

  const fetchBalances = useCallback(
    async (cursor?: string | number, append = false) => {
      const qs = buildQuery(cursor);
      const headers: Record<string, string> = {};
      if (balancesETag.current) headers["If-None-Match"] = balancesETag.current;
      if (balancesLM.current) headers["If-Modified-Since"] = balancesLM.current;
      const r = await apiFetch(`/api/events/balances?${qs}`, { headers });
      if (r.status === 304) return;
      const et = r.headers.get("ETag");
      if (et) balancesETag.current = et;
      const lm = r.headers.get("Last-Modified");
      if (lm) balancesLM.current = lm;
      const j: EventsResponse<BalanceEvent> = await r.json().catch(() => ({} as any));
      const data: EventsPayload<BalanceEvent> = j.data || { total: j.total as any, items: (j.items as any) || [], next: j.next };
      setBNext(data.next);
      setBalances((prev) =>
        append ? prev.concat(data.items) : data.items,
      );
    },
    [symbol, action, since, limit],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([
        fetchTrades(undefined, false),
        fetchBalances(undefined, false),
      ]);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
  }, [fetchTrades, fetchBalances]);

  // Initial load & polling
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [auto, load]);

  // Attempt optional WS subscription (degrades gracefully to polling)
  useEffect(() => {
    let wt: WebSocket | null = null;
    let wb: WebSocket | null = null;
    try {
      const tUrl = getWsUrl("/api/v1/events/trades");
      if (tUrl) {
        wt = new WebSocket(tUrl);
        wt.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg && msg.id)
              setTrades((prev) => [msg as TradeEvent, ...prev].slice(0, 500));
          } catch {}
        };
      }
    } catch {}
    try {
      const bUrl = getWsUrl("/api/v1/events/balances");
      if (bUrl) {
        wb = new WebSocket(bUrl);
        wb.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg && msg.id)
              setBalances((prev) => [msg as BalanceEvent, ...prev].slice(0, 500));
          } catch {}
        };
      }
    } catch {}
    return () => {
      try { wt?.close(); } catch {}
      try { wb?.close(); } catch {}
    };
  }, []);

  const exportJSON = async () => {
    const payload = {
      filters: { symbol, action, user, since, limit },
      trades: await Promise.all(
        trades.map(async (t) => ({
          ...t,
          integrity: await sha256Hex(JSON.stringify(t)),
        })),
      ),
      balances: await Promise.all(
        balances.map(async (b) => ({
          ...b,
          integrity: await sha256Hex(JSON.stringify(b)),
        })),
      ),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "audit_export.json";
    a.click();
  };

  const exportCSV = async () => {
    const rows: any[] = trades
      .map((t) => ({ type: "trade", ...t }))
      .concat(balances.map((b) => ({ type: "balance", ...b })));
    const headers = Array.from(
      rows.reduce(
        (set: Set<string>, r: any) => {
          Object.keys(r).forEach((k) => set.add(k));
          return set;
        },
        new Set<string>(["type", "id", "timestamp"]),
      ),
    );
    const digests = await Promise.all(
      rows.map((r) => sha256Hex(JSON.stringify(r))),
    );
    const csv = [headers.concat(["integrity"]).join(",")]
      .concat(
        rows.map((r, idx) =>
          headers
            .concat(["integrity"])
            .map((h) => {
              const v = h === "integrity" ? digests[idx] : (r as any)[h];
              if (v === undefined || v === null) return "";
              const s =
                typeof v === "string" ? v.replace(/"/g, '""') : String(v);
              return /[,\n"]/.test(s) ? `"${s}"` : s;
            })
            .join(","),
        ),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "audit_export.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit & Logs</h1>
        <div className="flex items-center gap-2">
          <HelpTip content="Export events with integrity hashes or refresh the current view." />
          <Button variant="outline" onClick={exportJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex items-start justify-between">
          <CardTitle>Filters</CardTitle>
          <HelpTip content="Filter by symbol, status/action, user, time window, and page size." />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5 items-end">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Symbol</label>
                <HelpTip content="Asset pair, e.g., BTC/USDT. Case-insensitive." />
              </div>
              <Input
                placeholder="BTC/USDT"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Action/Status</label>
                <HelpTip content="Trade side or lifecycle status (e.g., buy, sell, filled, pending)." />
              </div>
              <Input
                placeholder="filled/pending/buy/sell"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm">User</label>
                <HelpTip content="Actor responsible (e.g., admin, system, user ID)." />
              </div>
              <Input
                placeholder="admin/system"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Since</label>
                <HelpTip content="Start time for events (local timezone)." />
              </div>
              <Input
                type="datetime-local"
                value={since}
                onChange={(e) => setSince(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Limit</label>
                <HelpTip content="Number of events per request (1-100)." />
              </div>
              <Input
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) =>
                  setLimit(
                    Math.min(100, Math.max(1, parseInt(e.target.value) || 25)),
                  )
                }
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={load}>Apply</Button>
            <label className="text-sm ml-2 inline-flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
              />{" "}
              <span className="inline-flex items-center gap-2">
                Auto-refresh 30s{" "}
                <HelpTip content="Reload filters and data automatically every 30 seconds." />
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start justify-between">
          <CardTitle>Recent Trades</CardTitle>
          <HelpTip content="Recent trade events with payloads, HMAC status, and integrity hashes." />
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Trade ID</th>
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-left p-2">Size</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">HMAC</th>
                  <th className="text-left p-2">Request ID</th>
                  <th className="text-left p-2">Expand</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-t align-top">
                    <td className="p-2">{t.id}</td>
                    <td className="p-2 whitespace-nowrap">
                      {new Date(t.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2">{t.symbol}</td>
                    <td className="p-2">{t.side}</td>
                    <td className="p-2">{t.size}</td>
                    <td className="p-2">{t.price}</td>
                    <td className="p-2">{t.status}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${t.hmac_verified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {t.hmac_verified ? "verified" : "failed"}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{t.request_id}</code>
                        {t.request_id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copy(t.request_id!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOpenTrade(openTrade === t.id ? null : t.id)
                        }
                      >
                        {openTrade === t.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {openTrade === t.id && (
                        <div className="mt-2 p-2 border rounded bg-muted/30">
                          <div className="text-xs text-muted-foreground mb-1">
                            Raw payload
                          </div>
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(t, null, 2)}
                          </pre>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const v = await sha256Hex(JSON.stringify(t));
                                await copy(v);
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy integrity hash (SHA-256)
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {trades.length === 0 && (
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={10}>
                      No trade events
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              disabled={tNext === undefined || tNext === null}
              onClick={() => fetchTrades(tNext, true)}
            >
              Load more
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start justify-between">
          <CardTitle>Balance Events</CardTitle>
          <HelpTip content="Balance change events with request IDs and HMAC verification." />
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">Account</th>
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Delta</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-left p-2">HMAC</th>
                  <th className="text-left p-2">Request ID</th>
                  <th className="text-left p-2">Expand</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.id} className="border-t align-top">
                    <td className="p-2">{b.id}</td>
                    <td className="p-2 whitespace-nowrap">
                      {new Date(b.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2">{b.account}</td>
                    <td className="p-2">{b.symbol}</td>
                    <td className="p-2">{b.delta}</td>
                    <td className="p-2">{b.reason}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${b.hmac_verified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {b.hmac_verified ? "verified" : "failed"}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{b.request_id}</code>
                        {b.request_id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copy(b.request_id!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOpenBalance(openBalance === b.id ? null : b.id)
                        }
                      >
                        {openBalance === b.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {openBalance === b.id && (
                        <div className="mt-2 p-2 border rounded bg-muted/30">
                          <div className="text-xs text-muted-foreground mb-1">
                            Raw payload
                          </div>
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(b, null, 2)}
                          </pre>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const v = await sha256Hex(JSON.stringify(b));
                                await copy(v);
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy integrity hash (SHA-256)
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {balances.length === 0 && (
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={9}>
                      No balance events
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              disabled={bNext === undefined || bNext === null}
              onClick={() => fetchBalances(bNext, true)}
            >
              Load more
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
