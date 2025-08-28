import { Request, Response } from 'express';

// System state management
interface SystemState {
  isPaused: boolean;
  pausedBy?: string;
  pausedReason?: string;
  pausedAt?: string;
  mode: 'Simulation' | 'Dry-Run' | 'Live';
  changedBy?: string;
  changedAt?: string;
  killSwitchEnabled: boolean;
  killSwitchBy?: string;
  killSwitchReason?: string;
  killSwitchAt?: string;
}

// In-memory system state (in production, this would be persisted in database)
let systemState: SystemState = {
  isPaused: false,
  mode: 'Live',
  killSwitchEnabled: false
};

// API Key validation middleware
function validateApiKey(req: Request): boolean {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.SYSTEM_API_KEY || 'aether-admin-key-2024';
  return apiKey === expectedKey;
}

// Error response helper
function sendErrorResponse(res: Response, status: number, message: string) {
  return res.status(status).json({
    status: 'error',
    message
  });
}

// Get current system status
export function handleGetSystemStatus(req: Request, res: Response) {
  if (!validateApiKey(req)) {
    return sendErrorResponse(res, 401, 'API key required');
  }

  res.json({
    status: 'success',
    data: systemState
  });
}

// Pause system
export function handlePauseSystem(req: Request, res: Response) {
  if (!validateApiKey(req)) {
    return sendErrorResponse(res, 401, 'API key required');
  }

  const { actor, reason } = req.body;

  if (systemState.isPaused) {
    return res.status(400).json({
      status: 'error',
      message: 'System is already paused'
    });
  }

  systemState.isPaused = true;
  systemState.pausedBy = actor || 'Unknown';
  systemState.pausedReason = reason || 'No reason provided';
  systemState.pausedAt = new Date().toISOString();

  console.log(`System paused by ${systemState.pausedBy}: ${systemState.pausedReason}`);

  // Add audit log entry
  addAuditLogEntry({
    action: 'SYSTEM_PAUSE',
    actor: systemState.pausedBy,
    details: `System paused: ${systemState.pausedReason}`,
    success: true
  });

  res.json({
    status: 'success',
    message: 'System paused successfully',
    data: { paused: true }
  });
}

// Resume system
export function handleResumeSystem(req: Request, res: Response) {
  if (!validateApiKey(req)) {
    return sendErrorResponse(res, 401, 'API key required');
  }

  const { actor, reason } = req.body;

  if (!systemState.isPaused) {
    return res.status(400).json({
      status: 'error',
      message: 'System is not currently paused'
    });
  }

  if (systemState.killSwitchEnabled) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot resume system while kill switch is enabled'
    });
  }

  systemState.isPaused = false;
  systemState.changedBy = actor || 'Unknown';
  systemState.changedAt = new Date().toISOString();

  // Clear pause-specific fields
  delete systemState.pausedBy;
  delete systemState.pausedReason;
  delete systemState.pausedAt;

  console.log(`System resumed by ${systemState.changedBy}${reason ? `: ${reason}` : ''}`);

  // Add audit log entry
  addAuditLogEntry({
    action: 'SYSTEM_RESUME',
    actor: systemState.changedBy,
    details: `System resumed: ${reason || 'No reason provided'}`,
    success: true
  });

  res.json({
    status: 'success',
    message: 'System resumed successfully',
    data: { paused: false }
  });
}

// Get current trading mode
export function handleGetTradingMode(req: Request, res: Response) {
  if (!validateApiKey(req)) {
    return sendErrorResponse(res, 401, 'API key required');
  }

  res.json({
    status: 'success',
    data: {
      mode: systemState.mode,
      changedBy: systemState.changedBy,
      changedAt: systemState.changedAt
    }
  });
}

