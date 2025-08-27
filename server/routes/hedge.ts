import { Request, Response } from 'express';

// Types
interface HedgeRecord {
  id: string;
  userId: string;
  amount: number; // USDT amount
  timestamp: string;
  type: 'profit_hedge' | 'manual_hedge' | 'auto_hedge';
  triggerPrice: number;
  status: 'active' | 'closed' | 'expired';
  pnl: number;
  fees: number;
}

interface Balance {
  asset: string;
  available: number;
  locked: number;
  total: number;
  valueUsd: number;
}

interface WithdrawableCalculation {
  totalValue: number;
  lockedValue: number;
  hedgedValue: number;
  availableToWithdraw: number;
  maxSafeWithdrawal: number;
  safetyBuffer: number;
}

interface UserHedgeSettings {
  userId: string;
  hedgePercent: number; // 0-1
  autoAdjust: boolean;
  lastUpdated: string;
  updatedBy: string;
}

interface MarketConditions {
  volatility: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedHedgePercent: number;
  lastUpdated: string;
}

// Mock data - in production this would come from database
const hedgeRecords: HedgeRecord[] = [
  {
    id: 'hedge_001',
    userId: 'user_001',
    amount: 15000.00,
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    type: 'profit_hedge',
    triggerPrice: 43200.00,
    status: 'active',
    pnl: 1250.50,
    fees: 75.00
  },
  {
    id: 'hedge_002',
    userId: 'user_001',
    amount: 6250.00,
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    type: 'auto_hedge',
    triggerPrice: 2580.00,
    status: 'active',
    pnl: 420.80,
    fees: 31.25
  },
  {
    id: 'hedge_003',
    userId: 'user_001',
    amount: 8500.00,
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    type: 'manual_hedge',
    triggerPrice: 42800.00,
    status: 'closed',
    pnl: -85.20,
    fees: 42.50
  }
];

const balances: Balance[] = [
  {
    asset: 'BTC',
    available: 1.4567,
    locked: 0.2134,
    total: 1.6701,
    valueUsd: 72650.85
  },
  {
    asset: 'ETH',
    available: 11.2890,
    locked: 2.1567,
    total: 13.4457,
    valueUsd: 35640.11
  },
  {
    asset: 'USDT',
    available: 21250.00,
    locked: 0.00,
    total: 21250.00,
    valueUsd: 21250.00
  },
  {
    asset: 'ADA',
    available: 15670.45,
    locked: 0.00,
    total: 15670.45,
    valueUsd: 7521.82
  }
];

let userHedgeSettings: UserHedgeSettings[] = [
  {
    userId: 'user_001',
    hedgePercent: 0.25,
    autoAdjust: true,
    lastUpdated: new Date(Date.now() - 86400000).toISOString(),
    updatedBy: 'user_001'
  }
];

const marketConditions: MarketConditions = {
  volatility: 0.045,
  riskLevel: 'medium',
  recommendedHedgePercent: 0.30,
  lastUpdated: new Date().toISOString()
};

// Get hedge records with pagination
export function handleGetHedges(req: Request, res: Response) {
  const {
    userId = 'user_001', // In production, get from auth
    limit = '20',
    offset = '0',
    status = 'all'
  } = req.query;

  let filteredHedges = hedgeRecords.filter(hedge => hedge.userId === userId);

  // Apply status filter
  if (status && status !== 'all') {
    filteredHedges = filteredHedges.filter(hedge => hedge.status === status);
  }

  // Apply pagination
  const limitNum = parseInt(limit as string, 10) || 20;
  const offsetNum = parseInt(offset as string, 10) || 0;
  const paginatedHedges = filteredHedges.slice(offsetNum, offsetNum + limitNum);

  // Calculate totals
  const totalHedged = filteredHedges
    .filter(h => h.status === 'active')
    .reduce((sum, h) => sum + h.amount, 0);

  const totalPnl = filteredHedges.reduce((sum, h) => sum + h.pnl, 0);
  const totalFees = filteredHedges.reduce((sum, h) => sum + h.fees, 0);

  res.json({
    status: 'success',
    data: paginatedHedges,
    metadata: {
      total: filteredHedges.length,
      limit: limitNum,
      offset: offsetNum,
      totals: {
        totalHedged,
        totalPnl,
        totalFees
      }
    }
  });
}

