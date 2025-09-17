import type { Request, Response } from 'express';

let pending = Array.from({length:8}).map((_,i)=>({
  strategy_id: `strat_${i+1}`,
  name: ['Momentum','Mean Reversion','Breakout','Carry','Arb','Trend','VolTarget','Pairs'][i],
  submitter: { id: `u_${i+1}`, name: `User ${i+1}`, role: i%2? 'admin':'user' },
  metrics: { sharpe: +(Math.random()*2).toFixed(2), win_rate: +(Math.random()*100).toFixed(1), avg_return: +(Math.random()*0.05).toFixed(3) },
  submitted_at: new Date(Date.now()-i*86400000).toISOString()
}));

export function handlePendingStrategies(req: Request, res: Response) {
  const { limit='25', offset='0', search='' } = req.query as Record<string,string>;
  let items = pending.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const o = parseInt(offset,10)||0; const l = parseInt(limit,10)||25;
  res.json({ status:'success', data: { items: items.slice(o,o+l), total: items.length, limit:l, offset:o } });
}

export function handleApproveStrategy(req: Request, res: Response) {
  const { strategyId } = req.params as { strategyId: string };
  const idx = pending.findIndex(p=>p.strategy_id===strategyId);
  if (idx === -1) return res.status(404).json({ status:'error', detail:'not found' });
  const removed = pending.splice(idx,1)[0];
  res.json({ status:'success', data: { approved: true, audit_entry_id: `audit_${Date.now()}`, strategy: removed } });
}
