import type { Request, Response } from "express";

export function handleSimRun(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as any;
    const scenario = body.scenario || {};
    const name = String(scenario.name || "Scenario");
    const priceJump = Number(scenario.price_jump_pct ?? 0);
    const volSpike = Number(scenario.vol_spike_pct ?? 0);
    const spreadWidenBps = Number(scenario.spread_widen_bps ?? 0);
    const liqDrain = Number(scenario.liquidity_drain_pct ?? 0);
    const durationMin = Math.max(5, Math.min(480, Number(scenario.duration_min ?? 30)));

    // Synthesize PnL curve influenced by scenario parameters
    const steps = Math.max(30, Math.min(600, Math.round((durationMin || 30) * 2)));
    const pnl: Array<{ t: number; pnl: number }> = [];
    let equity = 0;
    let peak = 0;
    let maxDD = 0;
    const baseVol = 0.002 + volSpike * 0.01 + liqDrain * 0.003 + spreadWidenBps / 100000;
    const drift = priceJump * 0.5 - liqDrain * 0.2;
    for (let i = 0; i < steps; i++) {
      const noise = (Math.random() - 0.5) * baseVol * 2;
      const ret = drift / steps + noise - (spreadWidenBps / 10000) * 0.0005;
      equity += ret;
      if (equity > peak) peak = equity;
      const dd = peak ? equity / peak - 1 : 0;
      if (dd < maxDD) maxDD = dd;
      pnl.push({ t: i, pnl: equity * 1000 }); // scale to monetary units
    }

    const actions = [
      { t: 0, action: "rebalance", detail: "Reduce risk at start" },
      { t: Math.round(steps * 0.4), action: "hedge_increase", detail: "Increase hedge due to volatility" },
      { t: Math.round(steps * 0.8), action: "hedge_reduce", detail: "Reduce hedge as conditions stabilize" },
    ];

    const data = {
      scenario: { name, price_jump_pct: priceJump, vol_spike_pct: volSpike, spread_widen_bps: spreadWidenBps, liquidity_drain_pct: liqDrain, duration_min: durationMin },
      pnl,
      actions,
      metrics: {
        max_drawdown: maxDD,
        volatility: baseVol,
        duration_steps: steps,
      },
      final_pnl: pnl[pnl.length - 1]?.pnl ?? 0,
    };

    // Return completed result synchronously for simplicity
    return res.json({ status: "success", id: `${Date.now()}`, data });
  } catch (e: any) {
    return res.status(500).json({ status: "error", message: e?.message || "Simulation failed" });
  }
}
