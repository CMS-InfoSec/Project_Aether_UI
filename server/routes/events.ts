import type { Request, Response } from "express";

const trades = Array.from({ length: 25 }).map((_, i) => ({
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

const balances = Array.from({ length: 10 }).map((_, i) => ({
  id: `bal_${i + 1}`,
  timestamp: new Date(Date.now() - i * 600_000).toISOString(),
  account: `acct_${(i % 3) + 1}`,
  symbol: ["USDT","BTC","ETH"][i % 3],
  delta: +(Math.random() * 100 - 50).toFixed(2),
  reason: ["trade_fill","deposit","withdrawal"][i % 3],
  request_id: `bal_req_${i + 1}`,
  hmac_verified: Math.random() > 0.1
}));

export function handleEventsTrades(req: Request, res: Response) {
  const { symbol, status } = req.query;
  let items = trades;
  if (symbol) items = items.filter(t => t.symbol.includes(String(symbol).toUpperCase()))
  if (status) items = items.filter(t => t.status === status);
  res.json({ status: 'success', data: { items, total: items.length } });
}

export function handleEventsBalances(_req: Request, res: Response) {
  res.json({ status: 'success', data: { items: balances, total: balances.length } });
}
