import type { Request, Response } from 'express';

// Simple fixed-window rate limiter per process (mock)
let limiter = {
  windowSec: 60,
  max: 5,
  windowStart: Date.now(),
  count: 0,
};

function currentLimiterState() {
  const now = Date.now();
  const end = limiter.windowStart + limiter.windowSec * 1000;
  if (now >= end) {
    limiter.windowStart = now;
    limiter.count = 0;
  }
  const remainingMs = Math.max(0, end - now);
  return { used: limiter.count, max: limiter.max, window: limiter.windowSec, retryAfterSec: Math.ceil(remainingMs / 1000) };
}

export function handleAutomationLimitsMe(_req: Request, res: Response) {
  const st = currentLimiterState();
  res.json({ status:'success', data: { per_user: { used: st.used, window: st.window, max: st.max, retry_after: st.used >= st.max ? st.retryAfterSec : 0 } } });
}

export function handleAutomationSocial(req: Request, res: Response) {
  const { source, priority, timestamp, nonce, posts } = req.body || {};
  const sig = req.header('X-Signature');
  const ts = req.header('X-Timestamp');
  const nn = req.header('X-Nonce');

  if (!source || !priority || !timestamp || !nonce || !Array.isArray(posts) || posts.length === 0) {
    return res.status(400).json({ status:'error', detail:'missing fields' });
  }

  // Require presence of signing headers (mock validation only)
  if (!sig || !ts || !nn) {
    return res.status(401).json({ status:'error', detail:'missing signature headers' });
  }

  // Rate limit
  const st = currentLimiterState();
  if (st.used >= st.max) {
    res.setHeader('Retry-After', String(st.retryAfterSec));
    return res.status(429).json({ status:'error', detail:'rate limited', retry_after: st.retryAfterSec });
  }

  // Accept and process
  limiter.count += 1;
  res.json({ status:'success', data: { processed: posts.length, request_id: `req_${Date.now()}` } });
}
