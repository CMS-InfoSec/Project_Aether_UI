import type { Request, Response } from 'express';

let lastDecision: any | null = null;

export function handleTradeDecision(req: Request, res: Response) {
  const { symbol, size, side, include } = req.body || {};
  if (!symbol || typeof size !== 'number' || size <= 0) {
    return res.status(400).json({ status: 'error', detail: 'invalid inputs' });
  }
  const decision_id = `dec_${Date.now()}`;
  const recommended = side || (Math.random() > 0.5 ? 'buy' : 'sell');
  lastDecision = {
    decision_id,
    symbol,
    size,
    recommended,
    confidence: +(Math.random()*0.5 + 0.5).toFixed(2),
    rationale: 'Based on momentum and volatility conditions',
    indicators: {
      rsi: +(30 + Math.random()*40).toFixed(2),
      macd: +(Math.random()*2 - 1).toFixed(3),
      atr: +(Math.random()*500).toFixed(2),
      updated_at: new Date().toISOString()
    },
    context: include || {}
  };
  res.json({ status: 'success', data: lastDecision });
}

export function handleTradeExecute(req: Request, res: Response) {
  const { decision_id, symbol, side, size, price, slippage } = req.body || {};
  if (!decision_id || !symbol || !side || typeof size !== 'number') {
    return res.status(400).json({ status: 'error', detail: 'missing fields' });
  }
  if (!lastDecision || lastDecision.decision_id !== decision_id) {
    return res.status(409).json({ status: 'error', detail: 'stale or unknown decision' });
  }
  const execution_id = `exec_${Date.now()}`;
  const fillPrice = price || +(30000 + Math.random()*5000).toFixed(2);
  res.json({ status: 'success', data: { execution_id, fill_price: fillPrice, status: 'accepted' } });
}
