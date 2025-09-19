import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Briefcase,
  DollarSign,
  Users,
  BarChart3,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Clock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  ExternalLink
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types matching specification
interface PortfolioRecord {
  id: string;
  user_id: string;
  mode: 'live' | 'demo' | 'paper';
  total_balance: number;
  usdt_balance: number;
  hedged_balance: number;
  last_updated: string;
}

interface PortfolioResponse {
  total: number;
  items: PortfolioRecord[];
  next: number | null;
}

interface PortfolioStats {
  totalPortfolios: number;
  totalValue: number;
  totalUsdtBalance: number;
  totalHedgedBalance: number;
  modeDistribution: {
    live: number;
    demo: number;
    paper: number;
  };
  needsRebalancing: number;
  lastGlobalRebalance: string | null;
}

interface RebalanceEvent {
  id: string;
  timestamp: string;
  triggeredBy: string;
  reason: string;
  portfoliosAffected: number;
  totalValueRebalanced: number;
  status: 'completed' | 'failed' | 'in_progress';
  duration: number;
}

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

export default function AdminPortfolio() {
  // State
  const [portfolioData, setPortfolioData] = useState<PortfolioResponse | null>(null);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [rebalanceHistory, setRebalanceHistory] = useState<RebalanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [offset, setOffset] = useState(0);
  
  // Sorting
  const [sortField, setSortField] = useState<keyof PortfolioRecord>('total_balance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Rebalance form
  const [pricesJson, setPricesJson] = useState(`{
  "BTC/USDT": 43500.00,
  "ETH/USDT": 2650.00,
  "ADA/USDT": 0.48,
  "SOL/USDT": 98.50,
  "MATIC/USDT": 0.85
}`);
  
  const [returnsJson, setReturnsJson] = useState(`{
  "BTC/USDT": [0.02, -0.01, 0.03, 0.015, -0.008],
  "ETH/USDT": [0.015, 0.008, -0.012, 0.025, 0.002],
  "ADA/USDT": [-0.005, 0.012, -0.008, 0.018, -0.003],
  "SOL/USDT": [0.042, -0.015, 0.028, -0.005, 0.035],
  "MATIC/USDT": [0.018, 0.002, -0.015, 0.012, 0.008]
}`);

  const [jsonErrors, setJsonErrors] = useState({ prices: '', returns: '' });

  // Row-level details & rebalance drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PortfolioRecord | null>(null);
  const [rowPricesJson, setRowPricesJson] = useState<string>('{}');
  const [rowReturnsJson, setRowReturnsJson] = useState<string>('{}');
  const [rowAck, setRowAck] = useState<boolean>(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowIsSubmitting, setRowIsSubmitting] = useState(false);

  // Update URL query parameters
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (limit !== DEFAULT_PAGE_LIMIT) params.set('limit', limit.toString());
    if (offset > 0) params.set('offset', offset.toString());
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
  }, [limit, offset]);

  // Load URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLimit = params.get('limit');
    const urlOffset = params.get('offset');
    
    if (urlLimit) setLimit(Math.min(parseInt(urlLimit) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT));
    if (urlOffset) setOffset(Math.max(parseInt(urlOffset) || 0, 0));
  }, []);

  // Fetch portfolio data
  const fetchPortfolios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const response = await fetch(`/api/admin/portfolio?${params}`);
      
      if (response.status === 403) {
        setError('Access denied - admin role required');
        return;
      }
      
      if (response.status === 502) {
        setError('Server unavailable - please try again');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: PortfolioResponse = await response.json();
      setPortfolioData(data);
      updateUrl();
      
    } catch (error) {
      console.error('Failed to fetch portfolios:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch portfolios');
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset, updateUrl]);

  // Fetch portfolio statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/portfolio/stats');
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setStats(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch rebalance history
  const fetchRebalanceHistory = async () => {
    try {
      const response = await fetch('/api/admin/portfolio/rebalance-history');
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setRebalanceHistory(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rebalance history:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const loadData = async () => {
      await Promise.all([
        fetchPortfolios(),
        fetchStats(),
        fetchRebalanceHistory()
      ]);
    };
    loadData();
  }, [fetchPortfolios, user]);

  // Handle sorting
  const handleSort = (field: keyof PortfolioRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    
    // Sort current data
    if (portfolioData) {
      const sortedItems = [...portfolioData.items].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'desc' 
            ? bVal.localeCompare(aVal)
            : aVal.localeCompare(bVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        }
        
        return 0;
      });
      
      setPortfolioData({ ...portfolioData, items: sortedItems });
    }
  };

  // Handle pagination
  const handlePagination = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && offset > 0) {
      setOffset(Math.max(0, offset - limit));
    } else if (direction === 'next' && portfolioData?.next !== null) {
      setOffset(portfolioData.next);
    }
  };

  // Validate JSON inputs
  const validateJson = (jsonString: string, type: 'prices' | 'returns') => {
    try {
      const parsed = JSON.parse(jsonString);
      
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${type} must be an object`);
      }
      
      if (type === 'prices') {
        for (const [symbol, price] of Object.entries(parsed)) {
          if (typeof price !== 'number' || price <= 0) {
            throw new Error(`Invalid price for ${symbol}: must be a positive number`);
          }
        }
      } else {
        for (const [symbol, returns] of Object.entries(parsed)) {
          if (!Array.isArray(returns)) {
            throw new Error(`Invalid returns for ${symbol}: must be an array`);
          }
          for (const returnValue of returns) {
            if (typeof returnValue !== 'number') {
              throw new Error(`Invalid return value for ${symbol}: all values must be numbers`);
            }
          }
        }
      }
      
      setJsonErrors(prev => ({ ...prev, [type]: '' }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      setJsonErrors(prev => ({ ...prev, [type]: errorMessage }));
      return false;
    }
  };

  // Handle rebalance
  const handleRebalance = async () => {
    // Validate both JSON inputs
    const pricesValid = validateJson(pricesJson, 'prices');
    const returnsValid = validateJson(returnsJson, 'returns');
    
    if (!pricesValid || !returnsValid) {
      toast({
        title: "Validation Error",
        description: "Please fix JSON validation errors before proceeding",
        variant: "destructive"
      });
      return;
    }

    setIsRebalancing(true);
    
    try {
      const response = await fetch('/api/admin/portfolio/rebalance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prices: JSON.parse(pricesJson),
          returns: JSON.parse(returnsJson),
          actor: 'admin@example.com'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: "Rebalance Started",
        description: `Rebalancing ${result.rebalanced} portfolios`,
      });
      
      // Refresh data after a delay
      setTimeout(async () => {
        await Promise.all([
          fetchPortfolios(),
          fetchStats(),
          fetchRebalanceHistory()
        ]);
        
        toast({
          title: "Rebalance Complete",
          description: `Successfully rebalanced ${result.rebalanced} portfolios`,
        });
      }, 3000);
      
    } catch (error) {
      toast({
        title: "Rebalance Failed",
        description: error instanceof Error ? error.message : "Failed to start rebalance",
        variant: "destructive"
      });
    } finally {
      setIsRebalancing(false);
    }
  };

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getModeBadge = (mode: string) => {
    const variants = {
      'live': { variant: 'default' as const, color: 'text-green-600' },
      'demo': { variant: 'secondary' as const, color: 'text-blue-600' },
      'paper': { variant: 'outline' as const, color: 'text-gray-600' }
    };

    const config = variants[mode as keyof typeof variants] || variants.paper;
    return (
      <Badge variant={config.variant} className={`${config.color} font-medium`}>
        {mode.toUpperCase()}
      </Badge>
    );
  };

  const getSortIcon = (field: keyof PortfolioRecord) => {
    if (sortField !== field) return null;
    return sortOrder === 'desc' ? 
      <ChevronDown className="h-4 w-4" /> : 
      <ChevronUp className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'completed': { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      'failed': { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      'in_progress': { variant: 'outline' as const, icon: Activity, color: 'text-blue-600' }
    };

    const config = variants[status as keyof typeof variants] || variants.completed;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  // Guard unauthorized
  if (!user || user.role !== 'admin') {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Admin access required. You do not have permission to view portfolio data. Please navigate back to your dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error handling
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
            <p className="text-muted-foreground">Admin overview of all portfolios and rebalancing operations</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
          <p className="text-muted-foreground">
            Aggregated view of all user portfolios with system-wide rebalancing controls
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              fetchPortfolios();
              fetchStats();
              fetchRebalanceHistory();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      {portfolioData && (
        <Alert>
          <Briefcase className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>Total Portfolios:</strong> {portfolioData.total} 
                {stats && ` • ${stats.needsRebalancing} need rebalancing`}
              </span>
              <span className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + limit, portfolioData.total)} of {portfolioData.total}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                Combined portfolio value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">USDT Balance</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalUsdtBalance)}</div>
              <p className="text-xs text-muted-foreground">
                Available for trading
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hedged Balance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalHedgedBalance)}</div>
              <p className="text-xs text-muted-foreground">
                Protected positions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Portfolios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.modeDistribution.live + stats.modeDistribution.demo}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.modeDistribution.live} live, {stats.modeDistribution.demo} demo
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Portfolios Overview Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolios Overview</CardTitle>
              <CardDescription>
                Click column headers to sort. Use pagination controls to navigate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : portfolioData ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('id')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>ID</span>
                              {getSortIcon('id')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('user_id')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>User ID</span>
                              {getSortIcon('user_id')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('mode')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Mode</span>
                              {getSortIcon('mode')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('total_balance')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Total Balance</span>
                              {getSortIcon('total_balance')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('usdt_balance')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>USDT Balance</span>
                              {getSortIcon('usdt_balance')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('hedged_balance')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Hedged Balance</span>
                              {getSortIcon('hedged_balance')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('last_updated')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Last Updated</span>
                              {getSortIcon('last_updated')}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {portfolioData.items.length > 0 ? (
                          portfolioData.items.map((portfolio) => (
                            <TableRow key={portfolio.id} className="hover:bg-muted/50">
                              <TableCell className="font-mono text-sm">{portfolio.id}</TableCell>
                              <TableCell className="font-mono text-sm">{portfolio.user_id}</TableCell>
                              <TableCell>{getModeBadge(portfolio.mode)}</TableCell>
                              <TableCell className="font-bold">{formatCurrency(portfolio.total_balance)}</TableCell>
                              <TableCell>{formatCurrency(portfolio.usdt_balance)}</TableCell>
                              <TableCell>{formatCurrency(portfolio.hedged_balance)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(portfolio.last_updated).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="text-muted-foreground">
                                <Briefcase className="h-8 w-8 mx-auto mb-2" />
                                <p>No portfolios found</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {portfolioData.total > limit && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {offset + 1}-{Math.min(offset + limit, portfolioData.total)} of {portfolioData.total}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePagination('prev')}
                          disabled={offset === 0}
                        >
                          <ArrowUp className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePagination('next')}
                          disabled={portfolioData.next === null}
                        >
                          Next
                          <ArrowDown className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Rebalance Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Rebalance Controls</span>
              </CardTitle>
              <CardDescription>
                Trigger system-wide portfolio rebalancing with current market data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isRebalancing && (
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>Rebalancing in progress...</div>
                      <Progress value={75} className="w-full" />
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="pricesJson">Prices JSON Input</Label>
                <Textarea
                  id="pricesJson"
                  placeholder="Enter asset prices as JSON object..."
                  value={pricesJson}
                  onChange={(e) => {
                    setPricesJson(e.target.value);
                    if (jsonErrors.prices) validateJson(e.target.value, 'prices');
                  }}
                  onBlur={() => validateJson(pricesJson, 'prices')}
                  rows={6}
                  className={`font-mono text-sm ${jsonErrors.prices ? 'border-red-500' : ''}`}
                />
                {jsonErrors.prices && (
                  <p className="text-xs text-red-500">{jsonErrors.prices}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Format: {"{"}"SYMBOL/USDT": price, ...{"}"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="returnsJson">Returns JSON Input</Label>
                <Textarea
                  id="returnsJson"
                  placeholder="Enter historical returns as JSON object..."
                  value={returnsJson}
                  onChange={(e) => {
                    setReturnsJson(e.target.value);
                    if (jsonErrors.returns) validateJson(e.target.value, 'returns');
                  }}
                  onBlur={() => validateJson(returnsJson, 'returns')}
                  rows={6}
                  className={`font-mono text-sm ${jsonErrors.returns ? 'border-red-500' : ''}`}
                />
                {jsonErrors.returns && (
                  <p className="text-xs text-red-500">{jsonErrors.returns}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Format: {"{"}"SYMBOL/USDT": [return1, return2, ...], ...{"}"}
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    disabled={isRebalancing || !!jsonErrors.prices || !!jsonErrors.returns}
                  >
                    {isRebalancing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Rebalancing...
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-2" />
                        Rebalance Portfolios
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm System-Wide Rebalance</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will trigger a rebalance across all active portfolios using the provided prices and returns data. This action cannot be undone.
                    </AlertDialogDescription>
                    {stats && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="text-sm space-y-1">
                          <div><strong>Active portfolios:</strong> {stats.modeDistribution.live + stats.modeDistribution.demo}</div>
                          <div><strong>Total value:</strong> {formatCurrency(stats.totalValue)}</div>
                        </div>
                      </div>
                    )}
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRebalance}>
                      Confirm Rebalance
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Recent Rebalances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Recent Rebalances</span>
              </CardTitle>
              <CardDescription>
                History of recent rebalancing operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rebalanceHistory.length > 0 ? (
                  rebalanceHistory.slice(0, 5).map((event) => (
                    <div key={event.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">{event.reason}</div>
                        {getStatusBadge(event.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Portfolios: {event.portfoliosAffected}</div>
                        <div>Value: {formatCurrency(event.totalValueRebalanced)}</div>
                        <div>By: {event.triggeredBy}</div>
                        <div>Duration: {event.duration ? `${(event.duration / 1000).toFixed(1)}s` : 'N/A'}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>No recent rebalances</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
