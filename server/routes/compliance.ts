import type { Request, Response } from "express";

export interface ComplianceLog {
  id: string;
  timestamp: string;
  tradeId: string;
  user: string;
  rule: string; // risk | limits | market | kyc
  status: "pass" | "fail";
  severity: "info" | "warning" | "error";
  message: string;
}

function sampleCompliance(): ComplianceLog[] {
  const now = Date.now();
  const users = [
    "alex.stevens@cybermadesimple.co.uk",
    "ops@aether.local",
    "risk@aether.local",
  ];
  const trades = [
    "BTC_001_20240121",
    "ETH_042_20240121",
    "SOL_015_20240121",
    "ADA_007_20240121",
  ];
  const rules: Array<{ rule: string; severity: ComplianceLog["severity"]; passRate: number; msg: string }>= [
    { rule: "risk", severity: "warning", passRate: 0.9, msg: "Position risk within thresholds" },
    { rule: "limits", severity: "error", passRate: 0.85, msg: "Order size below venue max" },
    { rule: "market", severity: "warning", passRate: 0.8, msg: "Slippage within tolerance" },
    { rule: "kyc", severity: "info", passRate: 0.98, msg: "User verified" },
  ];
  const out: ComplianceLog[] = [];
  for (let i = 0; i < 20; i++) {
    const r = rules[i % rules.length];
    const pass = Math.random() < r.passRate;
    out.push({
      id: `comp_${now - i * 60_000}`,
      timestamp: new Date(now - i * 60_000).toISOString(),
      tradeId: trades[i % trades.length],
      user: users[i % users.length],
      rule: r.rule,
      status: pass ? "pass" : "fail",
      severity: pass ? (r.severity === "error" ? "warning" : r.severity) : r.severity,
      message: pass ? r.msg : `${r.rule.toUpperCase()} violation detected`,
    });
  }
  return out;
}

export function handleGetComplianceLogs(_req: Request, res: Response) {
  const items = sampleCompliance();
  res.json({ status: "success", data: items });
}
