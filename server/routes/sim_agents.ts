import { Request, Response } from 'express';

export type AgentProfile = {
  type: 'market_maker' | 'arbitrage_bot' | 'momentum_trader' | 'spoofer';
  count: number;
  aggression: number; // 0..1
  capital: number; // relative capital units
};

export type AgentsConfig = {
  profiles: AgentProfile[];
  seed?: number;
  steps?: number; // simulation steps
};

export type AgentsRunMetrics = {
  stability_index: number; // 0..1 (higher is more stable)
  avg_spread_bps: number;
  spread_vol_bps: number; // volatility of spread
  midprice_drift_bps: number;
};

export type AgentsRunResult = {
  id: string;
  started_at: string;
  completed_at: string;
  status: 'completed';
  pnl: Array<{ agent: string; pnl: number }>;
  spread_over_time: Array<{ t: number; spread_bps: number }>; // impact on spreads
  metrics: AgentsRunMetrics;
  cfg: AgentsConfig;
};

let currentConfig: AgentsConfig = {
  profiles: [
    { type: 'market_maker', count: 3, aggression: 0.4, capital: 1.0 },
    { type: 'arbitrage_bot', count: 2, aggression: 0.6, capital: 0.8 },
    { type: 'momentum_trader', count: 3, aggression: 0.7, capital: 0.6 },
    { type: 'spoofer', count: 1, aggression: 0.9, capital: 0.2 },
  ],
  seed: 42,
  steps: 200,
};

const history: AgentsRunResult[] = [];

function rand(seed: number) {
  // xorshift-like PRNG
  let x = seed || 123456789;
  return () => {
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

function simulateAgents(cfg: AgentsConfig): AgentsRunResult {
  const seed = cfg.seed ?? Math.floor(Math.random() * 1e9);
  const rnd = rand(seed);
  const steps = Math.max(50, Math.min(2000, cfg.steps ?? 200));
  const started = new Date();

  // Baseline spread and dynamics
  let spread = 10 + rnd() * 10; // bps
  const spreadSeries: Array<{ t: number; spread_bps: number }> = [];
  const pnlMap = new Map<string, number>();

  const weights: Record<AgentProfile['type'], number> = {
    market_maker: 0.0,
    arbitrage_bot: 0.0,
    momentum_trader: 0.0,
    spoofer: 0.0,
  } as any;
  cfg.profiles.forEach(p => {
    weights[p.type] = (weights[p.type] || 0) + p.count * p.aggression * p.capital;
  });

  for (let i = 0; i < steps; i++) {
    // Market makers tighten spreads with capacity, spoofers widen, momentum widen in high aggression, arbs tighten when opportunity is high
    const makerTighten = (weights.market_maker || 0) * (0.2 + 0.3 * rnd());
    const arbTighten = (weights.arbitrage_bot || 0) * (0.1 + 0.2 * rnd());
    const momWiden = (weights.momentum_trader || 0) * (0.15 + 0.25 * rnd());
    const spfWiden = (weights.spoofer || 0) * (0.3 + 0.4 * rnd());
    const d = -makerTighten - arbTighten + momWiden + spfWiden + (rnd() - 0.5) * 2; // noise
    spread = Math.max(2, spread + d);
    spreadSeries.push({ t: i, spread_bps: spread });
  }

  // PnL by agent category: makers earn spread capture; arbs gain small; momentum depends on trend; spoofers random + penalty
  const sumWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const baseVol = Math.sqrt(spreadSeries.reduce((s, p) => s + Math.pow(p.spread_bps - spreadSeries[0].spread_bps, 2), 0) / spreadSeries.length);

  (Object.keys(weights) as AgentProfile['type'][]).forEach((type) => {
    const w = weights[type] / sumWeight;
    let pnl = 0;
    switch (type) {
      case 'market_maker':
        pnl = w * 1000 * (1 + (10 / (1 + baseVol)));
        break;
      case 'arbitrage_bot':
        pnl = w * 600 * (1 + 0.2 * Math.random());
        break;
      case 'momentum_trader':
        pnl = w * (rnd() > 0.4 ? 800 : -400) * (1 + baseVol / 20);
        break;
      case 'spoofer':
        pnl = w * (rnd() > 0.7 ? 300 : -500);
        break;
    }
    pnlMap.set(type, (pnlMap.get(type) || 0) + pnl);
  });

  const avgSpread = spreadSeries.reduce((s, p) => s + p.spread_bps, 0) / spreadSeries.length;
  const spreadVol = Math.sqrt(spreadSeries.reduce((s, p) => s + Math.pow(p.spread_bps - avgSpread, 2), 0) / spreadSeries.length);
  const stability = Math.max(0, Math.min(1, 1 - spreadVol / 50));
  const drift = spreadSeries[spreadSeries.length - 1].spread_bps - spreadSeries[0].spread_bps;

  const res: AgentsRunResult = {
    id: `${Date.now()}_${Math.round(Math.random()*1e6)}`,
    started_at: started.toISOString(),
    completed_at: new Date().toISOString(),
    status: 'completed',
    pnl: Array.from(pnlMap.entries()).map(([agent, pnl]) => ({ agent, pnl })),
    spread_over_time: spreadSeries,
    metrics: {
      stability_index: stability,
      avg_spread_bps: avgSpread,
      spread_vol_bps: spreadVol,
      midprice_drift_bps: drift,
    },
    cfg,
  };

  history.unshift(res);
  if (history.length > 100) history.pop();
  return res;
}

export function handleGetAgentsConfig(_req: Request, res: Response) {
  res.json({ status: 'success', data: currentConfig });
}

export function handleSaveAgentsConfig(req: Request, res: Response) {
  try {
    const body = req.body as Partial<AgentsConfig>;
    if (body && Array.isArray(body.profiles)) {
      currentConfig = {
        profiles: body.profiles.map((p: any) => ({
          type: (p.type || 'market_maker') as AgentProfile['type'],
          count: Math.max(0, Math.min(50, Number(p.count) || 0)),
          aggression: Math.max(0, Math.min(1, Number(p.aggression) || 0)),
          capital: Math.max(0, Math.min(10, Number(p.capital) || 0)),
        })),
        seed: typeof body.seed === 'number' ? body.seed : currentConfig.seed,
        steps: typeof body.steps === 'number' ? body.steps : currentConfig.steps,
      };
      return res.json({ status: 'success', data: currentConfig });
    }
    return res.status(400).json({ status: 'error', message: 'Invalid profiles' });
  } catch (e:any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Failed to save config' });
  }
}

export function handleRunAgentsSim(req: Request, res: Response) {
  try {
    const cfg = (req.body?.config as AgentsConfig) || currentConfig;
    const result = simulateAgents(cfg);
    return res.json({ status: 'success', data: result, id: result.id });
  } catch (e:any) {
    return res.status(500).json({ status: 'error', message: e?.message || 'Simulation failed' });
  }
}

export function handleGetAgentsResult(req: Request, res: Response) {
  const { id } = req.params as any;
  const item = history.find(h => h.id === id);
  if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });
  return res.json({ status: 'success', data: item });
}

export function handleGetAgentsHistory(_req: Request, res: Response) {
  res.json({ status: 'success', data: history.slice(0, 20) });
}
