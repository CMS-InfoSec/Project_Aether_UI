import type { Request, Response } from 'express';

function dispatchSummary(channels: string[]){
  return channels.reduce((acc:any, ch)=>{ acc[ch] = { ok: Math.random()>0.2, error: Math.random()>0.8 ? 'timeout' : null, request_id: `req_${Date.now()}_${ch}` }; return acc; }, {} as any);
}

export function handleGetChannelStatus(_req: Request, res: Response){
  const status = {
    slack: { healthy: Math.random()>0.1, last_error: null, last_dispatch: new Date().toISOString(), retries: 0 },
    telegram: { healthy: Math.random()>0.1, last_error: null, last_dispatch: new Date().toISOString(), retries: 1 },
    email: { healthy: Math.random()>0.2, last_error: null, last_dispatch: new Date().toISOString(), cooldown: Math.random()>0.8 ? 120 : 0 },
  };
  res.json({ status:'success', data: status });
}

export function handleAsyncNotifyChannels(req: Request, res: Response){
  const { channels=['slack','telegram','email'], message='test' } = (req.body||{}) as any;
  res.status(202).json({ status:'success', data: { queued:true, channels, message } });
}
export function handleNotifyChannels(req: Request, res: Response){
  const { channels=['slack','telegram','email'], message='test' } = (req.body||{}) as any;
  res.json({ status:'success', data: { summary: dispatchSummary(channels), message } });
}
export function handleNotifyUser(req: Request, res: Response){
  const { userId='user_1', channels=['slack'], message='hi' } = (req.body||{}) as any;
  res.json({ status:'success', data: { userId, summary: dispatchSummary(channels) } });
}
export function handleNotifyAdmins(req: Request, res: Response){
  const { channels=['slack','email'], message='incident' } = (req.body||{}) as any;
  res.json({ status:'success', data: { summary: dispatchSummary(channels) } });
}
export function handleAlertApiFailure(_req: Request, res: Response){
  res.json({ status:'success', data: { template:'alert_api_failure', dispatched:true } });
}
export function handleAlertMarketCapFailure(_req: Request, res: Response){
  res.json({ status:'success', data: { template:'alert_market_cap_failure', dispatched:true } });
}
import { pushNotification } from './reports';
export function handleSendNotification(req: Request, res: Response){
  const { title='Manual', message='Text', severity='info', category='system' } = (req.body||{}) as any;
  const newNotification = {
    id: `notif_${Date.now()}`,
    title,
    message,
    severity,
    category,
    actionRequired: false,
    timestamp: new Date().toISOString(),
    read: false,
    metadata: { manual:true }
  };
  pushNotification(newNotification as any);
  res.status(201).json({ status:'success', data: newNotification });
}
