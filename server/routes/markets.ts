import { Request, Response } from 'express';

// Types
interface MarketData {
  symbol: string;
  cap_usd: number;
  volatility: number;
  profitability: number;
  volume: number;
  last_updated: string;
  created_at: string;
  data_source: string;
  status: 'active' | 'inactive' | 'delisted' | 'monitoring';
}

// Mock market data - in production this would come from external APIs or database
const mockMarkets: MarketData[] = [
  {
    symbol: 'BTC',
    cap_usd: 850000000000,
    volatility: 0.045,
    profitability: 0.127,
    volume: 28500000000,
    last_updated: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
    data_source: 'CoinGecko',
    status: 'active'
  },
  {
    symbol: 'ETH',
    cap_usd: 420000000000,
    volatility: 0.052,
    profitability: 0.098,
    volume: 15200000000,
    last_updated: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
    created_at: new Date(Date.now() - 86400000 * 28).toISOString(),
    data_source: 'CoinGecko',
    status: 'active'
  },
  {
    symbol: 'ADA',
    cap_usd: 18500000000,
    volatility: 0.067,
    profitability: 0.045,
    volume: 850000000,
    last_updated: new Date(Date.now() - 420000).toISOString(), // 7 minutes ago
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    data_source: 'Binance',
    status: 'active'
  },
  {
    symbol: 'DOT',
    cap_usd: 12200000000,
    volatility: 0.071,
    profitability: 0.032,
    volume: 420000000,
    last_updated: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    created_at: new Date(Date.now() - 86400000 * 22).toISOString(),
    data_source: 'Binance',
    status: 'monitoring'
  },
  {
    symbol: 'SOL',
    cap_usd: 45000000000,
    volatility: 0.089,
    profitability: 0.156,
    volume: 2100000000,
    last_updated: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    data_source: 'CoinGecko',
    status: 'active'
  },
  {
    symbol: 'MATIC',
    cap_usd: 8500000000,
    volatility: 0.094,
    profitability: 0.078,
    volume: 680000000,
    last_updated: new Date(Date.now() - 720000).toISOString(), // 12 minutes ago
    created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
    data_source: 'Binance',
    status: 'active'
  },
  {
    symbol: 'LINK',
    cap_usd: 7800000000,
    volatility: 0.063,
    profitability: 0.024,
    volume: 520000000,
    last_updated: new Date(Date.now() - 480000).toISOString(), // 8 minutes ago
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    data_source: 'CoinGecko',
    status: 'inactive'
  },
  {
    symbol: 'AVAX',
    cap_usd: 15600000000,
    volatility: 0.076,
    profitability: 0.089,
    volume: 720000000,
    last_updated: new Date(Date.now() - 360000).toISOString(), // 6 minutes ago
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    data_source: 'Binance',
    status: 'active'
  },
  {
    symbol: 'ALGO',
    cap_usd: 2400000000,
    volatility: 0.058,
    profitability: 0.018,
    volume: 180000000,
    last_updated: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    data_source: 'CoinGecko',
    status: 'delisted'
  },
  {
    symbol: 'ATOM',
    cap_usd: 3200000000,
    volatility: 0.082,
    profitability: 0.041,
    volume: 290000000,
    last_updated: new Date(Date.now() - 540000).toISOString(), // 9 minutes ago
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    data_source: 'Binance',
    status: 'monitoring'
  }
];

// Get eligible markets with filtering and pagination
export function handleGetEligibleMarkets(req: Request, res: Response) {
  const {
    status,
    min_profitability,
    min_volume,
    sort = 'profitability',
    order = 'desc',
    limit = '50',
    offset = '0'
  } = req.query;

  let filteredMarkets = [...mockMarkets];

  // Apply filters
  if (status && typeof status === 'string') {
    const statusArray = status.split(',');
    filteredMarkets = filteredMarkets.filter(market => 
      statusArray.includes(market.status)
    );
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
  const sortField = sort as keyof MarketData;
  filteredMarkets.sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Handle string comparisons
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
  const limitNum = parseInt(limit as string, 10) || 50;
  const offsetNum = parseInt(offset as string, 10) || 0;
  const paginatedMarkets = filteredMarkets.slice(offsetNum, offsetNum + limitNum);

  // Generate metadata headers
  const lastRefreshed = new Date().toISOString();
  const sources = [...new Set(filteredMarkets.map(m => m.data_source))].join(', ');

  // Set response headers
  res.set({
    'X-Last-Refreshed': lastRefreshed,
    'X-Source': sources,
    'X-Total-Count': filteredMarkets.length.toString(),
    'X-Limit': limitNum.toString(),
    'X-Offset': offsetNum.toString()
  });

  res.json({
    status: 'success',
    data: paginatedMarkets,
    metadata: {
      total: filteredMarkets.length,
      limit: limitNum,
      offset: offsetNum,
      last_refreshed: lastRefreshed,
      sources: sources
    }
  });
}

// Get market statistics
export function handleGetMarketStats(_req: Request, res: Response) {
  const stats = {
    total_markets: mockMarkets.length,
    active_markets: mockMarkets.filter(m => m.status === 'active').length,
    monitoring_markets: mockMarkets.filter(m => m.status === 'monitoring').length,
    inactive_markets: mockMarkets.filter(m => m.status === 'inactive').length,
    delisted_markets: mockMarkets.filter(m => m.status === 'delisted').length,
    avg_profitability: mockMarkets.reduce((sum, m) => sum + m.profitability, 0) / mockMarkets.length,
    avg_volatility: mockMarkets.reduce((sum, m) => sum + m.volatility, 0) / mockMarkets.length,
    total_volume: mockMarkets.reduce((sum, m) => sum + m.volume, 0),
    total_market_cap: mockMarkets.reduce((sum, m) => sum + m.cap_usd, 0)
  };

  res.json({
    status: 'success',
    data: stats
  });
}

// Export markets to CSV
export function handleExportMarkets(req: Request, res: Response) {
  const {
    status,
    min_profitability,
    min_volume,
    sort = 'profitability',
    order = 'desc'
  } = req.query;

  let filteredMarkets = [...mockMarkets];

  // Apply same filters as the main endpoint
  if (status && typeof status === 'string') {
    const statusArray = status.split(',');
    filteredMarkets = filteredMarkets.filter(market => 
      statusArray.includes(market.status)
    );
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
  const sortField = sort as keyof MarketData;
  filteredMarkets.sort((a, b) => {
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

  // Generate CSV content
  const csvHeaders = [
    'Symbol',
    'Market Cap (USD)',
    'Volatility',
    'Profitability',
    'Volume',
    'Last Updated',
    'Created At',
    'Data Source',
    'Status'
  ].join(',');

  const csvRows = filteredMarkets.map(market => [
    market.symbol,
    market.cap_usd,
    market.volatility,
    market.profitability,
    market.volume,
    market.last_updated,
    market.created_at,
    market.data_source,
    market.status
  ].join(','));

  const csvContent = [csvHeaders, ...csvRows].join('\n');

  // Set CSV response headers
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `eligible-markets-${timestamp}.csv`;

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'X-Last-Refreshed': new Date().toISOString(),
    'X-Source': [...new Set(filteredMarkets.map(m => m.data_source))].join(', ')
  });

  res.send(csvContent);
}
