import type { Request, Response } from 'express';

let lastNonce = 1000;

export function handleMobileStatus(_req: Request, res: Response) {
  res.json({ status:'success', data: { ready: true, queue_depth: 0, last_nonce: lastNonce, allowed_hosts: ['aether.app','example.com'], heartbeat: new Date().toISOString() } });
}

export function handleMobilePush(req: Request, res: Response) {
  const { token, title, body, url, timestamp, nonce } = req.body || {};
  if (!token || !title || !body || typeof nonce !== 'number') {
    return res.status(400).json({ status:'error', errors: { token: !token && 'required', title: !title && 'required', body: !body && 'required', nonce: typeof nonce !== 'number' && 'invalid' } });
  }
  if (nonce <= lastNonce) return res.status(400).json({ status:'error', errors: { nonce: 'must increase' } });
  lastNonce = nonce;
  res.status(202).json({ status:'success', data: { queued: Array.isArray(token) ? token.length : 1, nonce: lastNonce } });
}
