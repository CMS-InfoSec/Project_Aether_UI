import type { Request, Response } from 'express';

let proposals: any[] = [];

export function handlePluginsList(_req: Request, res: Response) {
  res.json({ status:'success', data: proposals });
}

export function handlePluginPropose(req: Request, res: Response) {
  const { name, module, description } = req.body || {};
  if (!name || !module || !description) return res.status(400).json({ status:'error', detail:'missing fields' });
  if (proposals.find(p=>p.name===name)) return res.status(409).json({ status:'error', detail:'duplicate name' });
  const p = { name, module, description, proposer: 'admin@example.com', submitted_at: new Date().toISOString(), status:'pending', votes:{ for:0, against:0, abstain:0 } };
  proposals.unshift(p);
  res.status(201).json({ status:'success', data:p });
}

export function handlePluginVote(req: Request, res: Response) {
  const { name } = req.params as { name: string };
  const { choice } = req.body || {};
  const p = proposals.find(pr=>pr.name===name);
  if (!p) return res.status(404).json({ status:'error', detail:'not found' });
  if (!['approve','reject','abstain'].includes(choice)) return res.status(400).json({ status:'error', detail:'invalid choice' });
  if (choice==='approve') p.votes.for++; else if (choice==='reject') p.votes.against++; else p.votes.abstain++;
  res.json({ status:'success', data:p });
}

export function handlePluginApprove(req: Request, res: Response) {
  const { name } = req.params as { name: string };
  const p = proposals.find(pr=>pr.name===name);
  if (!p) return res.status(404).json({ status:'error', detail:'not found' });
  const majority = p.votes.for >= 2; // mock quorum
  if (!majority) return res.status(400).json({ status:'error', detail:'supermajority not reached' });
  p.status = 'activated';
  res.json({ status:'success', data:p, audit_entry_id: `audit_${Date.now()}` });
}
