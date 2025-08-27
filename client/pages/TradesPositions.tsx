import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CandlestickChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Clock,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity
} from 'lucide-react';

// Types
interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl: number;
  timestamp: string;
  status: 'open' | 'closed';
  duration?: string;
}

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  timestamp: string;
  stopLoss?: number;
  takeProfit?: number;
}

// Mock data
const mockTrades: Trade[] = [
  {
    id: 'trade1',
    symbol: 'BTC/USDT',
    side: 'buy',
    quantity: 0.5,
    entryPrice: 42000,
    exitPrice: 43500,
    pnl: 750,
    timestamp: '2024-01-21T10:30:00Z',
    status: 'closed',
    duration: '2h 15m'
  },
  {
    id: 'trade2',
    symbol: 'ETH/USDT',
    side: 'sell',
    quantity: 2.5,
    entryPrice: 2800,
    exitPrice: 2650,
    pnl: 375,
    timestamp: '2024-01-21T08:45:00Z',
    status: 'closed',
    duration: '45m'
  },
  {
    id: 'trade3',
    symbol: 'SOL/USDT',
    side: 'buy',
    quantity: 100,
    entryPrice: 85,
    pnl: -250,
    timestamp: '2024-01-21T12:00:00Z',
    status: 'open'
  }
];

const mockPositions: Position[] = [
  {
    id: 'pos1',
    symbol: 'BTC/USDT',
    side: 'long',
    quantity: 0.25,
    entryPrice: 42500,
    currentPrice: 43200,
    unrealizedPnl: 175,
    realizedPnl: 0,
    timestamp: '2024-01-21T09:15:00Z',
    stopLoss: 41000,
    takeProfit: 45000
  },
  {
    id: 'pos2',
    symbol: 'ETH/USDT',
    side: 'short',
    quantity: 1.5,
    entryPrice: 2750,
    currentPrice: 2680,
    unrealizedPnl: 105,
    realizedPnl: 0,
    timestamp: '2024-01-21T11:30:00Z',
    stopLoss: 2850,
    takeProfit: 2600
  }
];

export default function TradesPositions() {
  const [activeTab, setActiveTab] = useState('trades');
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [positions, setPositions] = useState<Position[]>(mockPositions);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Calculate summary statistics
  const tradeStats = {
    totalTrades: trades.length,
    winningTrades: trades.filter(t => t.pnl > 0).length,
    totalPnL: trades.reduce((sum, t) => sum + t.pnl, 0),
    winRate: trades.length > 0 ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100 : 0
  };

  const positionStats = {
    totalPositions: positions.length,
    totalUnrealizedPnL: positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
    longPositions: positions.filter(p => p.side === 'long').length,
    shortPositions: positions.filter(p => p.side === 'short').length
  };

  // Filter and paginate data
  const filteredTrades = trades.filter(trade =>
    trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPositions = positions.filter(position =>
    position.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(
    (activeTab === 'trades' ? filteredTrades.length : filteredPositions.length) / itemsPerPage
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrades = filteredTrades.slice(startIndex, startIndex + itemsPerPage);
  const paginatedPositions = filteredPositions.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-accent' : 'text-destructive';
  };

  const getSideBadge = (side: 'buy' | 'sell' | 'long' | 'short') => {
    const isBullish = side === 'buy' || side === 'long';
    return (
      <Badge variant={isBullish ? "default" : "secondary"} 
             className={isBullish ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"}>
        {side.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trades & Positions</h1>
          <p className="text-muted-foreground">
            Monitor your trading activity and current positions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trades">Recent Trades</TabsTrigger>
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
        </TabsList>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {activeTab === 'trades' ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                  <CandlestickChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tradeStats.totalTrades}</div>
                  <p className="text-xs text-muted-foreground">
                    {tradeStats.winningTrades} winning trades
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getPnLColor(tradeStats.totalPnL)}`}>
                    {formatCurrency(tradeStats.totalPnL)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All closed trades
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">
                    {formatPercentage(tradeStats.winRate)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Success ratio
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Trade</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getPnLColor(tradeStats.totalPnL / Math.max(tradeStats.totalTrades, 1))}`}>
                    {formatCurrency(tradeStats.totalPnL / Math.max(tradeStats.totalTrades, 1))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per trade average
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{positionStats.totalPositions}</div>
                  <p className="text-xs text-muted-foreground">
                    Active positions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getPnLColor(positionStats.totalUnrealizedPnL)}`}>
                    {formatCurrency(positionStats.totalUnrealizedPnL)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unrealized gains/losses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Long Positions</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">{positionStats.longPositions}</div>
                  <p className="text-xs text-muted-foreground">
                    Bullish positions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Short Positions</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{positionStats.shortPositions}</div>
                  <p className="text-xs text-muted-foreground">
                    Bearish positions
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <TabsContent value="trades" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Trades</CardTitle>
                  <CardDescription>Your trading history and performance</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by symbol..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="font-medium">{trade.symbol}</div>
                      {getSideBadge(trade.side)}
                      <div className="text-sm text-muted-foreground">
                        {trade.quantity} @ {formatCurrency(trade.entryPrice)}
                      </div>
                      {trade.exitPrice && (
                        <div className="text-sm text-muted-foreground">
                          → {formatCurrency(trade.exitPrice)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`font-medium ${getPnLColor(trade.pnl)}`}>
                        {formatCurrency(trade.pnl)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {trade.duration || 'Open'}
                      </div>
                      <Badge variant={trade.status === 'closed' ? 'default' : 'secondary'}>
                        {trade.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTrades.length)} of {filteredTrades.length} trades
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Open Positions</CardTitle>
                  <CardDescription>Your current market positions</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by symbol..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedPositions.map((position) => (
                  <div key={position.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="font-medium">{position.symbol}</div>
                        {getSideBadge(position.side)}
                        <div className="text-sm text-muted-foreground">
                          {position.quantity} @ {formatCurrency(position.entryPrice)}
                        </div>
                      </div>
                      <div className={`font-medium ${getPnLColor(position.unrealizedPnl)}`}>
                        {formatCurrency(position.unrealizedPnl)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current Price:</span>
                        <div className="font-medium">{formatCurrency(position.currentPrice)}</div>
                      </div>
                      {position.stopLoss && (
                        <div>
                          <span className="text-muted-foreground">Stop Loss:</span>
                          <div className="font-medium text-destructive">{formatCurrency(position.stopLoss)}</div>
                        </div>
                      )}
                      {position.takeProfit && (
                        <div>
                          <span className="text-muted-foreground">Take Profit:</span>
                          <div className="font-medium text-accent">{formatCurrency(position.takeProfit)}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Opened:</span>
                        <div className="font-medium">{new Date(position.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {paginatedPositions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2" />
                  <p>No open positions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