// Get wallet balances
export function handleGetBalances(req: Request, res: Response) {
  const totalValue = balances.reduce((sum, b) => sum + b.valueUsd, 0);
  const totalAvailable = balances.reduce((sum, b) => sum + (b.available / b.total) * b.valueUsd, 0);
  const totalLocked = balances.reduce((sum, b) => sum + (b.locked / b.total) * b.valueUsd, 0);

  res.json({
    status: 'success',
    data: {
      balances,
      summary: {
        totalValue,
        totalAvailable,
        totalLocked,
        assetCount: balances.length
      }
    }
  });
}

// Calculate withdrawable funds
export function handleGetWithdrawable(req: Request, res: Response) {
  const totalValue = balances.reduce((sum, b) => sum + b.valueUsd, 0);
  const lockedValue = balances.reduce((sum, b) => sum + (b.locked / b.total) * b.valueUsd, 0);
  
  // Get active hedged value
  const hedgedValue = hedgeRecords
    .filter(h => h.status === 'active')
    .reduce((sum, h) => sum + h.amount, 0);

  // Safety buffer (10% of total value)
  const safetyBuffer = totalValue * 0.10;
  
  // Available to withdraw = total - locked - safety buffer
  const availableToWithdraw = Math.max(0, totalValue - lockedValue - safetyBuffer);
  
  // Max safe withdrawal considering hedge positions
  const maxSafeWithdrawal = Math.max(0, availableToWithdraw - (hedgedValue * 0.2));

  const calculation: WithdrawableCalculation = {
    totalValue,
    lockedValue,
    hedgedValue,
    availableToWithdraw,
    maxSafeWithdrawal,
    safetyBuffer
  };

  res.json({
    status: 'success',
    data: calculation
  });
}

// Execute hedge
export function handleExecuteHedge(req: Request, res: Response) {
  const {
    amount,
    type = 'manual_hedge',
    userId = 'user_001' // In production, get from auth
  } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid hedge amount is required'
    });
  }

  // Check if user has sufficient funds
  const totalValue = balances.reduce((sum, b) => sum + b.valueUsd, 0);
  if (amount > totalValue * 0.5) { // Max 50% of portfolio can be hedged at once
    return res.status(400).json({
      status: 'error',
      message: 'Hedge amount exceeds maximum allowed (50% of portfolio)'
    });
  }

  // Create new hedge record
  const newHedge: HedgeRecord = {
    id: `hedge_${Date.now()}`,
    userId,
    amount,
    timestamp: new Date().toISOString(),
    type: type as 'profit_hedge' | 'manual_hedge' | 'auto_hedge',
    triggerPrice: 43500.00, // Current BTC price simulation
    status: 'active',
    pnl: 0,
    fees: amount * 0.005 // 0.5% fee
  };

  hedgeRecords.unshift(newHedge);

  // Update USDT balance
  const usdtBalance = balances.find(b => b.asset === 'USDT');
  if (usdtBalance) {
    usdtBalance.available += amount;
    usdtBalance.total += amount;
    usdtBalance.valueUsd += amount;
  }

  console.log(`Hedge executed: ${newHedge.id} for ${amount} USDT by ${userId}`);

  res.json({
    status: 'success',
    message: 'Hedge executed successfully',
    data: {
      hedgeId: newHedge.id,
      amount,
      fees: newHedge.fees,
      newHedge
    }
  });
}

