import { RequestHandler } from "express";

export interface Trade {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  fee_cost: number;
  slippage_cost: number;
  pnl: number;
  net_pnl: number;
  timestamp: string;
  status: 'pending' | 'executed' | 'failed';
  trade_id: string;
}

export interface RecentTradesResponse {
  total: number;
  items: Trade[];
  next: string | null;
  total_pnl: number;
  win_rate: number;
  fee_threshold: number;
  supabase_degraded?: boolean;
}

export interface Position {
  id: string;
  symbol: string;
  amount: number;
  entry_price: number;
  current_price?: number;
  fee_cost: number;
  slippage_cost: number;
  pnl: number;
  net_pnl: number;
  timestamp: string;
}

export interface OpenPositionsResponse {
  total: number;
  items: Position[];
  next: string | null;
  total_pnl: number;
  fee_threshold: number;
  supabase_degraded?: boolean;
}

export interface VetoTradeRequest {
  symbol: string;
  trade_id: string;
}

// Mock trades data
const mockTrades: Trade[] = [
  {
    id: 'trade_001',
    symbol: 'BTC/USDT',
    action: 'buy',
    amount: 0.5,
    price: 43250.00,
    fee_cost: 21.62,
    slippage_cost: 15.50,
    pnl: 875.00,
    net_pnl: 837.88,
    timestamp: '2024-01-21T14:30:00Z',
    status: 'executed',
    trade_id: 'BTC_001_20240121'
  },
  {
    id: 'trade_002',
    symbol: 'ETH/USDT',
    action: 'sell',
    amount: 2.5,
    price: 2680.00,
    fee_cost: 6.70,
    slippage_cost: 8.20,
    pnl: 425.00,
    net_pnl: 410.10,
    timestamp: '2024-01-21T13:15:00Z',
    status: 'executed',
    trade_id: 'ETH_002_20240121'
  },
  {
    id: 'trade_003',
    symbol: 'SOL/USDT',
    action: 'buy',
    amount: 100,
    price: 95.50,
    fee_cost: 4.77,
    slippage_cost: 12.30,
    pnl: -180.00,
    net_pnl: -197.07,
    timestamp: '2024-01-21T12:45:00Z',
    status: 'executed',
    trade_id: 'SOL_003_20240121'
  },
  {
    id: 'trade_004',
    symbol: 'ADA/USDT',
    action: 'buy',
    amount: 1000,
    price: 0.485,
    fee_cost: 2.42,
    slippage_cost: 3.15,
    pnl: 65.00,
    net_pnl: 59.43,
    timestamp: '2024-01-21T11:20:00Z',
    status: 'executed',
    trade_id: 'ADA_004_20240121'
  },
  {
    id: 'trade_005',
    symbol: 'AVAX/USDT',
    action: 'sell',
    amount: 25,
    price: 38.20,
    fee_cost: 0.95,
    slippage_cost: 1.50,
    pnl: -45.00,
    net_pnl: -47.45,
    timestamp: '2024-01-21T10:30:00Z',
    status: 'pending',
    trade_id: 'AVAX_005_20240121'
  }
];

// Mock positions data
const mockPositions: Position[] = [
  {
    id: 'pos_001',
    symbol: 'BTC/USDT',
    amount: 0.25,
    entry_price: 42800.00,
    current_price: 43250.00,
    fee_cost: 10.70,
    slippage_cost: 8.50,
    pnl: 112.50,
    net_pnl: 93.30,
    timestamp: '2024-01-21T09:15:00Z'
  },
  {
    id: 'pos_002',
    symbol: 'ETH/USDT',
    amount: 1.5,
    entry_price: 2720.00,
    current_price: 2680.00,
    fee_cost: 4.08,
    slippage_cost: 6.20,
    pnl: -60.00,
    net_pnl: -70.28,
    timestamp: '2024-01-21T08:45:00Z'
  },
  {
    id: 'pos_003',
    symbol: 'SOL/USDT',
    amount: 50,
    entry_price: 98.20,
    current_price: 95.50,
    fee_cost: 2.45,
    slippage_cost: 3.80,
    pnl: -135.00,
    net_pnl: -141.25,
    timestamp: '2024-01-21T07:30:00Z'
  }
];

