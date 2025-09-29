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
