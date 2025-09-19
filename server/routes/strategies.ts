import type { Request, Response } from "express";

let strategyFlags = [
  { name: 'mean_reversion', weight: 0.3, enabled: true, last_run: new Date().toISOString() },
  { name: 'momentum', weight: 0.5, enabled: true, last_run: new Date().toISOString() },
  { name: 'breakout', weight: 0.2, enabled: false, last_run: new Date().toISOString() },
];

export function handleGetStrategyFlags(_req: Request, res: Response) {
  res.json({ status: 'success', data: strategyFlags });
}

export function handlePatchStrategyTrading(req: Request, res: Response) {
  const { strategy } = req.params as { strategy: string };
  const { enabled } = (req.body || {}) as { enabled?: boolean };
  const idx = strategyFlags.findIndex((s) => s.name === strategy);
  if (idx === -1) return res.status(404).json({ detail: 'strategy not found' });
  if (typeof enabled === 'boolean') strategyFlags[idx].enabled = enabled;
  else strategyFlags[idx].enabled = !strategyFlags[idx].enabled;
  strategyFlags[idx].last_run = new Date().toISOString();
  return res.json({ status: 'success', data: strategyFlags[idx] });
}

export function handleGetStrategyBreakdown(_req: Request, res: Response) {
  res.json({ status: 'success', data: {
    rsi: +(30 + Math.random()*40).toFixed(2),
    macd: +(Math.random()*2 - 1).toFixed(3),
    ema: +(Math.random()*30000 + 20000).toFixed(2),
    sma: +(Math.random()*30000 + 20000).toFixed(2),
    atr: +(Math.random()*500).toFixed(2),
    updated_at: new Date().toISOString()
  }});
}

export function handleNewsSentiment(req: Request, res: Response) {
  const { asset } = req.query;
  if (!asset || !/^[A-Za-z0-9]{1,20}$/.test(String(asset))) {
    return res.status(422).json({ detail: 'invalid/unsupported symbol' });
  }
  res.json({ sentiment: +(Math.random()*2-1).toFixed(3), flags: { pump_warning: Math.random()>0.7, regulatory_risk: Math.random()>0.9, breaking_news: Math.random()>0.6 } });
}

export function handleNewsLatest(_req: Request, res: Response) {
  res.json({ items: [
    { id: 'n1', title: 'Market rallies on BTC ETF flows', ts: new Date().toISOString() },
    { id: 'n2', title: 'ETH gas fees drop to 3-month low', ts: new Date().toISOString() }
  ]});
}

export function handleSocialLatest(_req: Request, res: Response) {
  res.json({ items: [
    { id: 's1', author: '@alpha', text: 'BTC looks strong above 30k', ts: new Date().toISOString() },
    { id: 's2', author: '@beta', text: 'Altcoins catching bids as dominance cools', ts: new Date().toISOString() }
  ]});
}

export function handleSignalsMetrics(_req: Request, res: Response) {
  res.json({ per_source: { tradingview: { rate: 3, limit: 10 }, coinsignals: { rate: 1, limit: 5 }, cryptohopper: { rate: 0, limit: 5 } }, per_user: { rate: 2, limit: 5 } });
}

export function handleNewsReplayFailures(_req: Request, res: Response) {
  res.json({ flushed: Math.floor(Math.random()*10) });
}

export function handleSignalsIngest(req: Request, res: Response) {
  const key = req.headers['x-idempotency-key'];
  if (!key || !/^[A-Za-z0-9_-]+$/.test(String(key))) {
    return res.status(400).json({ detail: 'invalid idempotency key' });
  }
  res.status(202).json({ status: 'accepted', request_id: `req_${Date.now()}` });
}

export function handleStrategiesExplain(_req: Request, res: Response) {
  res.json({ caps: { default_limit: 10, max_limit: 50 }, items: [
    { strategy: 'momentum', timestamp: new Date().toISOString(), request_id: `req_${Date.now()}`, rationales: [{ text: 'Momentum rising', weight: 0.6 }], shap: { top_features: [{ feature: 'volume', weight: 0.4 }], baseline: 0, raw: [] } }
  ]});
}

export function handleStrategiesStressTest(_req: Request, res: Response) {
  res.json({ metrics: { max_drawdown: -0.18, var: -0.07, cvar: -0.12 }, scenarios: [
    { name: 'Flash Crash', parameters: { flash_magnitude: -0.2 }, metrics: { max_drawdown: -0.25, recovery_days: 12 } },
    { name: 'Illiquidity', parameters: { illiquidity_magnitude: 0.5 }, metrics: { max_drawdown: -0.12, var: -0.05 } }
  ]});
}

export function handlePostBacktest(req: Request, res: Response){
  try{
    const { config } = (req.body||{}) as any;
    // Validate minimal payload
    if (config && typeof config !== 'object') return res.status(422).json({ status:'error', error:'invalid config' });
    const jobId = `bt_${Date.now()}`;
    const report_path = 'reports/latest';
    return res.status(202).json({ status:'accepted', jobId, report_path: `/api/reports/backtest?format=json&path=${encodeURIComponent(report_path)}` });
  }catch(e){
    return res.status(500).json({ status:'error', error:'failed to start backtest' });
  }
}
