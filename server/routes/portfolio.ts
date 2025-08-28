import { Request, Response } from 'express';

// Types matching the specification
interface PortfolioRecord {
  id: string;
  user_id: string;
  mode: 'live' | 'demo' | 'paper';
  total_balance: number;
  usdt_balance: number;
  hedged_balance: number;
  last_updated: string;
}

interface RebalanceEvent {
  id: string;
  timestamp: string;
  triggeredBy: string;
  reason: string;
  portfoliosAffected: number;
  totalValueRebalanced: number;
  status: 'completed' | 'failed' | 'in_progress';
  duration: number; // in milliseconds
}

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_OFFSET = 0;

// Mock portfolio data matching the specification
const portfolios: PortfolioRecord[] = [
  {
    id: 'port_001',
    user_id: 'user_001',
    mode: 'live',
    total_balance: 125000.50,
    usdt_balance: 15000.25,
    hedged_balance: 110000.25,
    last_updated: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'port_002',
    user_id: 'user_002', 
    mode: 'live',
    total_balance: 89750.75,
    usdt_balance: 8975.08,
    hedged_balance: 80775.67,
    last_updated: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'port_003',
    user_id: 'user_003',
    mode: 'demo',
    total_balance: 256750.80,
    usdt_balance: 25675.08,
    hedged_balance: 231075.72,
    last_updated: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'port_004',
    user_id: 'user_004',
    mode: 'live',
    total_balance: 45200.15,
    usdt_balance: 4520.02,
    hedged_balance: 40680.13,
    last_updated: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'port_005',
    user_id: 'user_005',
    mode: 'paper',
    total_balance: 178920.45,
    usdt_balance: 17892.05,
    hedged_balance: 161028.40,
    last_updated: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 'port_006',
    user_id: 'user_006',
    mode: 'live',
    total_balance: 67890.30,
    usdt_balance: 6789.03,
    hedged_balance: 61101.27,
    last_updated: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'port_007',
    user_id: 'user_007',
    mode: 'demo',
    total_balance: 234567.89,
    usdt_balance: 23456.79,
    hedged_balance: 211111.10,
    last_updated: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    id: 'port_008',
    user_id: 'user_008',
    mode: 'live',
    total_balance: 98765.43,
    usdt_balance: 9876.54,
    hedged_balance: 88888.89,
    last_updated: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'port_009',
    user_id: 'user_009',
    mode: 'live',
    total_balance: 156789.12,
    usdt_balance: 15678.91,
    hedged_balance: 141110.21,
    last_updated: new Date(Date.now() - 86400000 * 8).toISOString()
  },
  {
    id: 'port_010',
    user_id: 'user_010',
    mode: 'paper',
    total_balance: 87543.21,
    usdt_balance: 8754.32,
    hedged_balance: 78788.89,
    last_updated: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'port_011',
    user_id: 'user_011',
    mode: 'live',
    total_balance: 143210.98,
    usdt_balance: 14321.10,
    hedged_balance: 128889.88,
    last_updated: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'port_012',
    user_id: 'user_012',
    mode: 'demo',
    total_balance: 76543.21,
    usdt_balance: 7654.32,
    hedged_balance: 68888.89,
    last_updated: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

const rebalanceHistory: RebalanceEvent[] = [
  {
    id: 'rebal_global_001',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    triggeredBy: 'admin@example.com',
    reason: 'Market volatility adjustment',
    portfoliosAffected: 8,
    totalValueRebalanced: 1245000.75,
    status: 'completed',
    duration: 45000
  },
  {
    id: 'rebal_global_002',
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    triggeredBy: 'system@automated',
    reason: 'Scheduled weekly rebalance',
    portfoliosAffected: 12,
    totalValueRebalanced: 1867543.25,
    status: 'completed',
    duration: 62000
  },
  {
    id: 'rebal_global_003',
    timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
    triggeredBy: 'admin@example.com',
    reason: 'Risk threshold breach',
    portfoliosAffected: 5,
    totalValueRebalanced: 567890.50,
    status: 'failed',
    duration: 15000
  }
];

// Get portfolio overview with pagination
export function handleGetPortfolioOverview(req: Request, res: Response) {
  try {
    const {
      limit = DEFAULT_PAGE_LIMIT.toString(),
      offset = DEFAULT_PAGE_OFFSET.toString()
    } = req.query;

    // Validate and parse parameters
    const limitNum = Math.min(parseInt(limit as string, 10) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const offsetNum = Math.max(parseInt(offset as string, 10) || DEFAULT_PAGE_OFFSET, 0);

    // Apply pagination
    const total = portfolios.length;
    const paginatedPortfolios = portfolios.slice(offsetNum, offsetNum + limitNum);
    
    // Calculate next offset
    const hasNext = offsetNum + limitNum < total;
    const next = hasNext ? offsetNum + limitNum : null;

    res.json({
      total,
      items: paginatedPortfolios,
      next
    });
  } catch (error) {
    console.error('Get portfolio overview error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

// Get portfolio details for specific user
export function handleGetPortfolioDetails(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const portfolio = portfolios.find(p => p.user_id === userId);
    if (!portfolio) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found'
      });
    }

    res.json({
      status: 'success',
      data: portfolio
    });
  } catch (error) {
    console.error('Get portfolio details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

// Trigger global portfolio rebalance
export function handleRebalanceAll(req: Request, res: Response) {
  try {
    const { prices, returns, actor } = req.body;

    // Validation
    if (!prices || !returns) {
      return res.status(400).json({
        status: 'error',
        message: 'Both prices and returns are required'
      });
    }

    // Validate prices object
    if (typeof prices !== 'object' || Array.isArray(prices)) {
      return res.status(400).json({
        status: 'error',
        message: 'Prices must be an object with symbol-price pairs'
      });
    }

    // Validate returns object  
    if (typeof returns !== 'object' || Array.isArray(returns)) {
      return res.status(400).json({
        status: 'error',
        message: 'Returns must be an object with symbol-array pairs'
      });
    }

    // Validate that prices values are numbers
    for (const [symbol, price] of Object.entries(prices)) {
      if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid price for ${symbol}: must be a positive number`
        });
      }
    }

    // Validate that returns values are arrays of numbers
    for (const [symbol, returnArray] of Object.entries(returns)) {
      if (!Array.isArray(returnArray)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid returns for ${symbol}: must be an array`
        });
      }
      
      for (const returnValue of returnArray) {
        if (typeof returnValue !== 'number') {
          return res.status(400).json({
            status: 'error',
            message: `Invalid return value for ${symbol}: all values must be numbers`
          });
        }
      }
    }

    // Count active portfolios (live and demo modes)
    const activePortfolios = portfolios.filter(p => p.mode === 'live' || p.mode === 'demo');
    const rebalancedCount = activePortfolios.length;

    // Simulate rebalance process
    const rebalanceId = `rebal_${Date.now()}`;
    const startTime = Date.now();

    // Create rebalance event
    const rebalanceEvent: RebalanceEvent = {
      id: rebalanceId,
      timestamp: new Date().toISOString(),
      triggeredBy: actor || 'Unknown',
      reason: 'Manual global rebalance',
      portfoliosAffected: rebalancedCount,
      totalValueRebalanced: activePortfolios.reduce((sum, p) => sum + p.total_balance, 0),
      status: 'in_progress',
      duration: 0
    };

    // Add to history
    rebalanceHistory.unshift(rebalanceEvent);

    // Simulate processing time and completion
    setTimeout(() => {
      const event = rebalanceHistory.find(r => r.id === rebalanceId);
      if (event) {
        event.status = 'completed';
        event.duration = Date.now() - startTime;
        
        // Update last_updated timestamps for rebalanced portfolios
        activePortfolios.forEach(portfolio => {
          portfolio.last_updated = new Date().toISOString();
        });
      }
    }, Math.random() * 5000 + 2000); // 2-7 second simulation

    console.log(`Global rebalance started: ${rebalanceId} by ${actor || 'Unknown'}`);
    console.log('Portfolios to rebalance:', rebalancedCount);
    console.log('Prices:', Object.keys(prices).length, 'assets');
    console.log('Returns:', Object.keys(returns).length, 'assets');

    // Response matching specification
    res.json({
      rebalanced: rebalancedCount
    });
  } catch (error) {
    console.error('Rebalance all error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

// Get rebalance status
export function handleGetRebalanceStatus(req: Request, res: Response) {
  try {
    const { rebalanceId } = req.params;

    const rebalanceEvent = rebalanceHistory.find(r => r.id === rebalanceId);
    if (!rebalanceEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Rebalance event not found'
      });
    }

    res.json({
      status: 'success',
      data: rebalanceEvent
    });
  } catch (error) {
    console.error('Get rebalance status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

// Get rebalance history
export function handleGetRebalanceHistory(_req: Request, res: Response) {
  try {
    res.json({
      status: 'success',
      data: rebalanceHistory.slice(0, 10) // Last 10 events
    });
  } catch (error) {
    console.error('Get rebalance history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

// Get portfolio statistics
export function handleGetPortfolioStats(_req: Request, res: Response) {
  try {
    const totalValue = portfolios.reduce((sum, p) => sum + p.total_balance, 0);
    const totalUsdtBalance = portfolios.reduce((sum, p) => sum + p.usdt_balance, 0);
    const totalHedgedBalance = portfolios.reduce((sum, p) => sum + p.hedged_balance, 0);
    
    const modeDistribution = {
      live: portfolios.filter(p => p.mode === 'live').length,
      demo: portfolios.filter(p => p.mode === 'demo').length,
      paper: portfolios.filter(p => p.mode === 'paper').length
    };

    // Find portfolios that need rebalancing (last updated > 7 days ago)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const needsRebalancing = portfolios.filter(p => 
      new Date(p.last_updated).getTime() < weekAgo
    ).length;

    res.json({
      status: 'success',
      data: {
        totalPortfolios: portfolios.length,
        totalValue,
        totalUsdtBalance,
        totalHedgedBalance,
        modeDistribution,
        needsRebalancing,
        lastGlobalRebalance: rebalanceHistory[0]?.timestamp || null
      }
    });
  } catch (error) {
    console.error('Get portfolio stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}
