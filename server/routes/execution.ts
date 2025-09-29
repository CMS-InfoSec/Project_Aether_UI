import type { Request, Response } from "express";

interface OBPoint { t?: string; time?: string; price: number; volume?: number; size?: number }

function parseOrderBook(arr: any[]): { t: string; price: number; volume: number }[] {
  const out: { t: string; price: number; volume: number }[] = [];
  for (const r of arr || []) {
    const price = Number((r && (r.price ?? r.p)))
    const volume = Number((r && (r.volume ?? r.size ?? r.v)))
    const t = String((r && (r.t || r.time)) || new Date().toISOString());
    if (Number.isFinite(price) && price > 0) {
      out.push({ t, price, volume: Number.isFinite(volume) && volume > 0 ? volume : 1 });
    }
  }
  return out;
}

export function handleExecutionSimulate(req: Request, res: Response) {
  try {
    const { method = 'TWAP', side = 'buy', quantity, slices = 10, orderBook } = req.body || {};
    const qty = Number(quantity);
    const nSlices = Math.max(1, Math.min(1000, Number(slices) || 10));
    if (!Number.isFinite(qty) || qty <= 0) return res.status(422).json({ status:'error', message:'quantity must be > 0' });
    const ob = parseOrderBook(Array.isArray(orderBook) ? orderBook : []);
    if (ob.length === 0) return res.status(422).json({ status:'error', message:'orderBook array required (price, volume, t)' });

    const isBuy = String(side).toLowerCase() !== 'sell';
    const m = String(method).toUpperCase();

    // Determine allocation per slice
    const points = ob.slice(0, Math.max(nSlices, ob.length));
    let alloc: number[] = [];

    if (m === 'VWAP') {
      const volSum = points.reduce((s, p)=> s + (p.volume || 1), 0) || 1;
      alloc = points.map(p => (qty * (p.volume || 1)) / volSum);
    } else if (m === 'MARKET') {
      alloc = [qty];
    } else { // TWAP default
      const base = Math.floor((qty / nSlices) * 1e8) / 1e8;
      alloc = Array.from({ length: Math.min(nSlices, points.length) }, () => base);
      // distribute remainder to first slice
      const sum = alloc.reduce((a,b)=>a+b,0);
      if (qty - sum > 0) alloc[0] += qty - sum;
    }

    const execRows: Array<{ t: string; qty: number; price: number; cost: number; cumCost: number }>= [];
    let cum = 0;
    let i = 0;
    for (const a of alloc) {
      const p = points[Math.min(i, points.length - 1)] || points[points.length - 1];
      const px = p.price;
      const cost = (isBuy ? 1 : -1) * a * px;
      cum += cost;
      execRows.push({ t: p.t, qty: a, price: px, cost, cumCost: cum });
      i++;
      if (m === 'MARKET') break;
    }

    const totalQty = execRows.reduce((s,r)=> s + r.qty, 0) * (isBuy ? 1 : -1);
    const totalCost = execRows.reduce((s,r)=> s + r.cost, 0);
    const avgPx = Math.abs(totalQty) > 0 ? Math.abs(totalCost) / Math.abs(totalQty) : 0;
    const benchPx = ob.reduce((s,p)=> s + p.price, 0) / ob.length;
    const slippageBps = benchPx > 0 ? ((isBuy ? (avgPx - benchPx) : (benchPx - avgPx)) / benchPx) * 10000 : 0;

    const chart = execRows.map(r => ({ t: r.t, cumCost: r.cumCost }));

    return res.json({ status:'success', data: {
      method: m,
      side: isBuy ? 'buy' : 'sell',
      quantity: qty,
      summary: {
        totalQty,
        totalCost,
        avgPrice: avgPx,
        benchmarkPrice: benchPx,
        slippageBps,
      },
      perSlice: execRows,
      chart,
    }});
  } catch (e: any) {
    return res.status(500).json({ status:'error', message: e?.message || 'Simulation failed' });
  }
}