// Get user hedge settings
export function handleGetHedgePercent(req: Request, res: Response) {
  const userId = req.query.userId as string || 'user_001'; // In production, get from auth

  const userSettings = userHedgeSettings.find(s => s.userId === userId);
  
  if (!userSettings) {
    // Return default settings
    return res.json({
      status: 'success',
      data: {
        userId,
        hedgePercent: marketConditions.recommendedHedgePercent,
        autoAdjust: true,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      }
    });
  }

  // If auto-adjust is enabled, return market-derived percent
  let effectivePercent = userSettings.hedgePercent;
  if (userSettings.autoAdjust) {
    effectivePercent = marketConditions.recommendedHedgePercent;
  }

  res.json({
    status: 'success',
    data: {
      ...userSettings,
      effectivePercent,
      marketConditions
    }
  });
}

// Update user hedge settings
export function handleUpdateHedgePercent(req: Request, res: Response) {
  const {
    hedgePercent,
    autoAdjust,
    userId = 'user_001' // In production, get from auth
  } = req.body;

  // Validation
  if (hedgePercent !== undefined && (hedgePercent < 0 || hedgePercent > 1)) {
    return res.status(400).json({
      status: 'error',
      message: 'Hedge percent must be between 0 and 1'
    });
  }

  if (autoAdjust !== undefined && typeof autoAdjust !== 'boolean') {
    return res.status(400).json({
      status: 'error',
      message: 'Auto-adjust must be a boolean value'
    });
  }

  // Find or create user settings
  let userSettings = userHedgeSettings.find(s => s.userId === userId);
  
  if (!userSettings) {
    userSettings = {
      userId,
      hedgePercent: hedgePercent ?? marketConditions.recommendedHedgePercent,
      autoAdjust: autoAdjust ?? true,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId
    };
    userHedgeSettings.push(userSettings);
  } else {
    // Update existing settings
    if (hedgePercent !== undefined) {
      userSettings.hedgePercent = hedgePercent;
    }
    if (autoAdjust !== undefined) {
      userSettings.autoAdjust = autoAdjust;
    }
    userSettings.lastUpdated = new Date().toISOString();
    userSettings.updatedBy = userId;
  }

  console.log(`Hedge settings updated for ${userId}:`, userSettings);

  res.json({
    status: 'success',
    message: 'Hedge settings updated successfully',
    data: userSettings
  });
}

// Get market conditions (for admin/debugging)
export function handleGetMarketConditions(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: marketConditions
  });
}

// Update market conditions (admin only)
export function handleUpdateMarketConditions(req: Request, res: Response) {
  const { volatility, riskLevel, recommendedHedgePercent } = req.body;

  if (volatility !== undefined) {
    marketConditions.volatility = volatility;
  }
  if (riskLevel !== undefined) {
    marketConditions.riskLevel = riskLevel;
  }
  if (recommendedHedgePercent !== undefined) {
    marketConditions.recommendedHedgePercent = recommendedHedgePercent;
  }

  marketConditions.lastUpdated = new Date().toISOString();

  console.log('Market conditions updated:', marketConditions);

  res.json({
    status: 'success',
    message: 'Market conditions updated',
    data: marketConditions
  });
}

// Close hedge position
export function handleCloseHedge(req: Request, res: Response) {
  const { hedgeId } = req.params;
  const { userId = 'user_001' } = req.body; // In production, get from auth

  const hedge = hedgeRecords.find(h => h.id === hedgeId && h.userId === userId);
  
  if (!hedge) {
    return res.status(404).json({
      status: 'error',
      message: 'Hedge position not found'
    });
  }

  if (hedge.status !== 'active') {
    return res.status(400).json({
      status: 'error',
      message: 'Hedge position is not active'
    });
  }

  // Close the hedge
  hedge.status = 'closed';
  
  // Simulate final P&L calculation
  const marketMovement = (Math.random() - 0.5) * 0.1; // ±5% movement
  hedge.pnl = hedge.amount * marketMovement;

  console.log(`Hedge closed: ${hedgeId} with P&L: ${hedge.pnl}`);

  res.json({
    status: 'success',
    message: 'Hedge position closed successfully',
    data: hedge
  });
}
