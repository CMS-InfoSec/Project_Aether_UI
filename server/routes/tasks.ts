import type { Request, Response } from 'express';

const tasks = new Map<string, { status: string; result?: any; }>();

export function handleUserDataRefresh(_req: Request, res: Response) {
  res.json({ status:'triggered' });
}

export function handleGlobalDataRefresh(_req: Request, res: Response) {
  res.json({ status:'triggered' });
}

export function handleDataPriceSeries(req: Request, res: Response) {
  const id = `task_${Date.now()}`; tasks.set(id, { status: 'PENDING' });
  setTimeout(()=>{ tasks.set(id, { status:'SUCCESS', result: { ohlcv: [{ t: Date.now(), o:1,h:2,l:0.5,c:1.5,v:1000 }] } }); }, 1500);
  res.json({ status:'queued', message: id });
}

export function handleTaskStatus(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const t = tasks.get(id);
  if (!t) return res.status(404).json({ status:'error', detail:'not found' });
  res.json({ task_id: id, status: t.status, result: t.result });
}
