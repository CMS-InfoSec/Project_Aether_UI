import type { Request, Response } from "express";

interface ExplainFeature {
  name: string;
  value: number; // raw feature value
  contribution: number; // additive impact on prediction
}

interface ExplainItem {
  id: string;
  timestamp: string;
  symbol: string;
  side: "BUY" | "SELL";
  decision: "enter" | "exit" | "hold";
  base_value: number; // model bias/base prediction
  prediction: number; // final prediction score
  features: ExplainFeature[];
}

function genExplain(i: number): ExplainItem {
  const base = +(Math.random() * 0.5 + 0.25).toFixed(3);
  const features = [
    {
      name: "momentum_1h",
      value: +(Math.random() * 2 - 1).toFixed(3) as any,
      contribution: +(Math.random() * 0.3 - 0.15).toFixed(3) as any,
    },
    {
      name: "rsi_14",
      value: +(30 + Math.random() * 40).toFixed(2) as any,
      contribution: +(Math.random() * 0.25 - 0.125).toFixed(3) as any,
    },
    {
      name: "order_imbalance",
      value: +(Math.random() * 2 - 1).toFixed(3) as any,
      contribution: +(Math.random() * 0.35 - 0.175).toFixed(3) as any,
    },
    {
      name: "volatility_24h",
      value: +(Math.random() * 0.2).toFixed(3) as any,
      contribution: +(Math.random() * 0.2 - 0.1).toFixed(3) as any,
    },
    {
      name: "funding_rate",
      value: +(Math.random() * 0.05 - 0.025).toFixed(4) as any,
      contribution: +(Math.random() * 0.15 - 0.075).toFixed(3) as any,
    },
  ];
  const sum = features.reduce((a, f) => a + Number(f.contribution), 0);
  const pred = +(base + sum).toFixed(3);
  const symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ADA/USDT"];
  const sides: any[] = ["BUY", "SELL"];
  const decisions: any[] = ["enter", "exit", "hold"];
  return {
    id: `dec_${Date.now()}_${i}`,
    timestamp: new Date(Date.now() - i * 5 * 60_000).toISOString(),
    symbol: symbols[i % symbols.length],
    side: sides[i % 2] as any,
    decision: decisions[i % 3] as any,
    base_value: base,
    prediction: pred,
    features,
  };
}

export function handleExplain(req: Request, res: Response) {
  const limit = Math.max(
    1,
    Math.min(parseInt(String(req.query.limit || "10"), 10) || 10, 50),
  );
  const items: ExplainItem[] = Array.from({ length: limit }).map((_, i) =>
    genExplain(i),
  );
  res.json({ status: "success", data: { items, limit } });
}

export function handleExplainById(req: Request, res: Response) {
  const { id } = req.params as any;
  // Generate deterministic-looking explanation seeded by id hash
  const h = Array.from(String(id || "")).reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = +(0.2 + ((h % 100) / 1000)).toFixed(3);
  const feats = [
    { feature: "momentum_1h", shap: +(Math.sin(h) * 0.15).toFixed(3) },
    { feature: "rsi_14", shap: +(((h % 7) / 40 - 0.1)).toFixed(3) },
    { feature: "order_imbalance", shap: +(((h % 13) / 26 - 0.25)).toFixed(3) },
    { feature: "funding_rate", shap: +(((h % 5) / 100 - 0.02)).toFixed(3) },
    { feature: "volatility_24h", shap: +(((h % 11) / 110 - 0.05)).toFixed(3) },
  ];
  const pred = +(base + feats.reduce((s, f) => s + Number(f.shap), 0)).toFixed(3);
  const summary = `Prediction ${pred >= 0.5 ? "favors buy" : pred <= -0.2 ? "favors sell" : "neutral"} driven by ${feats
    .slice(0, 3)
    .map((f) => f.feature)
    .join(", ")}`;
  res.json({
    status: "success",
    id,
    shap: { top_features: feats },
    top_features: feats,
    base_value: base,
    prediction: pred,
    summary,
  });
}
