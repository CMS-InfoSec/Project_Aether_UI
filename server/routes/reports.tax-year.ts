import { Request, Response } from 'express';

interface TaxYearReportResponse {
  tax_year: number;
  period_start: string; // ISO-8601 UTC inclusive
  period_end: string;   // ISO-8601 UTC exclusive
  trade_count: number;
  total_buys: number;
  total_sells: number;
  total_fees: number;
  net_result: number;
  supabase_degraded: boolean;
  trades: TaxYearTradeDetail[];
}

interface TaxYearTradeDetail {
  timestamp: string; // ISO-8601 with timezone
  symbol: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  notional: number;
  fee: number;
  net: number; // positive for sells, negative for buys
  source: 'Supabase' | 'AuditLog';
}

function currentUkTaxYearStart(): number {
  const now = new Date();
  const y = now.getUTCFullYear();
  const taxYearStart = Date.UTC(y, 3, 6, 0, 0, 0); // 6 April UTC
  return (now.getTime() < taxYearStart) ? (y - 1) : y;
}

function allowedMaxTaxYear(): number {
  const now = new Date();
  const y = now.getUTCFullYear();
  const beforeApr6 = now.getTime() < Date.UTC(y, 3, 6, 0, 0, 0);
  // Allow requesting the upcoming tax year between Jan 1 and Apr 5
  if (beforeApr6 && now.getUTCMonth() >= 0) {
    return currentUkTaxYearStart() + 1;
  }
  return currentUkTaxYearStart();
}

export function handleGetTaxYearReport(req: Request, res: Response) {
  try {
    const minYear = 2000;
    const maxYear = allowedMaxTaxYear();
    const taxYearRaw = (req.query.tax_year ?? '').toString();
    const taxYear = parseInt(taxYearRaw, 10);

    if (!Number.isFinite(taxYear) || taxYear < minYear || taxYear > maxYear) {
      return res.status(422).json({
        code: 422,
        message: 'invalid tax year',
        details: { allowed_range: { min: minYear, max: maxYear }, received: taxYearRaw }
      });
    }

    const periodStart = new Date(Date.UTC(taxYear, 3, 6, 0, 0, 0)); // 6 April taxYear
    const periodEnd = new Date(Date.UTC(taxYear + 1, 3, 6, 0, 0, 0)); // 6 April next year (exclusive)

    // Pull trades from primary (mock Supabase) source
    let tradesSource: any[] = [];
    try {
      const mod = require('./trades');
      const list = typeof mod.listAllTrades === 'function' ? mod.listAllTrades() : (mod.mockTrades || []);
      tradesSource = Array.isArray(list) ? list : [];
    } catch {
      tradesSource = [];
    }

    // Fallback to audit logs (not implemented here); set degraded flag if primary empty but we still had any fallback rows
    let supabase_degraded = false;

    const inRange = (ts: string) => {
      const t = new Date(ts).getTime();
      return t >= periodStart.getTime() && t < periodEnd.getTime();
    };

    const filtered = tradesSource.filter(t => inRange(t.timestamp));

    // Map to detail schema
    const details: TaxYearTradeDetail[] = filtered.map(t => {
      const amount = Number(t.amount) || 0;
      const price = Number(t.price) || 0;
      const notional = +(amount * price).toFixed(8);
      const fee = +(((Number(t.fee_cost)||0) + (Number(t.slippage_cost)||0))).toFixed(8);
      const isSell = String(t.action) === 'sell';
      const net = +(isSell ? (notional - fee) : -(notional + fee)).toFixed(8);
      return {
        timestamp: new Date(t.timestamp).toISOString(),
        symbol: String(t.symbol || ''),
        action: (String(t.action) === 'sell' ? 'sell' : 'buy'),
        amount: +amount,
        price: +price,
        notional,
        fee,
        net,
        source: 'Supabase'
      };
    }).sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const total_buys = +(details.filter(d=>d.action==='buy').reduce((s,d)=> s + d.notional, 0)).toFixed(2);
    const total_sells = +(details.filter(d=>d.action==='sell').reduce((s,d)=> s + d.notional, 0)).toFixed(2);
    const total_fees = +(details.reduce((s,d)=> s + d.fee, 0)).toFixed(2);
    const net_result = +(details.reduce((s,d)=> s + d.net, 0)).toFixed(2);

    const payload: TaxYearReportResponse = {
      tax_year: taxYear,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      trade_count: details.length,
      total_buys,
      total_sells,
      total_fees,
      net_result,
      supabase_degraded,
      trades: details
    };

    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ code: 500, message: 'internal error' });
  }
}
