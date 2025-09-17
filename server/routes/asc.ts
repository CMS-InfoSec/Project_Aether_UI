import type { Request, Response } from "express";

let policies = [
  { name: 'momentum', enabled: true, weight: 0.5, kpis: { sharpe: 1.8 } },
  { name: 'mean_reversion', enabled: true, weight: 0.3, kpis: { sharpe: 1.2 } },
  { name: 'breakout', enabled: false, weight: 0.2, kpis: { sharpe: 1.0 } },
];

export function handleASCStatus(_req: Request, res: Response) {
  res.json({ status: 'success', data: { weights: Object.fromEntries(policies.map(p=>[p.name,p.weight])), policies } });
}

export function handleASCReweight(req: Request, res: Response) {
  const { weights } = req.body || {};
  if (weights && typeof weights === 'object') {
    policies = policies.map(p => ({ ...p, weight: weights[p.name] ?? p.weight }));
  }
  res.json({ status: 'success', message: 'reweighted', data: { policies } });
}

export function handleASCActivate(req: Request, res: Response) {
  const { name } = req.params as { name: string };
  policies = policies.map(p => p.name === name ? { ...p, enabled: true } : p);
  res.json({ status: 'success' });
}

export function handleASCDeactivate(req: Request, res: Response) {
  const { name } = req.params as { name: string };
  policies = policies.map(p => p.name === name ? { ...p, enabled: false } : p);
  res.json({ status: 'success' });
}
