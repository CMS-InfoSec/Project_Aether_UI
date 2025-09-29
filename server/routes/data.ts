import type { Request, Response } from "express";

export interface AnomalyItem {
  id: string;
  symbol: string;
  type: string; // stale_tick | outlier | volume_spike | ...
  severity: "low" | "medium" | "high" | "critical" | string;
  detected_at: string;
  auto_mitigation?: string;
  sample_url?: string;
  samples?: any;
  venue?: string;
  notes?: string;
}

function genAnomalies(): AnomalyItem[] {
  const now = Date.now();
  const symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ADA/USDT"];
  const venues = ["BINANCE", "COINBASE", "KRAKEN"];
  const types = ["stale_tick", "outlier", "volume_spike"];
  const severities: AnomalyItem["severity"][] = [
    "low",
    "medium",
    "high",
    "critical",
  ];
  const out: AnomalyItem[] = [];
  for (let i = 0; i < 24; i++) {
    const t = types[i % types.length];
    const sev = severities[i % severities.length];
    out.push({
      id: `anom_${now - i * 90_000}`,
      symbol: symbols[i % symbols.length],
      type: t,
      severity: sev,
      detected_at: new Date(now - i * 90_000).toISOString(),
      auto_mitigation:
        t === "stale_tick" ? "quarantined" : t === "outlier" ? "down_weighted" : "none",
      sample_url: "https://example.com/sample.json",
      venue: venues[i % venues.length],
      notes:
        t === "volume_spike"
          ? "Unusual volume detected vs 30m baseline"
          : t === "outlier"
            ? "Tick deviates 8.2σ from rolling mean"
            : "No updates received for > 12s",
    });
  }
  return out;
}

export function handleGetDataAnomalies(_req: Request, res: Response) {
  const items = genAnomalies();
  res.json({ status: "success", data: items });
}
