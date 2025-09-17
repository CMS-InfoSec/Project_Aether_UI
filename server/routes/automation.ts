import type { Request, Response } from 'express';

let usage = { used: 0, window: 60 };

export function handleAutomationLimitsMe(_req: Request, res: Response) {
  res.json({ status:'success', data: { per_user: { used: usage.used, window: usage.window, max: 5 } } });
}

export function handleAutomationSocial(req: Request, res: Response) {
  const { source, priority, timestamp, nonce, posts } = req.body || {};
  if (!source || !priority || !timestamp || !nonce || !Array.isArray(posts) || posts.length === 0) {
    return res.status(400).json({ status:'error', detail:'missing fields' });
  }
  usage.used = (usage.used + 1) % 5;
  res.json({ status:'success', data: { processed: posts.length, request_id: `req_${Date.now()}` } });
}
