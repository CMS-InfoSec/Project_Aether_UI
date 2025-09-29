import type { Request, Response } from "express";

let trades = Array.from({ length: 125 }).map((_, i) => ({
  id: `trade_${i + 1}`,
  decision_id: `dec_${Math.ceil((i + 1) / 2)}`,
  timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
  symbol: ["BTC/USDT", "ETH/USDT", "SOL/USDT"][i % 3],
  side: i % 2 === 0 ? "BUY" : "SELL",
  size: +(Math.random() * 0.5 + 0.1).toFixed(3),
  price: +(30000 + Math.random() * 5000).toFixed(2),
  pnl_usd: +((Math.random() - 0.5) * 200).toFixed(2),
  status: ["filled", "pending", "cancelled"][i % 3],
  executor: i % 2 === 0 ? "system" : "admin",
  request_id: `req_${i + 1}`,
  hmac_verified: Math.random() > 0.1,
}));

let balances = Array.from({ length: 60 }).map((_, i) => ({
  id: `bal_${i + 1}`,
  timestamp: new Date(Date.now() - i * 600_000).toISOString(),
  account: `acct_${(i % 3) + 1}`,
  symbol: ["USDT", "BTC", "ETH"][i % 3],
  delta: +(Math.random() * 100 - 50).toFixed(2),
  reason: ["trade_fill", "deposit", "withdrawal"][i % 3],
  request_id: `bal_req_${i + 1}`,
  hmac_verified: Math.random() > 0.1,
}));

// Alerts model and seed data
export type AlertSeverity = "info" | "warning" | "error" | "critical";
interface AlertItem {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  source: string;
  event: string;
  message: string;
  details?: Record<string, any>;
}

const SEVERITIES: AlertSeverity[] = ["info", "warning", "error", "critical"];
let alerts: AlertItem[] = Array.from({ length: 40 }).map((_, i) => ({
  id: `alert_${i + 1}`,
  timestamp: new Date(Date.now() - i * 90_000).toISOString(),
  severity: SEVERITIES[i % SEVERITIES.length],
  source: ["monitor", "risk", "execution", "market"][i % 4],
  event: ["threshold", "timeout", "slippage", "latency"][i % 4],
  message: [
    "CPU usage exceeded threshold",
    "Price feed timeout detected",
    "Execution slippage above target",
    "Increased API latency observed",
  ][i % 4],
  details: {
    code: [200, 408, 504, 429][i % 4],
    symbol: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ADA/USDT"][i % 4],
    value: +(Math.random() * 100).toFixed(2),
  },
}));

let tradesVersion = Date.now();
let balancesVersion = Date.now();
let alertsVersion = Date.now();

function applyEventsQuery<T extends { id: string; timestamp: string }>(
  source: T[],
  req: Request,
) {
  const { limit = "25", cursor, since } = req.query as Record<string, string>;
  let items = [...source];
  if (since) {
    const ts = new Date(since).getTime();
    if (!Number.isNaN(ts))
      items = items.filter((i) => new Date(i.timestamp).getTime() >= ts);
  }
  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  let start = 0;
  if (cursor) {
    const idx = items.findIndex((i) => i.id === cursor);
    if (idx >= 0) start = idx + 1;
  }
  const lim = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
  const page = items.slice(start, start + lim);
  const next =
    start + lim < items.length ? items[start + lim - 1]?.id : undefined;
  const latestTs = items[0]?.timestamp || new Date(0).toISOString();
  const etag = `W/"${latestTs}-${items.length}"`;
  const lastModified = latestTs;
  return { items: page, total: items.length, next, etag, lastModified };
}

function preconditionNotModified(
  req: Request,
  etag: string,
  lastModified: string,
) {
  const inm = req.headers["if-none-match"];
  const ims = req.headers["if-modified-since"];
  if (inm && inm === etag) return true;
  if (
    ims &&
    new Date(String(ims)).getTime() >= new Date(lastModified).getTime()
  )
    return true;
  return false;
}

export function handleEventsTrades(req: Request, res: Response) {
  const { symbol, status } = req.query as Record<string, string>;
  let list = trades;
  if (symbol)
    list = list.filter((t) => t.symbol.includes(String(symbol).toUpperCase()));
  if (status) list = list.filter((t) => t.status === status);
  const { items, total, next, etag, lastModified } = applyEventsQuery(
    list,
    req,
  );
  if (preconditionNotModified(req, etag, lastModified)) {
    res.status(304).end();
    return;
  }
  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", lastModified);
  res.json({ status: "success", data: { items, total, next } });
}

export function handleEventsBalances(req: Request, res: Response) {
  const { items, total, next, etag, lastModified } = applyEventsQuery(
    balances,
    req,
  );
  if (preconditionNotModified(req, etag, lastModified)) {
    res.status(304).end();
    return;
  }
  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", lastModified);
  res.json({ status: "success", data: { items, total, next } });
}

export function handleEventsAlerts(req: Request, res: Response) {
  const { severity, source } = req.query as Record<string, string>;
  let list = alerts;
  if (severity && SEVERITIES.includes(severity as AlertSeverity)) {
    list = list.filter((a) => a.severity === (severity as AlertSeverity));
  }
  if (source) list = list.filter((a) => a.source === source);
  const { items, total, next, etag, lastModified } = applyEventsQuery(
    list,
    req,
  );
  if (preconditionNotModified(req, etag, lastModified)) {
    res.status(304).end();
    return;
  }
  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", lastModified);
  res.json({ status: "success", data: { items, total, next } });
}

export function handleEventsAlertsStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Send initial snapshot
  try {
    const snapshot = alerts
      .slice(0, 25)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    res.write(`event: init\n`);
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  } catch {}

  // Periodically emit a new alert
  const interval = setInterval(() => {
    const idx = Math.floor(Math.random() * SEVERITIES.length);
    const now = new Date();
    const item: AlertItem = {
      id: `alert_${Date.now()}`,
      timestamp: now.toISOString(),
      severity: SEVERITIES[idx],
      source: ["monitor", "risk", "execution", "market"][
        Math.floor(Math.random() * 4)
      ],
      event: ["threshold", "timeout", "slippage", "latency"][
        Math.floor(Math.random() * 4)
      ],
      message: [
        "CPU usage exceeded threshold",
        "Price feed timeout detected",
        "Execution slippage above target",
        "Increased API latency observed",
      ][Math.floor(Math.random() * 4)],
      details: {
        symbol: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ADA/USDT"][
          Math.floor(Math.random() * 4)
        ],
        value: +(Math.random() * 100).toFixed(2),
      },
    };
    alerts.unshift(item);
    alertsVersion = Date.now();
    try {
      res.write(`event: alert\n`);
      res.write(`data: ${JSON.stringify(item)}\n\n`);
    } catch {}
  }, 3000);

  req.on("close", () => {
    clearInterval(interval);
    try {
      res.end();
    } catch {}
  });
}
