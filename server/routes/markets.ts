import { Request, Response } from 'express';

// Types matching the specification
interface MarketItem {
  symbol: string;
  cap_usd: number;
  realized_vol: number;
  status: 'active' | 'inactive' | 'delisted' | 'monitoring';
  profitability: number;
  volume: number;
  last_validated: string;
  last_refreshed: string;
  source: string;
  override: 'allow' | 'block' | null;
  volume_reliable?: boolean;
}

interface MarketStats {
  total_markets: number;
  active_markets: number;
  monitoring_markets: number;
  inactive_markets: number;
  delisted_markets: number;
  avg_profitability: number;
  avg_realized_vol: number;
  total_volume: number;
  total_market_cap: number;
}

// Mock market data - USDT quote pairs with ≥ $200M market cap
const mockMarkets: MarketItem[] = [
  {
    symbol: 'BTC/USDT',
    cap_usd: 850000000000,
    realized_vol: 0.045,
    profitability: 0.127,
    volume: 28500000000,
    last_validated: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    last_refreshed: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    source: 'coingecko',
    status: 'active',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'ETH/USDT',
    cap_usd: 420000000000,
    realized_vol: 0.052,
    profitability: 0.098,
    volume: 15200000000,
    last_validated: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
    last_refreshed: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
    source: 'coingecko',
    status: 'active',
    override: 'allow',
    volume_reliable: true
  },
  {
    symbol: 'BNB/USDT',
    cap_usd: 65000000000,
    realized_vol: 0.067,
    profitability: 0.045,
    volume: 850000000,
    last_validated: new Date(Date.now() - 420000).toISOString(), // 7 minutes ago
    last_refreshed: new Date(Date.now() - 2400000).toISOString(), // 40 minutes ago
    source: 'binance',
    status: 'active',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'XRP/USDT',
    cap_usd: 32000000000,
    realized_vol: 0.089,
    profitability: 0.032,
    volume: 420000000,
    last_validated: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    last_refreshed: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    source: 'coingecko',
    status: 'monitoring',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'SOL/USDT',
    cap_usd: 45000000000,
    realized_vol: 0.089,
    profitability: 0.156,
    volume: 2100000000,
    last_validated: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
    last_refreshed: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    source: 'coingecko',
    status: 'active',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'ADA/USDT',
    cap_usd: 18500000000,
    realized_vol: 0.094,
    profitability: 0.078,
    volume: 680000000,
    last_validated: new Date(Date.now() - 720000).toISOString(), // 12 minutes ago
    last_refreshed: new Date(Date.now() - 3600000).toISOString(), // 60 minutes ago
    source: 'binance',
    status: 'active',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'AVAX/USDT',
    cap_usd: 15600000000,
    realized_vol: 0.076,
    profitability: 0.089,
    volume: 720000000,
    last_validated: new Date(Date.now() - 360000).toISOString(), // 6 minutes ago
    last_refreshed: new Date(Date.now() - 2700000).toISOString(), // 45 minutes ago
    source: 'binance',
    status: 'active',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'DOGE/USDT',
    cap_usd: 12200000000,
    realized_vol: 0.112,
    profitability: 0.024,
    volume: 520000000,
    last_validated: new Date(Date.now() - 480000).toISOString(), // 8 minutes ago
    last_refreshed: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    source: 'coingecko',
    status: 'inactive',
    override: 'block',
    volume_reliable: false
  },
  {
    symbol: 'DOT/USDT',
    cap_usd: 8900000000,
    realized_vol: 0.082,
    profitability: 0.041,
    volume: 290000000,
    last_validated: new Date(Date.now() - 540000).toISOString(), // 9 minutes ago
    last_refreshed: new Date(Date.now() - 2100000).toISOString(), // 35 minutes ago
    source: 'binance',
    status: 'monitoring',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'MATIC/USDT',
    cap_usd: 7200000000,
    realized_vol: 0.098,
    profitability: 0.067,
    volume: 380000000,
    last_validated: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    last_refreshed: new Date(Date.now() - 3000000).toISOString(), // 50 minutes ago
    source: 'coingecko',
    status: 'active',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'LTC/USDT',
    cap_usd: 6800000000,
    realized_vol: 0.058,
    profitability: 0.018,
    volume: 180000000,
    last_validated: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    last_refreshed: new Date(Date.now() - 4200000).toISOString(), // 70 minutes ago
    source: 'coingecko',
    status: 'delisted',
    override: 'block',
    volume_reliable: false
  },
  {
    symbol: 'LINK/USDT',
    cap_usd: 8200000000,
    realized_vol: 0.063,
    profitability: 0.055,
    volume: 340000000,
    last_validated: new Date(Date.now() - 660000).toISOString(), // 11 minutes ago
    last_refreshed: new Date(Date.now() - 2400000).toISOString(), // 40 minutes ago
    source: 'coingecko',
    status: 'active',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'ATOM/USDT',
    cap_usd: 3200000000,
    realized_vol: 0.105,
    profitability: 0.073,
    volume: 195000000,
    last_validated: new Date(Date.now() - 780000).toISOString(), // 13 minutes ago
    last_refreshed: new Date(Date.now() - 3300000).toISOString(), // 55 minutes ago
    source: 'binance',
    status: 'monitoring',
    override: null,
    volume_reliable: false
  },
  {
    symbol: 'NEAR/USDT',
    cap_usd: 4100000000,
    realized_vol: 0.091,
    profitability: 0.086,
    volume: 245000000,
    last_validated: new Date(Date.now() - 1020000).toISOString(), // 17 minutes ago
    last_refreshed: new Date(Date.now() - 1500000).toISOString(), // 25 minutes ago
    source: 'coingecko',
    status: 'active',
    override: null,
    volume_reliable: true
  },
  {
    symbol: 'FTM/USDT',
    cap_usd: 2800000000,
    realized_vol: 0.115,
    profitability: 0.092,
    volume: 165000000,
    last_validated: new Date(Date.now() - 1380000).toISOString(), // 23 minutes ago
    last_refreshed: new Date(Date.now() - 3900000).toISOString(), // 65 minutes ago
    source: 'binance',
    status: 'active',
    override: null,
    volume_reliable: false
  }
];