export const handleGetRecentTrades: RequestHandler = (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 25;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Sort by timestamp (most recent first)
    const sortedTrades = [...mockTrades].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const paginatedTrades = sortedTrades.slice(offset, offset + limit);
    const hasNext = offset + limit < sortedTrades.length;
    
    // Calculate summary statistics
    const total_pnl = sortedTrades.reduce((sum, trade) => sum + trade.net_pnl, 0);
    const winningTrades = sortedTrades.filter(trade => trade.net_pnl > 0).length;
    const win_rate = sortedTrades.length > 0 ? (winningTrades / sortedTrades.length) * 100 : 0;
    const fee_threshold = 50.0; // Configurable threshold
    
    const response: RecentTradesResponse = {
      total: sortedTrades.length,
      items: paginatedTrades,
      next: hasNext ? `?limit=${limit}&offset=${offset + limit}` : null,
      total_pnl,
      win_rate,
      fee_threshold,
      supabase_degraded: Math.random() < 0.05
    };
    
    res.json(response);
  } catch (error) {
    console.error('Get recent trades error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleGetOpenPositions: RequestHandler = (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 25;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Sort by timestamp (most recent first)
    const sortedPositions = [...mockPositions].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const paginatedPositions = sortedPositions.slice(offset, offset + limit);
    const hasNext = offset + limit < sortedPositions.length;
    
    // Calculate summary statistics
    const total_pnl = sortedPositions.reduce((sum, position) => sum + position.net_pnl, 0);
    const fee_threshold = 50.0; // Configurable threshold
    
    const response: OpenPositionsResponse = {
      total: sortedPositions.length,
      items: paginatedPositions,
      next: hasNext ? `?limit=${limit}&offset=${offset + limit}` : null,
      total_pnl,
      fee_threshold,
      supabase_degraded: Math.random() < 0.05
    };
    
    res.json(response);
  } catch (error) {
    console.error('Get open positions error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleVetoTrade: RequestHandler = (req, res) => {
  try {
    const { symbol, trade_id } = req.body as VetoTradeRequest;
    
    if (!symbol || !trade_id) {
      return res.status(400).json({
        error: 'Symbol and trade_id are required'
      });
    }
    
    // Find the trade
    const tradeIndex = mockTrades.findIndex(trade => 
      trade.symbol === symbol && trade.trade_id === trade_id
    );
    
    if (tradeIndex === -1) {
      return res.status(404).json({
        error: 'Trade not found'
      });
    }
    
    const trade = mockTrades[tradeIndex];
    
    // Check if trade is in pending status (can only veto pending trades)
    if (trade.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only veto pending trades'
      });
    }
    
    // Simulate founder approval requirement (mock implementation)
    const requiresFounderApproval = Math.random() > 0.7; // 30% chance of requiring founder approval
    
    if (requiresFounderApproval) {
      return res.status(403).json({
        error: 'Founder approvals required'
      });
    }
    
    // Simulate network/server errors occasionally
    const networkError = Math.random() > 0.95; // 5% chance of network error
    
    if (networkError) {
      return res.status(502).json({
        error: 'Network error. Please try again.'
      });
    }
    
    // Update trade status to failed (vetoed)
    mockTrades[tradeIndex] = {
      ...trade,
      status: 'failed'
    };
    
    res.json({
      message: 'Trade vetoed successfully',
      trade_id,
      symbol
    });
  } catch (error) {
    console.error('Veto trade error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// GET /api/trades/:id - diagnostics and detail
export const handleGetTradeDetail: RequestHandler = (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ status:'error', error:'id required' });
    const t = mockTrades.find(tr => tr.id === id || tr.trade_id === id);
    if (!t) return res.status(404).json({ status:'error', error:'trade not found' });
    const detail: any = { ...t };
    if (t.status === 'failed') {
      detail.rejection_reasons = [
        'Kill-switch active at request time',
        'Insufficient free balance',
        'Upstream price feed timeout'
      ].slice(0, 1 + Math.floor(Math.random()*3));
    }
    res.json({ status:'success', data: detail });
  } catch (e) {
    res.status(500).json({ status:'error', error:'internal error' });
  }
};
