import { Request, Response } from 'express';

// Types
interface PortfolioOverview {
  userId: string;
  userName: string;
  email: string;
  totalValue: number;
  assetsCount: number;
  lastRebalanced: string;
  performance24h: number;
  performance7d: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface Asset {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  value: number;
  allocation: number;
  targetAllocation: number;
  performance24h: number;
  lastUpdated: string;
}

interface PortfolioDetails {
  userId: string;
  userName: string;
  email: string;
  totalValue: number;
  assetsCount: number;
  lastRebalanced: string;
  performance24h: number;
  performance7d: number;
  performance30d: number;
  riskLevel: 'low' | 'medium' | 'high';
  assets: Asset[];
  rebalanceHistory: RebalanceEvent[];
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
  changes: {
    userId: string;
    before: { [symbol: string]: number };
    after: { [symbol: string]: number };
  }[];
}

// Mock data - in production this would come from database
const portfolios: PortfolioOverview[] = [
  {
    userId: 'user_001',
    userName: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    totalValue: 125000.50,
    assetsCount: 8,
    lastRebalanced: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    performance24h: 0.025,
    performance7d: 0.087,
    riskLevel: 'medium'
  },
  {
    userId: 'user_002',
    userName: 'Bob Smith',
    email: 'bob.smith@example.com',
    totalValue: 89750.25,
    assetsCount: 6,
    lastRebalanced: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    performance24h: -0.012,
    performance7d: 0.045,
    riskLevel: 'low'
  },
  {
    userId: 'user_003',
    userName: 'Carol Davis',
    email: 'carol.davis@example.com',
    totalValue: 256750.80,
    assetsCount: 12,
    lastRebalanced: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    performance24h: 0.041,
    performance7d: 0.156,
    riskLevel: 'high'
  },
  {
    userId: 'user_004',
    userName: 'David Wilson',
    email: 'david.wilson@example.com',
    totalValue: 45200.15,
    assetsCount: 4,
    lastRebalanced: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    performance24h: 0.018,
    performance7d: 0.032,
    riskLevel: 'low'
  },
  {
    userId: 'user_005',
    userName: 'Eva Martinez',
    email: 'eva.martinez@example.com',
    totalValue: 178920.45,
    assetsCount: 9,
    lastRebalanced: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
    performance24h: 0.067,
    performance7d: 0.203,
    riskLevel: 'high'
  }
];

const portfolioDetails: { [userId: string]: PortfolioDetails } = {
  'user_001': {
    userId: 'user_001',
    userName: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    totalValue: 125000.50,
    assetsCount: 8,
    lastRebalanced: new Date(Date.now() - 86400000 * 2).toISOString(),
    performance24h: 0.025,
    performance7d: 0.087,
    performance30d: 0.156,
    riskLevel: 'medium',
    assets: [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 2.5,
        currentPrice: 43500.00,
        value: 108750.00,
        allocation: 0.87,
        targetAllocation: 0.60,
        performance24h: 0.028,
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        quantity: 6.1,
        currentPrice: 2650.00,
        value: 16165.00,
        allocation: 0.13,
        targetAllocation: 0.40,
        performance24h: 0.015,
        lastUpdated: new Date().toISOString()
      }
    ],
    rebalanceHistory: [
      {
        id: 'rebal_001',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        triggeredBy: 'admin@example.com',
        reason: 'Scheduled weekly rebalance',
        portfoliosAffected: 1,
        totalValueRebalanced: 125000.50,
        status: 'completed',
        duration: 2500,
        changes: [
          {
            userId: 'user_001',
            before: { 'BTC': 0.90, 'ETH': 0.10 },
            after: { 'BTC': 0.60, 'ETH': 0.40 }
          }
        ]
      }
    ]
  }
};

const rebalanceHistory: RebalanceEvent[] = [
  {
    id: 'rebal_global_001',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    triggeredBy: 'admin@example.com',
    reason: 'Market volatility adjustment',
    portfoliosAffected: 15,
    totalValueRebalanced: 2450000.75,
    status: 'completed',
    duration: 45000,
    changes: []
  },
  {
    id: 'rebal_global_002',
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    triggeredBy: 'system@automated',
    reason: 'Scheduled weekly rebalance',
    portfoliosAffected: 23,
    totalValueRebalanced: 3200000.25,
    status: 'completed',
    duration: 62000,
    changes: []
  }
];

