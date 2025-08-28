import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CandlestickChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Ban,
  Info,
  LineChart
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// Types
interface Trade {
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

interface Position {
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

interface RecentTradesResponse {
  total: number;
  items: Trade[];
  next: string | null;
  total_pnl: number;
  win_rate: number;
  fee_threshold: number;
}

interface OpenPositionsResponse {
  total: number;
  items: Position[];
  next: string | null;
  total_pnl: number;
  fee_threshold: number;
}

type SortField = 'timestamp' | 'net_pnl' | 'symbol';
type SortDirection = 'asc' | 'desc';

export default function TradesPositions() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('trades');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradesTotal, setTradesTotal] = useState(0);
  const [positionsTotal, setPositionsTotal] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [feeThreshold, setFeeThreshold] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [vetoingTrades, setVetoingTrades] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === 'admin';

  // Calculate cumulative PnL for chart
  const cumulativePnLData = useMemo(() => {
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    let cumulative = 0;
    return sortedTrades.map((trade, index) => {
      cumulative += trade.net_pnl;
      return {
        index: index + 1,
        cumulative,
        trade_id: trade.trade_id,
        timestamp: trade.timestamp
      };
    });
  }, [trades]);

  const fetchTrades = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await fetch(`/api/trades/recent?limit=${itemsPerPage}&offset=${offset}`, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: RecentTradesResponse = await response.json();
      setTrades(data.items);
      setTradesTotal(data.total);
      setTotalPnL(data.total_pnl);
      setWinRate(data.win_rate);
      setFeeThreshold(data.fee_threshold);
      setNextPage(data.next);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
      setError('Failed to load trades. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage]);

  const fetchPositions = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await fetch(`/api/positions/open?limit=${itemsPerPage}&offset=${offset}`, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: OpenPositionsResponse = await response.json();
      setPositions(data.items);
      setPositionsTotal(data.total);
      setTotalPnL(data.total_pnl);
      setFeeThreshold(data.fee_threshold);
      setNextPage(data.next);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      setError('Failed to load positions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage]);

  const handleVetoTrade = async (symbol: string, tradeId: string) => {
    setVetoingTrades(prev => new Set(prev).add(tradeId));
    
    try {
      const response = await fetch('/api/admin/trades/veto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, trade_id: tradeId }),
      });

      if (response.status === 403) {
        toast({
          title: "Founder Approval Required",
          description: "This action requires founder approvals.",
          variant: "destructive",
        });
        return;
      }

      if (response.status === 502) {
        toast({
          title: "Network Error",
          description: "Please try again.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => handleVetoTrade(symbol, tradeId)}>
              Retry
            </Button>
          ),
        });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      toast({
        title: "Trade Vetoed",
        description: `Successfully vetoed trade ${tradeId}`,
      });

      // Refresh trades data
      fetchTrades(currentPage);
    } catch (error) {
      console.error('Failed to veto trade:', error);
      toast({
        title: "Error",
        description: "Failed to veto trade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVetoingTrades(prev => {
        const newSet = new Set(prev);
        newSet.delete(tradeId);
        return newSet;
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'trades') {
      fetchTrades(currentPage);
    } else {
      fetchPositions(currentPage);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (activeTab === 'trades') {
      fetchTrades(newPage);
    } else {
      fetchPositions(newPage);
    }
  };

  useEffect(() => {
    if (activeTab === 'trades') {
      fetchTrades(1);
      setCurrentPage(1);
    } else {
      fetchPositions(1);
      setCurrentPage(1);
    }
  }, [activeTab, fetchTrades, fetchPositions]);

  // Filter and sort data
  const filteredTrades = useMemo(() => {
    let filtered = trades.filter(trade =>
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.trade_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'timestamp':
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case 'net_pnl':
          aVal = a.net_pnl;
          bVal = b.net_pnl;
          break;
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [trades, searchTerm, sortField, sortDirection]);

  const filteredPositions = useMemo(() => {
    let filtered = positions.filter(position =>
      position.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'timestamp':
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case 'net_pnl':
          aVal = a.net_pnl;
          bVal = b.net_pnl;
          break;
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [positions, searchTerm, sortField, sortDirection]);

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
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getActionBadge = (action: 'buy' | 'sell') => {
    return (
      <Badge variant={action === 'buy' ? "default" : "secondary"} 
             className={action === 'buy' ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
        {action.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      executed: { variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200' },
      pending: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      failed: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800 border-red-200' }
    };
    const config = variants[status as keyof typeof variants] || variants.executed;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const totalPages = Math.ceil((activeTab === 'trades' ? tradesTotal : positionsTotal) / itemsPerPage);
  const currentItems = activeTab === 'trades' ? filteredTrades : filteredPositions;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trades & Positions</h1>
            <p className="text-muted-foreground">
              Monitor your trading activity and current positions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Activity className="h-3 w-3 mr-1" />
              Live Data
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
                    <div className="text-2xl font-bold">{tradesTotal}</div>
                    <p className="text-xs text-muted-foreground">
                      {trades.filter(t => t.net_pnl > 0).length} winning trades
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getPnLColor(totalPnL)}`}>
                      {formatCurrency(totalPnL)}
                    </div>
                    <p className="text-xs text-muted-foreground">All trades</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(winRate)}
                    </div>
                    <p className="text-xs text-muted-foreground">Success ratio</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fee Threshold</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Maximum acceptable fee cost per trade</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(feeThreshold)}
                    </div>
                    <p className="text-xs text-muted-foreground">Fee limit</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{positionsTotal}</div>
                    <p className="text-xs text-muted-foreground">Active positions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getPnLColor(totalPnL)}`}>
                      {formatCurrency(totalPnL)}
                    </div>
                    <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fee Threshold</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Position fee limit indicator</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(feeThreshold)}
                    </div>
                    <p className="text-xs text-muted-foreground">Fee limit</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">High Fee Count</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {positions.filter(p => p.fee_cost > feeThreshold).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Above threshold</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <TabsContent value="trades" className="space-y-6">
            {/* PnL Chart */}
            {cumulativePnLData.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Cumulative P&L</CardTitle>
                    <CardDescription>Performance over time</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <LineChart className="h-4 w-4 mr-1" />
                    Export Chart
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={cumulativePnLData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="index" />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [formatCurrency(value as number), 'Cumulative P&L']}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              const data = payload[0].payload;
                              return `Trade ${data.index}: ${data.trade_id}`;
                            }
                            return `Trade ${label}`;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cumulative" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          dot={{ fill: '#2563eb', strokeWidth: 2, r: 3 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

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
                        placeholder="Search symbol or trade ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('symbol')}>
                          <div className="flex items-center space-x-1">
                            <span>Symbol</span>
                            {getSortIcon('symbol')}
                          </div>
                        </TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Fee Cost</TableHead>
                        <TableHead>Slippage</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('net_pnl')}>
                          <div className="flex items-center space-x-1">
                            <span>Net P&L</span>
                            {getSortIcon('net_pnl')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('timestamp')}>
                          <div className="flex items-center space-x-1">
                            <span>Time</span>
                            {getSortIcon('timestamp')}
                          </div>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        {isAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{trade.symbol}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(trade.symbol)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{getActionBadge(trade.action)}</TableCell>
                          <TableCell>{trade.amount}</TableCell>
                          <TableCell>{formatCurrency(trade.price)}</TableCell>
                          <TableCell>
                            <span className={trade.fee_cost > feeThreshold ? 'text-red-600 font-medium' : ''}>
                              {formatCurrency(trade.fee_cost)}
                              {trade.fee_cost > feeThreshold && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-3 w-3 ml-1 inline" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Exceeds fee threshold</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>{formatCurrency(trade.slippage_cost)}</TableCell>
                          <TableCell className={getPnLColor(trade.pnl)}>
                            {formatCurrency(trade.pnl)}
                          </TableCell>
                          <TableCell className={`font-medium ${getPnLColor(trade.net_pnl)}`}>
                            {formatCurrency(trade.net_pnl)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(trade.status)}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              {trade.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVetoTrade(trade.symbol, trade.trade_id)}
                                  disabled={vetoingTrades.has(trade.trade_id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Ban className="h-3 w-3 mr-1" />
                                  {vetoingTrades.has(trade.trade_id) ? 'Vetoing...' : 'Veto'}
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {filteredTrades.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CandlestickChart className="h-8 w-8 mx-auto mb-2" />
                    <p>No trades found</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, tradesTotal)} of {tradesTotal} trades
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                      >
                        Next
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
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('symbol')}>
                          <div className="flex items-center space-x-1">
                            <span>Symbol</span>
                            {getSortIcon('symbol')}
                          </div>
                        </TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>Fee Cost</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('net_pnl')}>
                          <div className="flex items-center space-x-1">
                            <span>Net P&L</span>
                            {getSortIcon('net_pnl')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('timestamp')}>
                          <div className="flex items-center space-x-1">
                            <span>Opened</span>
                            {getSortIcon('timestamp')}
                          </div>
                        </TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPositions.map((position) => (
                        <TableRow key={position.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{position.symbol}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(position.symbol)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{position.amount}</TableCell>
                          <TableCell>{formatCurrency(position.entry_price)}</TableCell>
                          <TableCell>
                            {position.current_price ? formatCurrency(position.current_price) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className={position.fee_cost > feeThreshold ? 'text-red-600 font-medium' : ''}>
                              {formatCurrency(position.fee_cost)}
                              {position.fee_cost > feeThreshold && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-3 w-3 ml-1 inline" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>High fee exposure</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className={getPnLColor(position.pnl)}>
                            {formatCurrency(position.pnl)}
                          </TableCell>
                          <TableCell className={`font-medium ${getPnLColor(position.net_pnl)}`}>
                            {formatCurrency(position.net_pnl)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(position.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {position.fee_cost > feeThreshold ? (
                              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                                HIGH
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                NORMAL
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {filteredPositions.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2" />
                    <p>No open positions found</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, positionsTotal)} of {positionsTotal} positions
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
