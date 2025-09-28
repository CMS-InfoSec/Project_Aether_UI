import { Request, Response } from "express";

export type DefenseEvent = {
  id: string;
  type: "spoofing" | "shilling" | "wash_trading" | string;
  severity: "low" | "medium" | "high" | "critical" | string;
  actor: "bot" | "human" | "unknown" | "venue" | string;
  status: "active" | "mitigated" | "observed" | string;
  response:
    | "quarantined"
    | "down_weighted"
    | "circuit_breaker"
    | "alerted"
    | "none"
    | string;
  symbol?: string;
  venue?: string;
  detected_at: string;
  details?: string;
};

let defenseSettings = {
  autoDefenseEnabled: true,
  operatorOverride: false,
};

function sampleEvents(): DefenseEvent[] {
  const now = Date.now();
  const mk = (i: number, patch: Partial<DefenseEvent>): DefenseEvent => ({
    id: `def_${i}`,
    type: "spoofing",
    severity: "high",
    actor: "bot",
    status: "active",
    response:
      defenseSettings.autoDefenseEnabled && !defenseSettings.operatorOverride
        ? "quarantined"
        : "alerted",
    symbol: "BTC/USDT",
    venue: "binance",
    detected_at: new Date(now - i * 60000).toISOString(),
    details: "Layering detected across top 3 levels",
    ...patch,
  });
  return [
    mk(1, {}),
    mk(2, {
      type: "shilling",
      severity: "medium",
      actor: "human",
      status: "observed",
      response: "alerted",
      details: "Coordinated social shilling detected",
    }),
    mk(3, {
      type: "spoofing",
      severity: "critical",
      actor: "bot",
      status: "active",
      response:
        defenseSettings.autoDefenseEnabled && !defenseSettings.operatorOverride
          ? "circuit_breaker"
          : "alerted",
      symbol: "ETH/USDT",
    }),
    mk(4, {
      type: "wash_trading",
      severity: "low",
      actor: "unknown",
      status: "mitigated",
      response: "down_weighted",
      symbol: "ALT/USDT",
      venue: "okx",
    }),
  ];
}

export function handleGetDefenseEvents(_req: Request, res: Response) {
  const data = sampleEvents();
  res.json({ status: "success", data, settings: defenseSettings });
}

export function handleGetDefenseSettings(_req: Request, res: Response) {
  res.json({ status: "success", data: defenseSettings });
}

export function handlePatchDefenseOverride(req: Request, res: Response) {
  try {
    const { override, autoDefenseEnabled } = req.body || {};
    if (typeof override === "boolean") {
      defenseSettings.operatorOverride = override;
    }
    if (typeof autoDefenseEnabled === "boolean") {
      defenseSettings.autoDefenseEnabled = autoDefenseEnabled;
    }
    return res.json({ status: "success", data: defenseSettings });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: e?.message || "Failed" });
  }
}
