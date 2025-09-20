import type { Request, Response } from "express";

let policies = [
  { name: 'momentum', enabled: true, weight: 0.5, kpis: { sharpe: 1.8, win_rate: 0.62 } },
  { name: 'mean_reversion', enabled: true, weight: 0.3, kpis: { sharpe: 1.2, win_rate: 0.55 } },
  { name: 'breakout', enabled: false, weight: 0.2, kpis: { sharpe: 1.0, win_rate: 0.51 } },
];

let exploration = 0.12;
let rl = { online: true, promoted_checkpoint: 'ckpt_rl_v2' };

const demoKPIs: Record<string, Record<string, any>> = {
  'BTC/USDT': {
    momentum: { cumulative_reward: 120.5, trades: [ { pnl: 12.3, return_pct: 0.018, exit_reason: 'tp', fee_cost: 0.6, slippage_cost: 0.2, entry_ts: new Date(Date.now()-3600e3).toISOString(), exit_ts: new Date().toISOString(), duration: 3600, hedge_pnl: 0.5, volatility_penalty: 0.01 } ] },
    mean_reversion: { cumulative_reward: 85.1, trades: [ { pnl: -3.1, return_pct: -0.004, exit_reason: 'sl', fee_cost: 0.3, slippage_cost: 0.2, entry_ts: new Date(Date.now()-7200e3).toISOString(), exit_ts: new Date().toISOString(), duration: 7200, hedge_pnl: 0.2, volatility_penalty: 0.02 } ] }
  },
  'ETH/USDT': {
    momentum: { cumulative_reward: 77.8, trades: [] },
    breakout: { cumulative_reward: 34.2, trades: [] },
  }
};

export function handleASCStatus(_req: Request, res: Response) {
  res.json({ status: 'success', data: { weights: Object.fromEntries(policies.map(p=>[p.name,p.weight])), policies, exploration, kpis: demoKPIs, rl, degraded: false } });
}

export function handleASCReweight(req: Request, res: Response) {
  const { weights } = req.body || {};
  if (weights && typeof weights === 'object') {
    // Clamp, enforce non-zero L1, renormalize to L1=1
    const clamped: Record<string, number> = {};
    let l1 = 0;
    for (const p of policies) {
      const v = typeof weights[p.name] === 'number' ? Math.max(-1, Math.min(1, weights[p.name])) : p.weight;
      clamped[p.name] = v;
      l1 += Math.abs(v);
    }
    if (l1 === 0) {
      return res.status(400).json({ status: 'error', message: 'Weights L1 norm must be > 0' });
    }
    for (const p of policies) {
      policies = policies.map(x => x.name === p.name ? { ...x, weight: clamped[p.name]/l1 } : x);
    }
  }
  res.json({ status: 'success', message: 'reweighted', data: { policies }, persistence_skipped: false });
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

export function handleASCHistory(req: Request, res: Response) {
  const symbol = String(req.query.symbol || 'BTC/USDT').toUpperCase();
  const items = [
    {
      symbol,
      action: 'BUY',
      size_usdt: 1000,
      confidence: 0.72,
      components: [
        { name: 'momentum', score: 0.35, weight: 0.5, size_bucket: 0.6 },
        { name: 'mean_reversion', score: 0.12, weight: 0.3, size_bucket: 0.2 },
        { name: 'breakout', score: 0.05, weight: 0.2, size_bucket: 0.2 },
      ],
      news_sentiment: 0.08,
      rationale: 'Momentum positive with acceptable volatility. Sentiment supportive.',
      scores_agg: { composite: 0.31 },
      weights: Object.fromEntries(policies.map(p=>[p.name,p.weight])),
      scores_shap: [ { feature: 'volatility', shap: -0.05 }, { feature: 'momentum', shap: 0.22 }, { feature: 'liquidity', shap: 0.04 } ],
      ts: new Date().toISOString()
    }
  ];
  res.json({ status: 'success', data: { items, next: null } });
}
