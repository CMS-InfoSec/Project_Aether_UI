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
}

// In-memory system state (in production, this would be persisted in database)
let systemState: SystemState = {
  isPaused: false,
  mode: 'Live'
};

// Get current system status
export function handleGetSystemStatus(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: systemState
  });
}

// Pause system
export function handlePauseSystem(req: Request, res: Response) {
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

  res.json({
    status: 'success',
    message: 'System paused successfully',
    data: systemState
  });
}

// Resume system
export function handleResumeSystem(req: Request, res: Response) {
  const { actor, reason } = req.body;

  if (!systemState.isPaused) {
    return res.status(400).json({
      status: 'error',
      message: 'System is not currently paused'
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

  res.json({
    status: 'success',
    message: 'System resumed successfully',
    data: systemState
  });
}

// Get current trading mode
export function handleGetTradingMode(_req: Request, res: Response) {
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
  const { mode, actor } = req.body;

  if (!mode || !['Simulation', 'Dry-Run', 'Live'].includes(mode)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid trading mode. Must be one of: Simulation, Dry-Run, Live'
    });
  }

  if (systemState.isPaused) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot change trading mode while system is paused'
    });
  }

  const previousMode = systemState.mode;
  systemState.mode = mode;
  systemState.changedBy = actor || 'Unknown';
  systemState.changedAt = new Date().toISOString();

  console.log(`Trading mode changed from ${previousMode} to ${mode} by ${systemState.changedBy}`);

  res.json({
    status: 'success',
    message: `Trading mode changed to ${mode}`,
    data: systemState
  });
}

// Get system audit log (mock implementation)
export function handleGetAuditLog(_req: Request, res: Response) {
  const mockAuditLog = [
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

  res.json({
    status: 'success',
    data: mockAuditLog
  });
}
