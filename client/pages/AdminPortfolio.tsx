import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Mock data
  const mockPortfolios: PortfolioOverview[] = [
    {
      userId: "usr_001",
      userName: "Alice Johnson",
      email: "alice.johnson@example.com",
      totalValue: 125000,
      assetsCount: 8,
      lastRebalanced: "2024-01-15T10:30:00Z",
      performance24h: 0.0245,
      performance7d: 0.082,
      riskLevel: "medium"
    },
    {
      userId: "usr_002",
      userName: "Bob Smith",
      email: "bob.smith@example.com",
      totalValue: 87500,
      assetsCount: 6,
      lastRebalanced: "2024-01-14T15:45:00Z",
      performance24h: -0.0123,
      performance7d: 0.034,
      riskLevel: "low"
    },
    {
      userId: "usr_003",
      userName: "Carol Davis",
      email: "carol.davis@example.com",
      totalValue: 245000,
      assetsCount: 12,
      lastRebalanced: "2024-01-16T09:15:00Z",
      performance24h: 0.0456,
      performance7d: 0.156,
      riskLevel: "high"
    },
    {
      userId: "usr_004",
      userName: "David Wilson",
      email: "david.wilson@example.com",
      totalValue: 156000,
      assetsCount: 9,
      lastRebalanced: "2024-01-13T14:20:00Z",
      performance24h: 0.0189,
      performance7d: 0.067,
      riskLevel: "medium"
    },
    {
      userId: "usr_005",
      userName: "Emma Brown",
      email: "emma.brown@example.com",
      totalValue: 98000,
      assetsCount: 7,
      lastRebalanced: "2024-01-15T11:45:00Z",
      performance24h: -0.0067,
      performance7d: 0.023,
      riskLevel: "low"
    }
  ];

  const mockStats: PortfolioStats = {
    totalPortfolios: 47,
    totalValue: 2850000,
    avgPerformance24h: 0.0178,
    avgPerformance7d: 0.064,
    totalAssets: 425,
    avgAssetsPerPortfolio: 9.04,
    riskDistribution: {
      low: 18,
      medium: 22,
      high: 7
    },
    needsRebalancing: 12,
    lastGlobalRebalance: "2024-01-14T08:30:00Z"
  };

  const mockHistory: RebalanceEvent[] = [
    {
      id: "rebal_001",
      timestamp: "2024-01-16T10:30:00Z",
      triggeredBy: "admin@example.com",
      reason: "Scheduled weekly rebalance",
      portfoliosAffected: 42,
      totalValueRebalanced: 2650000,
      status: "completed",
      duration: 4500
    },
    {
      id: "rebal_002",
      timestamp: "2024-01-15T15:45:00Z",
      triggeredBy: "system",
      reason: "Market volatility threshold exceeded",
      portfoliosAffected: 15,
      totalValueRebalanced: 980000,
      status: "completed",
      duration: 2100
    },
    {
      id: "rebal_003",
      timestamp: "2024-01-14T09:15:00Z",
      triggeredBy: "admin@example.com",
      reason: "Manual rebalance - new asset allocation",
      portfoliosAffected: 35,
      totalValueRebalanced: 1850000,
      status: "completed",
      duration: 3800
    },
    {
      id: "rebal_004",
      timestamp: "2024-01-13T14:20:00Z",
      triggeredBy: "system",
      reason: "Risk threshold breach",
      portfoliosAffected: 8,
      totalValueRebalanced: 450000,
      status: "failed",
      duration: 1200
    },
    {
      id: "rebal_005",
      timestamp: "2024-01-12T11:00:00Z",
      triggeredBy: "admin@example.com",
      reason: "Quarterly strategy adjustment",
      portfoliosAffected: 47,
      totalValueRebalanced: 2800000,
      status: "completed",
      duration: 5200
    }
  ];

  // Apply filters and return processed data
  const processPortfolios = () => {
    // Filter
    let filteredPortfolios = mockPortfolios.filter(p =>
      filters.search === '' ||
      p.userName.toLowerCase().includes(filters.search.toLowerCase()) ||
      p.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      p.userId.toLowerCase().includes(filters.search.toLowerCase())
    );

    // Sort
    filteredPortfolios.sort((a, b) => {
      let aVal: any = a[filters.sort as keyof PortfolioOverview];
      let bVal: any = b[filters.sort as keyof PortfolioOverview];

      if (filters.order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Paginate
    const total = filteredPortfolios.length;
    const paginatedPortfolios = filteredPortfolios.slice(filters.offset, filters.offset + filters.limit);

    return {
      portfolios: paginatedPortfolios,
      metadata: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        summary: {
          totalPortfolios: total,
          totalValue: mockPortfolios.reduce((sum, p) => sum + p.totalValue, 0),
          avgPerformance24h: mockPortfolios.reduce((sum, p) => sum + p.performance24h, 0) / mockPortfolios.length,
          totalAssets: mockPortfolios.reduce((sum, p) => sum + p.assetsCount, 0)
        }
      }
    };
  };

  // Simple refresh function
  const refreshData = () => {
    const { portfolios: newPortfolios, metadata: newMetadata } = processPortfolios();
    setPortfolios(newPortfolios);
    setMetadata(newMetadata);
    setStats(mockStats);
    setRebalanceHistory(mockHistory);
  };

  // Initial data load
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshData();
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Handle filter changes
  useEffect(() => {
    const { portfolios: newPortfolios, metadata: newMetadata } = processPortfolios();
    setPortfolios(newPortfolios);
    setMetadata(newMetadata);
  }, [filters.search, filters.sort, filters.order, filters.limit, filters.offset]);

  // Handle row click to show details (mock data)
  const handleRowClick = async (userId: string) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Find the portfolio from our current data
      const portfolio = portfolios.find(p => p.userId === userId);
      if (!portfolio) return;

      // Mock detailed portfolio data
      const mockDetails: PortfolioDetails = {
        userId: portfolio.userId,
        userName: portfolio.userName,
        email: portfolio.email,
        totalValue: portfolio.totalValue,
        assetsCount: portfolio.assetsCount,
        lastRebalanced: portfolio.lastRebalanced,
        performance24h: portfolio.performance24h,
        performance7d: portfolio.performance7d,
        performance30d: portfolio.performance7d * 1.8,
        riskLevel: portfolio.riskLevel,
        assets: [
          {
            symbol: "BTC",
            name: "Bitcoin",
            quantity: 2.5,
            currentPrice: 43500,
            value: 108750,
            allocation: 0.35,
            targetAllocation: 0.30,
            performance24h: 0.0245,
            lastUpdated: "2024-01-16T14:30:00Z"
          },
          {
            symbol: "ETH",
            name: "Ethereum",
            quantity: 45.8,
            currentPrice: 2650,
            value: 121370,
            allocation: 0.32,
            targetAllocation: 0.35,
            performance24h: 0.0189,
            lastUpdated: "2024-01-16T14:30:00Z"
          },
          {
            symbol: "ADA",
            name: "Cardano",
            quantity: 15000,
            currentPrice: 0.48,
            value: 7200,
            allocation: 0.15,
            targetAllocation: 0.15,
            performance24h: -0.0123,
            lastUpdated: "2024-01-16T14:30:00Z"
          },
          {
            symbol: "SOL",
            name: "Solana",
            quantity: 180,
            currentPrice: 98.5,
            value: 17730,
            allocation: 0.18,
            targetAllocation: 0.20,
            performance24h: 0.0456,
            lastUpdated: "2024-01-16T14:30:00Z"
          }
        ],
        rebalanceHistory: [
          {
            id: "rebal_usr_001",
            timestamp: portfolio.lastRebalanced,
            triggeredBy: "system",
            reason: "Weekly rebalance",
            portfoliosAffected: 1,
            totalValueRebalanced: portfolio.totalValue,
            status: "completed",
            duration: 850
          }
        ]
      };

      setSelectedPortfolio(mockDetails);
      setIsDetailsDialogOpen(true);
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

  // Handle global rebalance (mock simulation)
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
      // Mock rebalance response
      const mockResponse = {
        status: 'success',
        data: {
          rebalanceId: `rebal_${Date.now()}`,
          portfoliosAffected: stats?.totalPortfolios || 47,
          estimatedDuration: 5000
        }
      };

      setCurrentRebalanceId(mockResponse.data.rebalanceId);

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

        // Add new rebalance event to history
        const newRebalanceEvent: RebalanceEvent = {
          id: mockResponse.data.rebalanceId,
          timestamp: new Date().toISOString(),
          triggeredBy: "admin@example.com",
          reason: "Manual global rebalance",
          portfoliosAffected: mockResponse.data.portfoliosAffected,
          totalValueRebalanced: stats?.totalValue || 2850000,
          status: "completed",
          duration: 5000
        };

        setRebalanceHistory(prev => [newRebalanceEvent, ...prev]);

        // Refresh data
        await refreshData();

        setIsRebalancing(false);
        setRebalanceProgress(0);
        setCurrentRebalanceId(null);

        toast({
          title: "Rebalance Complete",
          description: `Successfully rebalanced ${mockResponse.data.portfoliosAffected} portfolios`,
        });
      }, 5000);

      toast({
        title: "Rebalance Started",
        description: `Rebalancing ${mockResponse.data.portfoliosAffected} portfolios`,
      });
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
