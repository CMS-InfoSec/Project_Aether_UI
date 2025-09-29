import type { Request, Response } from "express";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  success: boolean;
}

// Simple in-memory audit history (public view)
let publicAudit: AuditLogEntry[] = [];

function ensureSeed() {
  if (publicAudit.length) return;
  const now = Date.now();
  publicAudit = [
    {
      id: `audit_${now - 300_000}`,
      timestamp: new Date(now - 300_000).toISOString(),
      action: "LOGIN",
      actor: "admin@example.com",
      details: "Admin session established",
      success: true,
    },
    {
      id: `audit_${now - 240_000}`,
      timestamp: new Date(now - 240_000).toISOString(),
      action: "MODE_CHANGE",
      actor: "admin@example.com",
      details: "Trading mode changed from Simulation to Live",
      success: true,
    },
    {
      id: `audit_${now - 200_000}`,
      timestamp: new Date(now - 200_000).toISOString(),
      action: "SYSTEM_PAUSE",
      actor: "ops@example.com",
      details: "System paused for scheduled maintenance",
      success: true,
    },
    {
      id: `audit_${now - 120_000}`,
      timestamp: new Date(now - 120_000).toISOString(),
      action: "MODEL_ROLLBACK",
      actor: "risk@example.com",
      details: "Rolled back model v1.7 to v1.6 after anomaly detection",
      success: true,
    },
    {
      id: `audit_${now - 60_000}`,
      timestamp: new Date(now - 60_000).toISOString(),
      action: "SYSTEM_RESUME",
      actor: "ops@example.com",
      details: "System resumed after maintenance",
      success: true,
    },
  ];
}

export function handleGetAuditLogs(_req: Request, res: Response) {
  ensureSeed();
  const limit = 50;
  res.json({ status: "success", data: publicAudit.slice(0, limit) });
}
