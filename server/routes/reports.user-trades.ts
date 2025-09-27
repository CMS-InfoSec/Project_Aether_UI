import { Request, Response } from 'express';

export function handleGetUserTradesReport(req: Request, res: Response) {
  try {
    const { from, to, action, format } = req.query as any;
    let trades: any[] = [];
    try {
      const mod = require('./trades');
      const list = typeof mod.listAllTrades === 'function' ? mod.listAllTrades() : (mod.mockTrades || []);
      trades = Array.isArray(list) ? list : [];
    } catch {
      trades = [];
    }

    const fromTime = from ? new Date(String(from)).getTime() : null;
    const toTime = to ? new Date(String(to)).getTime() : null;
    const filtered = trades.filter((t: any) => {
      const ts = new Date(t.timestamp).getTime();
      if (fromTime && isFinite(fromTime) && ts < fromTime) return false;
      if (toTime && isFinite(toTime) && ts > toTime) return false;
      if (action && String(action).length) {
        const a = String(action).toLowerCase();
        if (a === 'buy' && t.action !== 'buy') return false;
        if (a === 'sell' && t.action !== 'sell') return false;
      }
      return true;
    });

    const toNum = (n: any) => Number.isFinite(+n) ? +n : 0;
    const totals = filtered.reduce((acc: any, t: any) => {
      const qty = toNum(t.amount);
      const price = toNum(t.price);
      const fees = toNum(t.fee_cost) + toNum(t.slippage_cost);
      const gross = qty * price;
      if (t.action === 'sell') {
        acc.totalSells += gross;
        acc.totalSellFees += fees;
        acc.disposals += 1;
      } else if (t.action === 'buy') {
        acc.totalBuys += gross;
        acc.totalBuyFees += fees;
        acc.acquisitions += 1;
      }
      return acc;
    }, { totalBuys:0, totalSells:0, totalBuyFees:0, totalSellFees:0, acquisitions:0, disposals:0 });

    const summary = {
      grossProceeds: +(totals.totalSells).toFixed(2),
      allowableCosts: +(totals.totalBuys + totals.totalBuyFees + totals.totalSellFees).toFixed(2),
      totalFees: +(totals.totalBuyFees + totals.totalSellFees).toFixed(2),
      acquisitions: totals.acquisitions,
      disposals: totals.disposals,
      indicativeGain: +((totals.totalSells - (totals.totalBuys + totals.totalBuyFees + totals.totalSellFees))).toFixed(2),
      disclaimer: 'Indicative only. HMRC rules (same-day, 30-day and Section 104 pool) require backend-calculated tax lots.'
    };

    if (format === 'csv') {
      const headers = ['date','type','symbol','quantity','price','fee','slippage','total','trade_id'];
      const csvRows = [headers.join(',')].concat(filtered.map((t: any) => {
        const qty = toNum(t.amount);
        const price = toNum(t.price);
        const fee = toNum(t.fee_cost);
        const slip = toNum(t.slippage_cost);
        const total = qty * price;
        const vals = [
          new Date(t.timestamp).toISOString(),
          t.action,
          t.symbol,
          qty.toFixed(8),
          price.toFixed(8),
          fee.toFixed(8),
          slip.toFixed(8),
          total.toFixed(8),
          t.trade_id || t.id || ''
        ];
        return vals.map((s: any) => {
          const v = String(s);
          return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
        }).join(',');
      }));
      const csv = csvRows.join('\n');
      const filename = `user-trades-${(from||'start')}-${(to||'end')}.csv`;
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    return res.json({ status:'success', data: { trades: filtered, summary } });
  } catch (e) {
    console.error('User trades report error:', e);
    return res.status(500).json({ status:'error', error:'Failed to build trades report' });
  }
}