// Get portfolio overview with pagination and sorting
export function handleGetPortfolioOverview(req: Request, res: Response) {
  const {
    sort = 'totalValue',
    order = 'desc',
    limit = '20',
    offset = '0',
    search = ''
  } = req.query;

  let filteredPortfolios = [...portfolios];

  // Apply search filter
  if (search && typeof search === 'string') {
    const searchTerm = search.toLowerCase();
    filteredPortfolios = filteredPortfolios.filter(portfolio =>
      portfolio.userName.toLowerCase().includes(searchTerm) ||
      portfolio.email.toLowerCase().includes(searchTerm) ||
      portfolio.userId.toLowerCase().includes(searchTerm)
    );
  }

  // Apply sorting
  const sortField = sort as keyof PortfolioOverview;
  filteredPortfolios.sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (order === 'desc') {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    } else {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
  });

  // Apply pagination
  const limitNum = parseInt(limit as string, 10) || 20;
  const offsetNum = parseInt(offset as string, 10) || 0;
  const paginatedPortfolios = filteredPortfolios.slice(offsetNum, offsetNum + limitNum);

  // Calculate summary statistics
  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const avgPerformance24h = portfolios.reduce((sum, p) => sum + p.performance24h, 0) / portfolios.length;
  const totalAssets = portfolios.reduce((sum, p) => sum + p.assetsCount, 0);

  res.json({
    status: 'success',
    data: paginatedPortfolios,
    metadata: {
      total: filteredPortfolios.length,
      limit: limitNum,
      offset: offsetNum,
      summary: {
        totalPortfolios: portfolios.length,
        totalValue,
        avgPerformance24h,
        totalAssets
      }
    }
  });
}

// Get portfolio details for specific user
export function handleGetPortfolioDetails(req: Request, res: Response) {
  const { userId } = req.params;

  const details = portfolioDetails[userId];
  if (!details) {
    return res.status(404).json({
      status: 'error',
      message: 'Portfolio not found'
    });
  }

  res.json({
    status: 'success',
    data: details
  });
}

// Trigger global portfolio rebalance
export function handleRebalanceAll(req: Request, res: Response) {
  const { pricesJson, returnsJson, actor } = req.body;

  // Validation
  if (!pricesJson || !returnsJson) {
    return res.status(400).json({
      status: 'error',
      message: 'Both pricesJson and returnsJson are required'
    });
  }

  let prices, returns;
  try {
    prices = typeof pricesJson === 'string' ? JSON.parse(pricesJson) : pricesJson;
    returns = typeof returnsJson === 'string' ? JSON.parse(returnsJson) : returnsJson;
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON format in prices or returns data'
    });
  }

  // Simulate rebalance process
  const rebalanceId = `rebal_${Date.now()}`;
  const startTime = Date.now();

  // Create rebalance event
  const rebalanceEvent: RebalanceEvent = {
    id: rebalanceId,
    timestamp: new Date().toISOString(),
    triggeredBy: actor || 'Unknown',
    reason: 'Manual global rebalance',
    portfoliosAffected: portfolios.length,
    totalValueRebalanced: portfolios.reduce((sum, p) => sum + p.totalValue, 0),
    status: 'in_progress',
    duration: 0,
    changes: []
  };

  // Add to history
  rebalanceHistory.unshift(rebalanceEvent);

  // Simulate processing time
  setTimeout(() => {
    // Update rebalance event
    const event = rebalanceHistory.find(r => r.id === rebalanceId);
    if (event) {
      event.status = 'completed';
      event.duration = Date.now() - startTime;
      
      // Update last rebalanced timestamps for all portfolios
      portfolios.forEach(portfolio => {
        portfolio.lastRebalanced = new Date().toISOString();
      });
    }
  }, 5000); // 5 second simulation

  console.log(`Global rebalance started: ${rebalanceId} by ${actor || 'Unknown'}`);
  console.log('Prices:', prices);
  console.log('Returns:', returns);

  res.json({
    status: 'success',
    message: 'Global rebalance initiated successfully',
    data: {
      rebalanceId,
      portfoliosAffected: portfolios.length,
      totalValue: portfolios.reduce((sum, p) => sum + p.totalValue, 0),
      estimatedDuration: '5-10 minutes'
    }
  });
}

// Get rebalance status
export function handleGetRebalanceStatus(req: Request, res: Response) {
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
}

// Get rebalance history
export function handleGetRebalanceHistory(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: rebalanceHistory.slice(0, 10) // Last 10 events
  });
}

// Get portfolio statistics
export function handleGetPortfolioStats(_req: Request, res: Response) {
  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const avgPerformance24h = portfolios.reduce((sum, p) => sum + p.performance24h, 0) / portfolios.length;
  const avgPerformance7d = portfolios.reduce((sum, p) => sum + p.performance7d, 0) / portfolios.length;
  const totalAssets = portfolios.reduce((sum, p) => sum + p.assetsCount, 0);
  
  const riskDistribution = {
    low: portfolios.filter(p => p.riskLevel === 'low').length,
    medium: portfolios.filter(p => p.riskLevel === 'medium').length,
    high: portfolios.filter(p => p.riskLevel === 'high').length
  };

  // Find portfolios that need rebalancing (last rebalanced > 7 days ago)
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const needsRebalancing = portfolios.filter(p => 
    new Date(p.lastRebalanced).getTime() < weekAgo
  ).length;

  res.json({
    status: 'success',
    data: {
      totalPortfolios: portfolios.length,
      totalValue,
      avgPerformance24h,
      avgPerformance7d,
      totalAssets,
      avgAssetsPerPortfolio: totalAssets / portfolios.length,
      riskDistribution,
      needsRebalancing,
      lastGlobalRebalance: rebalanceHistory[0]?.timestamp || null
    }
  });
}
