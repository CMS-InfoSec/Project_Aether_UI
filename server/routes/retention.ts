import type { Request, Response } from "express";

let retentionDays = 30;
let lastPurge = {
  at: 0, // epoch seconds
  deleted: 0,
  errors: 0,
};

export function handleGetDataRetention(_req: Request, res: Response) {
  res.json({ status: 'success', data: { days: retentionDays, lastPurge } });
}

export function handlePatchDataRetention(req: Request, res: Response) {
  const { days } = req.body || {};
  const n = parseInt(String(days));
  if (!Number.isFinite(n) || n < 1 || n > 3650) {
    return res.status(422).json({ status: 'error', message: 'days must be between 1 and 3650' });
  }
  retentionDays = n;
  res.json({ status: 'success', data: { days: retentionDays } });
}

export function handlePostManualPurge(_req: Request, res: Response) {
  // Simulate purge - in real system this would delete from DB/object store
  const deleted = Math.floor(1000 + Math.random() * 5000);
  const errors = Math.random() < 0.05 ? Math.floor(Math.random() * 10) : 0;
  lastPurge = { at: Math.floor(Date.now() / 1000), deleted, errors };
  res.json({ status: 'success', data: lastPurge });
}

// Export Prometheus metrics snippet used by /api/metrics
export function retentionMetrics(): string {
  const lines = [
    '# HELP aether_data_retention_days Retention window in days',
    '# TYPE aether_data_retention_days gauge',
    `aether_data_retention_days ${retentionDays}`,
    '# HELP aether_data_last_purge_timestamp_seconds Timestamp of last purge',
    '# TYPE aether_data_last_purge_timestamp_seconds gauge',
    `aether_data_last_purge_timestamp_seconds ${lastPurge.at}`,
    '# HELP aether_data_last_purge_deleted_total Records deleted in last purge',
    '# TYPE aether_data_last_purge_deleted_total counter',
    `aether_data_last_purge_deleted_total ${lastPurge.deleted}`,
    '# HELP aether_data_last_purge_errors_total Errors in last purge',
    '# TYPE aether_data_last_purge_errors_total counter',
    `aether_data_last_purge_errors_total ${lastPurge.errors}`,
  ];
  return lines.join('\n') + '\n';
}
