import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Briefcase,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Search,
  Eye,
  Settings,
  Clock,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  PieChart
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  duration: number;
}

interface PortfolioStats {
  totalPortfolios: number;
  totalValue: number;
  avgPerformance24h: number;
  avgPerformance7d: number;
  totalAssets: number;
  avgAssetsPerPortfolio: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  needsRebalancing: number;
  lastGlobalRebalance: string | null;
}

interface Metadata {
  total: number;
  limit: number;
  offset: number;
  summary: {
    totalPortfolios: number;
    totalValue: number;
    avgPerformance24h: number;
    totalAssets: number;
  };
}

export default function AdminPortfolio() {
  const [portfolios, setPortfolios] = useState<PortfolioOverview[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioDetails | null>(null);
  const [rebalanceHistory, setRebalanceHistory] = useState<RebalanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [rebalanceProgress, setRebalanceProgress] = useState(0);
  const [currentRebalanceId, setCurrentRebalanceId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Table controls
  const [filters, setFilters] = useState({
    search: '',
    sort: 'totalValue',
    order: 'desc' as 'asc' | 'desc',
    limit: 20,
    offset: 0
  });

  // Rebalance form
  const [rebalanceForm, setRebalanceForm] = useState({
    pricesJson: '{\n  "BTC": 43500.00,\n  "ETH": 2650.00,\n  "ADA": 0.48,\n  "SOL": 98.50\n}',
    returnsJson: '{\n  "BTC": 0.028,\n  "ETH": 0.015,\n  "ADA": -0.005,\n  "SOL": 0.042\n}'
  });

  // Fetch portfolios
  const fetchPortfolios = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search: filters.search,
        sort: filters.sort,
        order: filters.order,
        limit: filters.limit.toString(),
        offset: filters.offset.toString()
      });

      const response = await fetch(`/api/admin/portfolio?${params}`);
      const data = await response.json();

      if (data.status === 'success') {
        setPortfolios(data.data);
        setMetadata(data.metadata);
      } else {
        throw new Error(data.message || 'Failed to fetch portfolios');
      }
    } catch (error) {
      console.error('Failed to fetch portfolios:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch portfolio data",
        variant: "destructive"
      });
    }
  }, [filters]);

  // Fetch portfolio statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/portfolio/stats');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch portfolio statistics",
        variant: "destructive"
      });
    }
  }, []);

  // Fetch rebalance history
  const fetchRebalanceHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/portfolio/rebalance-history');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setRebalanceHistory(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch rebalance history');
      }
    } catch (error) {
      console.error('Failed to fetch rebalance history:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch rebalance history",
        variant: "destructive"
      });
    }
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    if (isLoading || isRefreshing) return; // Prevent concurrent calls

    setIsLoading(true);
    try {
      // Load data sequentially to prevent potential race conditions
      await fetchPortfolios();
      await fetchStats();
      await fetchRebalanceHistory();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPortfolios, fetchStats, fetchRebalanceHistory, isLoading, isRefreshing]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (isLoading || isRefreshing) return; // Prevent concurrent calls

    setIsRefreshing(true);
    try {
      // Load data sequentially to prevent potential race conditions
      await fetchPortfolios();
      await fetchStats();
      await fetchRebalanceHistory();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPortfolios, fetchStats, fetchRebalanceHistory, isLoading, isRefreshing]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [filters]); // Only re-run when filters change

  // Handle row click to show details
  const handleRowClick = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/portfolio/${userId}`);
      const data = await response.json();

      if (data.status === 'success') {
        setSelectedPortfolio(data.data);
        setIsDetailsDialogOpen(true);
      } else {
        throw new Error(data.message || 'Failed to fetch portfolio details');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch portfolio details",
        variant: "destructive"
      });
    }
  };

  // Handle sorting
  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sort: field,
      order: prev.sort === field && prev.order === 'desc' ? 'asc' : 'desc',
      offset: 0
    }));
  };

  // Handle search
  const handleSearch = (search: string) => {
    setFilters(prev => ({
      ...prev,
      search,
      offset: 0
    }));
  };

  // Handle pagination
  const handlePagination = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && filters.offset > 0) {
      setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
    } else if (direction === 'next' && metadata && filters.offset + filters.limit < metadata.total) {
      setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }));
    }
  };

  // Handle global rebalance
  const handleGlobalRebalance = async () => {
    // Validate JSON
    try {
      JSON.parse(rebalanceForm.pricesJson);
      JSON.parse(rebalanceForm.returnsJson);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your prices and returns JSON format",
        variant: "destructive"
      });
      return;
    }

    setIsRebalancing(true);
    setRebalanceProgress(0);

    try {
      const response = await fetch('/api/admin/portfolio/rebalance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pricesJson: rebalanceForm.pricesJson,
          returnsJson: rebalanceForm.returnsJson,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setCurrentRebalanceId(data.data.rebalanceId);
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setRebalanceProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return 95;
            }
            return prev + Math.random() * 15;
          });
        }, 500);

        // Check for completion
        setTimeout(async () => {
          clearInterval(progressInterval);
          setRebalanceProgress(100);

          // Refresh data
          await refreshData();

          setIsRebalancing(false);
          setRebalanceProgress(0);
          setCurrentRebalanceId(null);

          toast({
            title: "Rebalance Complete",
            description: `Successfully rebalanced ${data.data.portfoliosAffected} portfolios`,
          });
        }, 5000);

        toast({
          title: "Rebalance Started",
          description: `Rebalancing ${data.data.portfoliosAffected} portfolios`,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setIsRebalancing(false);
      setRebalanceProgress(0);
      toast({
        title: "Rebalance Failed",
        description: error instanceof Error ? error.message : "Failed to start rebalance",
        variant: "destructive"
      });
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

  const formatPercentage = (value: number) => {
    const formatted = `${(value * 100).toFixed(2)}%`;
    return value >= 0 ? `+${formatted}` : formatted;
  };

  const getRiskBadge = (risk: string) => {
    const variants = {
      'low': { variant: 'secondary' as const, color: 'text-green-600' },
      'medium': { variant: 'outline' as const, color: 'text-yellow-600' },
      'high': { variant: 'destructive' as const, color: 'text-red-600' }
    };
    
    const config = variants[risk as keyof typeof variants];
    return (
      <Badge variant={config.variant}>
        <span className={config.color}>{risk.toUpperCase()}</span>
      </Badge>
    );
  };

  const getPerformanceColor = (performance: number) => {
    return performance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPerformanceIcon = (performance: number) => {
    return performance >= 0 ? TrendingUp : TrendingDown;
  };

  const getSortIcon = (field: string) => {
    if (filters.sort !== field) return null;
    return filters.order === 'desc' ? 
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
          <p className="text-muted-foreground">
            Admin overview of all portfolios and rebalancing operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={isLoading || isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPortfolios}</div>
              <p className="text-xs text-muted-foreground">
                {stats.needsRebalancing} need rebalancing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                Across all portfolios
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(stats.avgPerformance24h)}`}>
                {formatPercentage(stats.avgPerformance24h)}
              </div>
              <p className="text-xs text-muted-foreground">
                24h performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
              <p className="text-xs text-muted-foreground">
                {stats.avgAssetsPerPortfolio.toFixed(1)} avg per portfolio
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Portfolio Overview Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Portfolio Overview</CardTitle>
                  <CardDescription>
                    Click on any row to view detailed portfolio information
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search portfolios..."
                    value={filters.search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('userId')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>User ID</span>
                          {getSortIcon('userId')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('userName')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>User Name</span>
                          {getSortIcon('userName')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('totalValue')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Total Value</span>
                          {getSortIcon('totalValue')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('assetsCount')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Assets</span>
                          {getSortIcon('assetsCount')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('performance24h')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>24h Performance</span>
                          {getSortIcon('performance24h')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('lastRebalanced')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Last Rebalanced</span>
                          {getSortIcon('lastRebalanced')}
                        </div>
                      </TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolios.length > 0 ? (
                      portfolios.map((portfolio) => {
                        const PerformanceIcon = getPerformanceIcon(portfolio.performance24h);
                        return (
                          <TableRow 
                            key={portfolio.userId}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(portfolio.userId)}
                          >
                            <TableCell className="font-mono text-sm">{portfolio.userId}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{portfolio.userName}</div>
                                <div className="text-sm text-muted-foreground">{portfolio.email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-bold">{formatCurrency(portfolio.totalValue)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{portfolio.assetsCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center space-x-1 ${getPerformanceColor(portfolio.performance24h)}`}>
                                <PerformanceIcon className="h-4 w-4" />
                                <span className="font-medium">{formatPercentage(portfolio.performance24h)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(portfolio.lastRebalanced).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{getRiskBadge(portfolio.riskLevel)}</TableCell>
                          </TableRow>
                        );
                      })
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

              {/* Pagination */}
              {metadata && metadata.total > filters.limit && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {metadata.offset + 1}-{Math.min(metadata.offset + metadata.limit, metadata.total)} of {metadata.total} portfolios
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePagination('prev')}
                      disabled={filters.offset === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePagination('next')}
                      disabled={filters.offset + filters.limit >= metadata.total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rebalance Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Global Rebalance</span>
              </CardTitle>
              <CardDescription>
                Trigger system-wide portfolio rebalancing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isRebalancing && (
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Rebalancing in progress...</span>
                        <span className="text-sm">{Math.round(rebalanceProgress)}%</span>
                      </div>
                      <Progress value={rebalanceProgress} className="w-full" />
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="pricesJson">Prices JSON</Label>
                <Textarea
                  id="pricesJson"
                  placeholder="Enter current asset prices..."
                  value={rebalanceForm.pricesJson}
                  onChange={(e) => setRebalanceForm(prev => ({ ...prev, pricesJson: e.target.value }))}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="returnsJson">Returns JSON</Label>
                <Textarea
                  id="returnsJson"
                  placeholder="Enter expected returns..."
                  value={rebalanceForm.returnsJson}
                  onChange={(e) => setRebalanceForm(prev => ({ ...prev, returnsJson: e.target.value }))}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={isRebalancing}>
                    {isRebalancing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Rebalancing...
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-2" />
                        Rebalance All Portfolios
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Global Rebalance</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will trigger a rebalance across all portfolios using the provided prices and returns data. 
                      This action cannot be undone and may take several minutes to complete.
                      {stats && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="text-sm space-y-1">
                            <div><strong>Portfolios to rebalance:</strong> {stats.totalPortfolios}</div>
                            <div><strong>Total value:</strong> {formatCurrency(stats.totalValue)}</div>
                            <div><strong>Estimated duration:</strong> 5-10 minutes</div>
                          </div>
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGlobalRebalance}>
                      Confirm Rebalance
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Rebalance History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Recent Rebalances</span>
              </CardTitle>
              <CardDescription>
                History of global rebalance operations
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
                        <div>
                          <span>Portfolios:</span> {event.portfoliosAffected}
                        </div>
                        <div>
                          <span>Value:</span> {formatCurrency(event.totalValueRebalanced)}
                        </div>
                        <div>
                          <span>By:</span> {event.triggeredBy}
                        </div>
                        <div>
                          <span>Duration:</span> {event.duration ? `${(event.duration / 1000).toFixed(1)}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>No rebalance history</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Portfolio Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Portfolio Details</DialogTitle>
            <DialogDescription>
              Detailed view of {selectedPortfolio?.userName}'s portfolio
            </DialogDescription>
          </DialogHeader>
          
          {selectedPortfolio && (
            <div className="space-y-6">
              {/* Portfolio Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(selectedPortfolio.totalValue)}</div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedPortfolio.assetsCount}</div>
                  <div className="text-sm text-muted-foreground">Assets</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getPerformanceColor(selectedPortfolio.performance24h)}`}>
                    {formatPercentage(selectedPortfolio.performance24h)}
                  </div>
                  <div className="text-sm text-muted-foreground">24h Performance</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getPerformanceColor(selectedPortfolio.performance7d)}`}>
                    {formatPercentage(selectedPortfolio.performance7d)}
                  </div>
                  <div className="text-sm text-muted-foreground">7d Performance</div>
                </div>
              </div>

              {/* Assets Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Asset Allocation</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Current %</TableHead>
                        <TableHead>Target %</TableHead>
                        <TableHead>24h Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPortfolio.assets.map((asset) => {
                        const PerformanceIcon = getPerformanceIcon(asset.performance24h);
                        return (
                          <TableRow key={asset.symbol}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{asset.symbol}</div>
                                <div className="text-sm text-muted-foreground">{asset.name}</div>
                              </div>
                            </TableCell>
                            <TableCell>{asset.quantity.toFixed(6)}</TableCell>
                            <TableCell>{formatCurrency(asset.currentPrice)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(asset.value)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{(asset.allocation * 100).toFixed(1)}%</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{(asset.targetAllocation * 100).toFixed(1)}%</Badge>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center space-x-1 ${getPerformanceColor(asset.performance24h)}`}>
                                <PerformanceIcon className="h-4 w-4" />
                                <span>{formatPercentage(asset.performance24h)}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