const DEFAULT_PAGE_LIMIT = 25;
const MAX_PAGE_LIMIT = 100;

// Get eligible markets with filtering and pagination
export function handleGetEligibleMarkets(req: Request, res: Response) {
  const {
    status,
    min_profitability,
    min_volume,
    sort = 'symbol',
    limit = DEFAULT_PAGE_LIMIT.toString(),
    offset = '0',
    symbol
  } = req.query;

  let filteredMarkets = [...mockMarkets];

  // Apply filters
  if (status && typeof status === 'string' && status.trim() && status !== 'all') {
    filteredMarkets = filteredMarkets.filter(market => 
      market.status === (status as string).trim()
    );
  }

  if (symbol && typeof symbol === 'string' && symbol.trim()) {
    const s = symbol.trim().toUpperCase();
    filteredMarkets = filteredMarkets.filter(m => m.symbol.toUpperCase().includes(s));
  }

  if (min_profitability && typeof min_profitability === 'string') {
    const minProf = parseFloat(min_profitability);
    if (!isNaN(minProf)) {
      filteredMarkets = filteredMarkets.filter(market => 
        market.profitability >= minProf
      );
    }
  }

  if (min_volume && typeof min_volume === 'string') {
    const minVol = parseFloat(min_volume);
    if (!isNaN(minVol)) {
      filteredMarkets = filteredMarkets.filter(market => 
        market.volume >= minVol
      );
    }
  }

  // Apply sorting
  const sortField = sort as keyof MarketItem;
  filteredMarkets.sort((a, b) => {
    let aVal = (a as any)[sortField];
    let bVal = (b as any)[sortField];

    // Handle string comparisons
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }

    // For numeric fields, sort descending by default
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return bVal - aVal;
    }

    return 0;
  });

  // Apply pagination
  const limitNum = Math.min(parseInt(limit as string, 10) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
  const offsetNum = parseInt(offset as string, 10) || 0;
  
  const paginatedMarkets = filteredMarkets.slice(offsetNum, offsetNum + limitNum);
  const hasNext = offsetNum + limitNum < filteredMarkets.length;
  const nextOffset = hasNext ? offsetNum + limitNum : null;

  // Generate timestamps
  const lastRefreshed = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
  const dataSource = 'supabase';
  const eligibilityVersion = 'v2025.09.19.1';

  // Set response headers as specified
  res.set({
    'X-Last-Refreshed': lastRefreshed,
    'X-Source': dataSource,
    'X-Eligibility-Version': eligibilityVersion
  });

  // Response format matching specification
  res.json({
    total: filteredMarkets.length,
    items: paginatedMarkets,
    next: nextOffset,
    last_refreshed: lastRefreshed,
    source: dataSource
  });
}

