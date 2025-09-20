import type { Request, Response } from 'express';

const tasks = new Map<string, { status: string; result?: any; }>();

// Per-user fixed window limiter: 5 req/min
const perUserLimiter = new Map<string, { start: number; count: number }>();
const USER_WINDOW_MS = 60_000; const USER_MAX = 5;

// Global cooldown for fleet-wide refresh: 60s
let lastGlobalRefresh = 0; const GLOBAL_COOLDOWN_MS = 60_000;

function getClientKey(req: Request) {
  // Use IP as a simple stand-in for user identity in this mock environment
  return (req.headers['x-forwarded-for'] as string) || (req.socket && (req.socket.remoteAddress || 'local')) || 'local';
}

export function handleUserDataRefresh(req: Request, res: Response) {
  const key = getClientKey(req);
  const now = Date.now();
  const rec = perUserLimiter.get(key) || { start: now, count: 0 };
  if (now - rec.start >= USER_WINDOW_MS) { rec.start = now; rec.count = 0; }
  if (rec.count >= USER_MAX) {
    const retry = Math.ceil((rec.start + USER_WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', String(retry));
    return res.status(429).json({ status:'error', detail:'rate limited', retry_after: retry });
  }
  rec.count += 1; perUserLimiter.set(key, rec);
  res.json({ status:'triggered' });
}

export function handleGlobalDataRefresh(_req: Request, res: Response) {
  const now = Date.now();
  const rem = lastGlobalRefresh + GLOBAL_COOLDOWN_MS - now;
  if (rem > 0) {
    const retry = Math.ceil(rem / 1000);
    res.setHeader('Retry-After', String(retry));
    return res.status(429).json({ status:'error', detail:'global cooldown', retry_after: retry });
  }
  lastGlobalRefresh = now;
  res.json({ status:'triggered' });
}

export function handleDataPriceSeries(req: Request, res: Response) {
  const { coin = 'BTC', interval = '1h', lookback = '7' } = req.query as Record<string,string>;
  const id = `task_${Date.now()}`; tasks.set(id, { status: 'PENDING' });
  setTimeout(()=>{ tasks.set(id, { status:'SUCCESS', result: { symbol: coin, interval, ohlcv: [{ t: Date.now(), o:1,h:2,l:0.5,c:1.5,v:1000 }] } }); }, 1500);
  res.json({ status:'queued', message: id });
}

export function handleTaskStatus(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const t = tasks.get(id);
  if (!t) return res.status(404).json({ status:'error', detail:'not found' });
  res.json({ task_id: id, status: t.status, result: t.result });
}
