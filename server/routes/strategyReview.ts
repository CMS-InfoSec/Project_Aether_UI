import type { Request, Response } from 'express';

// In-memory mock queue to simulate pending strategies
let pending = Array.from({ length: 47 }).map((_, i) => ({
  strategy_id: `strat_${i + 1}`,
  name: [
    'Momentum','Mean Reversion','Breakout','Carry','Arbitrage','Trend Following','Volatility Target','Pairs Trading',
    'Grid Bot','Scalper','Swing','News Sentiment','Mean Variance','Risk Parity','Stat Arb','Liquidity Maker'
  ][i % 16] + ` ${Math.floor(i/16)+1}`,
  submitter: { id: `u_${(i % 7) + 1}`, name: `User ${(i % 7) + 1}`, role: i % 3 === 0 ? 'admin' : 'user' },
  metrics: {
    sharpe: +(Math.random() * 3).toFixed(2),
    win_rate: +(50 + Math.random() * 50).toFixed(1),
    avg_return: +(Math.random() * 0.05).toFixed(3)
  },
  submitted_at: new Date(Date.now() - i * 3600_000).toISOString()
}));

function isSupabaseDegraded() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  return !url || !key;
}

function clampPageSize(raw: number) {
  const GLOBAL_MAX = 50; // enforce global page-size limit
  return Math.max(1, Math.min(GLOBAL_MAX, raw || 25));
}

export function handlePendingStrategies(req: Request, res: Response) {
  const q = (req.query || {}) as Record<string, string>;
  const search = (q.search || '').toLowerCase();
  const submitter = (q.submitter || '').toLowerCase();
  const sort = (q.sort || 'name').toLowerCase();
  const dir = (q.dir || 'asc').toLowerCase();
  const o = parseInt(q.offset || '0', 10) || 0;
  const l = clampPageSize(parseInt(q.limit || '25', 10) || 25);

  // Optional KPI thresholds
  const minSharpe = isFinite(Number(q.min_sharpe)) ? Number(q.min_sharpe) : undefined;
  const minWin = isFinite(Number(q.min_win_rate)) ? Number(q.min_win_rate) : undefined;
  const minAvg = isFinite(Number(q.min_avg_return)) ? Number(q.min_avg_return) : undefined;

  // Simulated degraded mode if Supabase creds are missing
  const degraded = isSupabaseDegraded();

  let items = pending.filter(p => {
    if (search && !p.name.toLowerCase().includes(search)) return false;
    if (submitter && !(`${p.submitter.id} ${p.submitter.name}`.toLowerCase().includes(submitter))) return false;
    if (minSharpe !== undefined && Number(p.metrics.sharpe) < minSharpe) return false;
    if (minWin !== undefined && Number(p.metrics.win_rate) < minWin) return false;
    if (minAvg !== undefined && Number(p.metrics.avg_return) < minAvg) return false;
    return true;
  });

  items.sort((a, b) => {
    let v = 0;
    if (sort === 'name') v = a.name.localeCompare(b.name);
    else if (sort === 'sharpe') v = Number(a.metrics.sharpe) - Number(b.metrics.sharpe);
    else if (sort === 'win_rate') v = Number(a.metrics.win_rate) - Number(b.metrics.win_rate);
    else if (sort === 'avg_return') v = Number(a.metrics.avg_return) - Number(b.metrics.avg_return);
    else if (sort === 'submitted_at') v = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
    else v = a.name.localeCompare(b.name);
    return dir === 'desc' ? -v : v;
  });

  const total = items.length;
  const page = items.slice(o, o + l);
  const next_offset = o + page.length < total ? o + page.length : null;

  res.setHeader('X-Supabase-Degraded', String(degraded));
  return res.json({
    status: 'success',
    data: { items: page, total, limit: l, offset: o, next_offset, supabase_degraded: degraded }
  });
}

export function handleApproveStrategy(req: Request, res: Response) {
  const { strategyId } = req.params as { strategyId: string };
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const idx = pending.findIndex((p) => p.strategy_id === strategyId);
  if (idx === -1) return res.status(404).json({ status: 'error', detail: 'not found' });

  const degraded = isSupabaseDegraded();
  const removed = pending.splice(idx, 1)[0];
  const payload = {
    status: 'success',
    data: {
      approved: true,
      audit_entry_id: `audit_${Date.now()}`,
      strategy: removed,
      request_id: requestId,
      persistence_skipped: degraded,
    },
    warning: degraded ? 'Supabase unavailable: approval persisted in-memory; deferred durable persistence' : undefined,
  } as any;

  res.setHeader('X-Supabase-Degraded', String(degraded));
  if (degraded) {
    return res.status(503).json(payload);
  }
  return res.json(payload);
}