// Get market statistics
export function handleGetMarketStats(_req: Request, res: Response) {
  const stats: MarketStats = {
    total_markets: mockMarkets.length,
    active_markets: mockMarkets.filter(m => m.status === 'active').length,
    monitoring_markets: mockMarkets.filter(m => m.status === 'monitoring').length,
    inactive_markets: mockMarkets.filter(m => m.status === 'inactive').length,
    delisted_markets: mockMarkets.filter(m => m.status === 'delisted').length,
    avg_profitability: mockMarkets.reduce((sum, m) => sum + m.profitability, 0) / mockMarkets.length,
    avg_realized_vol: mockMarkets.reduce((sum, m) => sum + m.realized_vol, 0) / mockMarkets.length,
    total_volume: mockMarkets.reduce((sum, m) => sum + m.volume, 0),
    total_market_cap: mockMarkets.reduce((sum, m) => sum + m.cap_usd, 0)
  };

  res.json({
    status: 'success',
    data: stats
  });
}

// Export markets (return JSON for client-side CSV/JSON conversion with header metadata)
export function handleExportMarkets(req: Request, res: Response) {
  const {
    status,
    min_profitability,
    min_volume,
    sort = 'symbol',
    symbol
  } = req.query;

  let filteredMarkets = [...mockMarkets];

  // Apply same filters as the main endpoint
  if (status && typeof status === 'string' && status.trim() && status !== 'all') {
    filteredMarkets = filteredMarkets.filter(market => 
      market.status === status.trim()
    );
  }

  if (symbol && typeof symbol === 'string' && symbol.trim()) {
    const s = symbol.trim().toUpperCase();
    filteredMarkets = filteredMarkets.filter(m => m.symbol.toUpperCase().includes(s));
  }

  if (min_profitability && typeof min_profitability === 'string') {
    const minProf = parseFloat(min_profitability);
    if (!isNaN(minProf)) {
      filteredMarkets = filteredMarkets.filter(market => 
        market.profitability >= minProf
      );
    }
  }

  if (min_volume && typeof min_volume === 'string') {
    const minVol = parseFloat(min_volume);
    if (!isNaN(minVol)) {
      filteredMarkets = filteredMarkets.filter(market => 
        market.volume >= minVol
      );
    }
  }

  // Apply sorting
  const sortField = sort as keyof MarketItem;
  filteredMarkets.sort((a, b) => {
    let aVal = (a as any)[sortField];
    let bVal = (b as any)[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return bVal - aVal;
    }

    return 0;
  });

  const lastRefreshed = new Date(Date.now() - 86400000).toISOString();
  const dataSource = 'supabase';
  const eligibilityVersion = 'v2025.09.19.1';

  // Set response headers
  res.set({
    'Content-Type': 'application/json',
    'X-Last-Refreshed': lastRefreshed,
    'X-Source': dataSource,
    'X-Eligibility-Version': eligibilityVersion
  });

  res.json({
    status: 'success',
    data: filteredMarkets,
    metadata: {
      last_refreshed: lastRefreshed,
      source: dataSource,
      eligibility_version: eligibilityVersion,
      total: filteredMarkets.length
    },
    filename: 'eligible_markets'
  });
}

// Admin: apply governance strategy override (allow/block) for a symbol
export function handleStrategyOverride(req: Request, res: Response) {
  try {
    const { symbol, action, reason } = req.body || {};
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ status: 'error', detail: 'symbol required' });
    }
    const sym = String(symbol).trim().toUpperCase();
    if (!/^[A-Z0-9]+\/[A-Z0-9]+$/.test(sym)) {
      return res.status(400).json({ status: 'error', detail: 'invalid symbol' });
    }
    if (action !== 'allow' && action !== 'block') {
      return res.status(400).json({ status: 'error', detail: 'action must be allow or block' });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({ status: 'error', detail: 'reason must be at least 10 characters' });
    }

    const idx = mockMarkets.findIndex(m => m.symbol.toUpperCase() === sym);
    if (idx === -1) {
      return res.status(404).json({ status: 'error', detail: 'symbol not found' });
    }

    // Simulate governance approval by immediately setting override; real system would queue proposal
    mockMarkets[idx].override = action;
    const audit_entry_id = `audit_${Date.now()}`;

    return res.status(201).json({
      status: 'success',
      message: 'Override applied',
      data: { symbol: sym, override: action, reason: reason.trim(), audit_entry_id }
    });
  } catch (e) {
    return res.status(500).json({ status: 'error', detail: 'internal error' });
  }
}
