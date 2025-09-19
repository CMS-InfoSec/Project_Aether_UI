import type { Request, Response } from "express";

let trades = Array.from({ length: 125 }).map((_, i) => ({
  id: `trade_${i + 1}`,
  decision_id: `dec_${Math.ceil((i+1)/2)}`,
  timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
  symbol: ["BTC/USDT","ETH/USDT","SOL/USDT"][i % 3],
  side: i % 2 === 0 ? "BUY" : "SELL",
  size: +(Math.random() * 0.5 + 0.1).toFixed(3),
  price: +(30000 + Math.random() * 5000).toFixed(2),
  pnl_usd: +((Math.random() - 0.5) * 200).toFixed(2),
  status: ["filled","pending","cancelled"][i % 3],
  executor: i % 2 === 0 ? "system" : "admin",
  request_id: `req_${i + 1}`,
  hmac_verified: Math.random() > 0.1
}));

let balances = Array.from({ length: 60 }).map((_, i) => ({
  id: `bal_${i + 1}`,
  timestamp: new Date(Date.now() - i * 600_000).toISOString(),
  account: `acct_${(i % 3) + 1}`,
  symbol: ["USDT","BTC","ETH"][i % 3],
  delta: +(Math.random() * 100 - 50).toFixed(2),
  reason: ["trade_fill","deposit","withdrawal"][i % 3],
  request_id: `bal_req_${i + 1}`,
  hmac_verified: Math.random() > 0.1
}));

let tradesVersion = Date.now();
let balancesVersion = Date.now();

function applyEventsQuery<T extends { id:string; timestamp:string }>(source: T[], req: Request) {
  const { limit = '25', cursor, since } = req.query as Record<string,string>;
  let items = [...source];
  if (since) {
    const ts = new Date(since).getTime();
    if (!Number.isNaN(ts)) items = items.filter(i => new Date(i.timestamp).getTime() >= ts);
  }
  items.sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  let start = 0;
  if (cursor) {
    const idx = items.findIndex(i=> i.id === cursor);
    if (idx >= 0) start = idx + 1;
  }
  const lim = Math.max(1, Math.min(parseInt(limit,10) || 25, 100));
  const page = items.slice(start, start + lim);
  const next = (start + lim) < items.length ? items[start + lim - 1]?.id : undefined;
  const latestTs = items[0]?.timestamp || new Date(0).toISOString();
  const etag = `W/"${latestTs}-${items.length}"`;
  const lastModified = latestTs;
  return { items: page, total: items.length, next, etag, lastModified };
}

function preconditionNotModified(req: Request, etag: string, lastModified: string) {
  const inm = req.headers['if-none-match'];
  const ims = req.headers['if-modified-since'];
  if (inm && inm === etag) return true;
  if (ims && new Date(String(ims)).getTime() >= new Date(lastModified).getTime()) return true;
  return false;
}

export function handleEventsTrades(req: Request, res: Response) {
  const { symbol, status } = req.query as Record<string,string>;
  let list = trades;
  if (symbol) list = list.filter(t => t.symbol.includes(String(symbol).toUpperCase()));
  if (status) list = list.filter(t => t.status === status);
  const { items, total, next, etag, lastModified } = applyEventsQuery(list, req);
  if (preconditionNotModified(req, etag, lastModified)) {
    res.status(304).end();
    return;
  }
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastModified);
  res.json({ status: 'success', data: { items, total, next } });
}

export function handleEventsBalances(req: Request, res: Response) {
  const { items, total, next, etag, lastModified } = applyEventsQuery(balances, req);
  if (preconditionNotModified(req, etag, lastModified)) {
    res.status(304).end();
    return;
  }
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastModified);
  res.json({ status: 'success', data: { items, total, next } });
}
