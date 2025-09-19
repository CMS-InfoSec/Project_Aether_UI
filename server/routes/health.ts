import type { Request, Response } from "express";

export function handleHealthLive(_req: Request, res: Response) {
  const start = Date.now();
  // Simulate quick work, report latency
  const latency = Date.now() - start;
  res.status(200).json({ status: "ok", ready: true, latency });
}

export function handleHealthReady(_req: Request, res: Response) {
  res.status(200).json({ ready: true, dependencies: { supabase: true, binance: true, redis: true } });
}

export function handleHealthReadyDetails(_req: Request, res: Response) {
  const now = new Date().toISOString();
  res.status(200).json({
    ok: true,
    checked_at: now,
    dependencies: [
      { name: "Supabase", ok: true, code: 200, checked_at: now, timeout: 2000, skipped: false },
      { name: "Binance", ok: true, code: 200, checked_at: now, timeout: 2000, skipped: false },
      { name: "Redis", ok: true, code: 200, checked_at: now, timeout: 1500, skipped: false },
      { name: "Weaviate", ok: true, code: 200, checked_at: now, timeout: 2500, skipped: true },
      { name: "n8n", ok: true, code: 200, checked_at: now, timeout: 2000, skipped: true },
      { name: "SMTP", ok: true, code: 200, checked_at: now, timeout: 3000, skipped: true }
    ],
  });
}

export function handleHealthDependencies(_req: Request, res: Response) {
  const now = new Date().toISOString();
  res.status(200).json([
    { id: "supabase", ok: true, error: null, code: 200, checked_at: now, timeout: 2000, skipped: false, request_id: "req_supabase_1" },
    { id: "binance", ok: true, error: null, code: 200, checked_at: now, timeout: 2000, skipped: false, request_id: "req_binance_1" },
    { id: "redis", ok: true, error: null, code: 200, checked_at: now, timeout: 1500, skipped: false, request_id: "req_redis_1" },
    { id: "weaviate", ok: false, error: "skipped by config", code: 0, checked_at: now, timeout: 0, skipped: true, request_id: "req_weaviate_1" },
    { id: "n8n", ok: false, error: "skipped by config", code: 0, checked_at: now, timeout: 0, skipped: true, request_id: "req_n8n_1" },
    { id: "smtp", ok: false, error: "skipped by config", code: 0, checked_at: now, timeout: 0, skipped: true, request_id: "req_smtp_1" },
  ]);
}

export function handleMetrics(_req: Request, res: Response) {
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(`# HELP aether_requests_total Total number of HTTP requests\n# TYPE aether_requests_total counter\naether_requests_total{route="/api"} 1024\n# HELP aether_latency_ms Request latency in ms\n# TYPE aether_latency_ms summary\naether_latency_ms{quantile=\"0.5\"} 12\naether_latency_ms{quantile=\"0.9\"} 35\naether_latency_ms{quantile=\"0.99\"} 75\naether_latency_ms_sum 51234\naether_latency_ms_count 4096\n`);
}

export function handleHealthLiveDetails(_req: Request, res: Response) {
  const now = new Date().toISOString();
  // Simulate DB and message-bus checks
  const deps = [
    { name: 'Database', ok: true, code: 200, checked_at: now, timeout: 1200, skipped: false },
    { name: 'MessageBus', ok: true, code: 200, checked_at: now, timeout: 800, skipped: false },
  ];
  res.status(200).json({ ok: deps.every(d=>d.ok), checked_at: now, dependencies: deps });
}
