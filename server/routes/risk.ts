import type { Request, Response } from "express";

// Risk config (mock)
let RISK_CONFIG = {
  tiers: [
    { id: 'conservative', label: 'Conservative', maxDrawdown: 0.05, pnlWarning: -0.02 },
    { id: 'moderate', label: 'Moderate', maxDrawdown: 0.1, pnlWarning: -0.05 },
    { id: 'aggressive', label: 'Aggressive', maxDrawdown: 0.2, pnlWarning: -0.1 },
  ],
  defaultTier: 'moderate',
};

export function handleGetRiskConfig(_req: Request, res: Response) {
  res.json({ status: 'success', data: RISK_CONFIG });
}

export function handlePatchRiskConfig(req: Request, res: Response) {
  try {
    const body = req.body || {};
    if (body.defaultTier && typeof body.defaultTier === 'string') {
      RISK_CONFIG.defaultTier = body.defaultTier;
    }
    if (Array.isArray(body.tiers)) {
      const tiers = body.tiers.map((t: any) => ({
        id: String(t.id),
        label: String(t.label || t.id),
        maxDrawdown: Math.max(0, Number(t.maxDrawdown) || 0),
        pnlWarning: Number(t.pnlWarning) || 0,
      }));
      if (tiers.length > 0) RISK_CONFIG.tiers = tiers;
    }
    return res.json({ status: 'success', data: RISK_CONFIG });
  } catch (e: any) {
    return res.status(400).json({ status: 'error', message: e?.message || 'invalid payload' });
  }
}

// Generate synthetic live metrics (PnL and drawdown time series)
export function handleGetLiveMetrics(req: Request, res: Response) {
  const points = Math.max(30, Math.min(360, parseInt(String((req.query as any).points)) || 90));
  const now = Date.now();
  const stepMs = 60_000; // 1 min
  let equity = 1;
  let peak = 1;
  const data: Array<{ t: string; pnl: number; dd: number }> = [];
  for (let i = points - 1; i >= 0; i--) {
    // Mean-reverting noise with slight drift
    const noise = (Math.random() - 0.5) * 0.003;
    const drift = 0.0002;
    const ret = drift + noise;
    equity *= 1 + ret;
    if (equity > peak) peak = equity;
    const pnl = equity - 1; // cumulative return
    const dd = equity / peak - 1; // negative when below peak
    const ts = new Date(now - i * stepMs).toISOString();
    data.push({ t: ts, pnl, dd });
  }
  res.json({ status: 'success', data });
}

export function handleGetRiskBreaches(_req: Request, res: Response) {
  // Synthesize a few current risk breaches based on config thresholds
  const items = [] as Array<{
    id: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical' | string;
    metric: string;
    value: number;
    threshold: number;
  }>;
  const now = Date.now();

  // Example: drawdown breach
  const tier = RISK_CONFIG.tiers.find((t) => t.id === RISK_CONFIG.defaultTier) || RISK_CONFIG.tiers[0];
  const dd = -0.06 - Math.random() * 0.03;
  if (dd < -tier.maxDrawdown) {
    items.push({
      id: `risk_dd_${now}`,
      message: `Max drawdown ${Math.abs(dd * 100).toFixed(2)}% exceeds limit ${Math.abs(tier.maxDrawdown * 100).toFixed(1)}%`,
      timestamp: new Date(now - 20_000).toISOString(),
      severity: 'high',
      metric: 'max_drawdown',
      value: dd,
      threshold: -tier.maxDrawdown,
    });
  }

  // Example: Sharpe warning
  const sharpe = 0.4 + Math.random() * 0.4;
  if (sharpe < 0.5) {
    items.push({
      id: `risk_sharpe_${now - 10_000}`,
      message: `Sharpe ${sharpe.toFixed(2)} below recommended 0.50`,
      timestamp: new Date(now - 10_000).toISOString(),
      severity: sharpe < 0.3 ? 'critical' : 'warning',
      metric: 'sharpe_ratio',
      value: sharpe,
      threshold: 0.5,
    });
  }

  // Example: Hedge ratio outside band
  const hedge = 0.07 + Math.random() * 0.9;
  if (hedge < 0.1 || hedge > 0.8) {
    items.push({
      id: `risk_hedge_${now - 5_000}`,
      message: `Hedge ratio ${(hedge * 100).toFixed(1)}% outside [10%, 80%] band`,
      timestamp: new Date(now - 5_000).toISOString(),
      severity: 'warning',
      metric: 'hedge_ratio',
      value: hedge,
      threshold: hedge < 0.1 ? 0.1 : 0.8,
    });
  }

  res.json({ status: 'success', breaches: items });
}