// Set trading mode
export function handleSetTradingMode(req: Request, res: Response) {
  if (!validateApiKey(req)) {
    return sendErrorResponse(res, 401, 'API key required');
  }

  const { mode, actor, reason } = req.body;

  if (!mode || !['simulation', 'dry-run', 'live'].includes(mode.toLowerCase())) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid trading mode. Must be one of: simulation, dry-run, live'
    });
  }

  // Require reason when switching to live mode
  if (mode.toLowerCase() === 'live' && !reason) {
    return res.status(400).json({
      status: 'error',
      message: 'Reason is required when switching to live mode'
    });
  }

  if (systemState.killSwitchEnabled) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot change trading mode while kill switch is enabled'
    });
  }

  const previousMode = systemState.mode;
  systemState.mode = mode;
  systemState.changedBy = actor || 'Unknown';
  systemState.changedAt = new Date().toISOString();

  console.log(`Trading mode changed from ${previousMode} to ${mode} by ${systemState.changedBy}`);

  // Add audit log entry
  addAuditLogEntry({
    action: 'MODE_CHANGE',
    actor: systemState.changedBy,
    details: `Trading mode changed from ${previousMode} to ${mode}${reason ? `: ${reason}` : ''}`,
    success: true
  });

  res.json({
    status: 'success',
    message: `Trading mode changed to ${mode}`,
    data: { mode }
  });
}

// In-memory audit log
interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  success: boolean;
}

let auditLog: AuditLogEntry[] = [
  {
    id: 'audit_1',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    action: 'MODE_CHANGE',
    actor: 'admin@example.com',
    details: 'Changed trading mode from Simulation to Live',
    success: true
  },
  {
    id: 'audit_2',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    action: 'SYSTEM_PAUSE',
    actor: 'admin@example.com',
    details: 'System paused for maintenance',
    success: true
  },
  {
    id: 'audit_3',
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    action: 'SYSTEM_RESUME',
    actor: 'admin@example.com',
    details: 'System resumed after maintenance',
    success: true
  }
];

// Helper function to add audit log entries
function addAuditLogEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  const newEntry: AuditLogEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLog.unshift(newEntry); // Add to beginning
  // Keep only last 100 entries
  if (auditLog.length > 100) {
    auditLog = auditLog.slice(0, 100);
  }
}

// Emergency kill switch
export function handleKillSwitch(req: Request, res: Response) {
  if (!validateApiKey(req)) {
    return sendErrorResponse(res, 401, 'API key required');
  }

  const { enabled, actor, reason } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      status: 'error',
      message: 'enabled field must be a boolean'
    });
  }

  // Require actor and reason when enabling kill switch
  if (enabled && (!actor || !reason)) {
    return res.status(400).json({
      status: 'error',
      message: 'Actor and reason are required when enabling kill switch'
    });
  }

  // Minimum reason length check when enabling
  if (enabled && reason && reason.length < 10) {
    return res.status(400).json({
      status: 'error',
      message: 'Reason must be at least 10 characters when enabling kill switch'
    });
  }

  systemState.killSwitchEnabled = enabled;

  if (enabled) {
    systemState.killSwitchBy = actor;
    systemState.killSwitchReason = reason;
    systemState.killSwitchAt = new Date().toISOString();

    // Auto-pause system when kill switch is enabled
    if (!systemState.isPaused) {
      systemState.isPaused = true;
      systemState.pausedBy = 'Kill Switch';
      systemState.pausedReason = 'Emergency kill switch activated';
      systemState.pausedAt = new Date().toISOString();
    }
  } else {
    delete systemState.killSwitchBy;
    delete systemState.killSwitchReason;
    delete systemState.killSwitchAt;
  }

  console.log(`Kill switch ${enabled ? 'enabled' : 'disabled'} by ${actor || 'Unknown'}`);

  // Add audit log entry
  addAuditLogEntry({
    action: 'KILL_SWITCH',
    actor: actor || 'Unknown',
    details: `Kill switch ${enabled ? 'enabled' : 'disabled'}${reason ? `: ${reason}` : ''}`,
    success: true
  });

  res.json({
    status: 'success',
    message: `Kill switch ${enabled ? 'enabled' : 'disabled'}`,
    data: { enabled }
  });
}

// Get system audit log
export function handleGetAuditLog(req: Request, res: Response) {
  if (!validateApiKey(req)) {
    return sendErrorResponse(res, 401, 'API key required');
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const limitedLog = auditLog.slice(0, Math.min(limit, 100));

  res.json({
    status: 'success',
    data: limitedLog
  });
}
