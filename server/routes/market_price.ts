import type { Request, Response } from 'express';
import { getSystemState } from './system';

export function handleMarketPrice(req: Request, res: Response) {
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  if (!symbol || symbol.length > 20 || !/^[A-Z0-9]+\/[A-Z0-9]+$/.test(symbol)) {
    return res.status(400).json({ detail: { message: 'invalid symbol' } });
  }

  const state = getSystemState();
  if (state.killSwitchEnabled) {
    return res.status(503).json({ message: 'trading disabled' });
  }

  // Optional simulation of kill switch check failure
  if (req.query.fail === 'kill') {
    return res.status(503).json({ message: 'kill switch check failed' });
  }

  const price = +(10000 + Math.random()*50000).toFixed(2);
  res.json({ symbol, price, ts: new Date().toISOString() });
}
