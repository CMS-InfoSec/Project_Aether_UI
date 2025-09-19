import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Calendar
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from '@/hooks/use-toast';

// Types
interface DailyReport {
  totalReturn: number;
  totalReturnPercent: number;
  activePortfolios: number;
  avgPerformance: number;
  topPerformer: { asset: string; performance: number };
  bottomPerformer: { asset: string; performance: number };
  dailyReturnsData: Array<{ date: string; returns: number; benchmark: number }>;
  riskMetrics: { volatility: number; sharpeRatio: number; maxDrawdown: number };
  lastUpdated: string;
}

interface WeeklyReport {
  weeklyReturn: number;
  weeklyReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  avgHoldTime: number;
  weeklyAssetData: Array<{
    asset: string;
    returns: number;
    volatility: number;
    allocation: number;
    trades: number;
  }>;
  performanceMetrics: {
    informationRatio: number;
    calmarRatio: number;
    sortinoRatio: number;
  };
  lastUpdated: string;
}

interface PerAssetReport {
  assets: Array<{
    symbol: string;
    name: string;
    allocation: number;
    currentPrice: number;
    dailyChange: number;
    weeklyChange: number;
    monthlyChange: number;
    totalReturn: number;
    totalReturnPercent: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
    trades: number;
    avgHoldTime: number;
    lastRebalance: string;
  }>;
  summary: {
    totalAssets: number;
    topPerformer: { symbol: string; return: number };
    bottomPerformer: { symbol: string; return: number };
    avgVolatility: number;
    correlationMatrix: Array<{ asset1: string; asset2: string; correlation: number }>;
  };
  lastUpdated: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function UserReports() {
  const { user } = useAuth();
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [perAssetReport, setPerAssetReport] = useState<PerAssetReport | null>(null);
  const [isLoading, setIsLoading] = useState({
    daily: false,
    weekly: false,
    perAsset: false,
    csv: false,
    backtest: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'return' | 'volatility' | 'allocation'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Utility functions
  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  // Data loading functions
  const loadDailyReport = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, daily: true }));
    try {
      const response = await fetch('/api/reports/daily');
      const data = await response.json();
      
      if (data.status === 'success') {
        setDailyReport(data.data);
        toast({
          title: "Daily Report Updated",
          description: "Latest daily performance data loaded successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to load daily report');
      }
    } catch (error) {
      console.error('Load daily report error:', error);
      toast({
        title: "Error",
        description: "Failed to load daily report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, daily: false }));
    }
  }, []);

  const loadWeeklyReport = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, weekly: true }));
    try {
      const response = await fetch('/api/reports/weekly');
      const data = await response.json();
      
      if (data.status === 'success') {
        setWeeklyReport(data.data);
        toast({
          title: "Weekly Report Updated",
          description: "Latest weekly performance data loaded successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to load weekly report');
      }
    } catch (error) {
      console.error('Load weekly report error:', error);
      toast({
        title: "Error",
        description: "Failed to load weekly report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, weekly: false }));
    }
  }, []);

  const loadPerAssetReport = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, perAsset: true }));
    try {
      const response = await fetch('/api/reports/per-asset');
      const data = await response.json();
      
      if (data.status === 'success') {
        setPerAssetReport(data.data);
        toast({
          title: "Per-Asset Report Updated",
          description: "Latest asset performance data loaded successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to load per-asset report');
      }
    } catch (error) {
      console.error('Load per-asset report error:', error);
      toast({
        title: "Error",
        description: "Failed to load per-asset report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, perAsset: false }));
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    setLastRefresh(new Date());
    await Promise.all([
      loadDailyReport(),
      loadWeeklyReport(),
      loadPerAssetReport()
    ]);
  }, [loadDailyReport, loadWeeklyReport, loadPerAssetReport]);

  const exportCSV = async (reportType: 'daily' | 'weekly' | 'per-asset') => {
    setIsLoading(prev => ({ ...prev, csv: true }));
    try {
      const response = await fetch(`/api/reports/export?type=${reportType}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Successful",
          description: `${reportType} report exported to CSV successfully.`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export CSV error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, csv: false }));
    }
  };

  const downloadBacktestReport = async () => {
    setIsLoading(prev => ({ ...prev, backtest: true }));
    setBacktestProgress(0);
    
    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setBacktestProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/reports/backtest?format=daily');
      
      clearInterval(progressInterval);
      setBacktestProgress(100);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backtest-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Download Complete",
          description: "Backtest report downloaded successfully.",
        });
      } else {
        const errorData = await response.json();
        if (response.status === 404) {
          toast({
            title: "No Report Available",
            description: "No backtest report found. Please run a backtest first.",
            variant: "destructive",
          });
        } else {
          throw new Error(errorData.error || 'Download failed');
        }
      }
    } catch (error) {
      console.error('Download backtest report error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download backtest report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, backtest: false }));
      setBacktestProgress(0);
    }
  };

  // Filter and sort per-asset data
  const filteredAndSortedAssets = perAssetReport?.assets
    ?.filter(asset => 
      asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    ?.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'return':
          aValue = a.totalReturnPercent;
          bValue = b.totalReturnPercent;
          break;
        case 'volatility':
          aValue = a.volatility;
          bValue = b.volatility;
          break;
        case 'allocation':
          aValue = a.allocation;
          bValue = b.allocation;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    }) || [];

  // Initial data load
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view reports and analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive performance analysis and data insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastRefresh && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Clock className="h-3 w-3 mr-1" />
              {lastRefresh.toLocaleTimeString()}
            </Badge>
          )}
          <Button onClick={refreshAllData} disabled={Object.values(isLoading).some(Boolean)}>
            {Object.values(isLoading).some(Boolean) ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh All
          </Button>
        </div>
      </div>

      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
          <TabsTrigger value="per-asset">Per-Asset Analysis</TabsTrigger>
          <TabsTrigger value="backtest">Backtest Reports</TabsTrigger>
        </TabsList>

        {/* Daily Report Tab */}
        <TabsContent value="daily" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Daily Performance Report</h2>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => exportCSV('daily')} disabled={isLoading.csv}>
                {isLoading.csv ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
              <Button variant="outline" onClick={loadDailyReport} disabled={isLoading.daily}>
                {isLoading.daily ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {dailyReport ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Metrics Cards */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Return</p>
                        <p className="text-2xl font-bold text-accent">
                          {formatCurrency(dailyReport.totalReturn)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Performance</p>
                        <p className="text-2xl font-bold">
                          {formatPercentage(dailyReport.totalReturnPercent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Portfolios</p>
                        <p className="text-2xl font-bold">{dailyReport.activePortfolios}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                        <p className="text-2xl font-bold">
                          {formatPercentage(dailyReport.avgPerformance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Risk Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Volatility</span>
                        <span className="font-medium">{dailyReport.riskMetrics.volatility.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                        <span className="font-medium">{dailyReport.riskMetrics.sharpeRatio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Max Drawdown</span>
                        <span className="font-medium text-destructive">
                          {formatPercentage(dailyReport.riskMetrics.maxDrawdown)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-accent" />
                          <span className="text-sm font-medium">Best: {dailyReport.topPerformer.asset}</span>
                        </div>
                        <span className="text-accent font-medium">
                          {formatPercentage(dailyReport.topPerformer.performance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TrendingDown className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">Worst: {dailyReport.bottomPerformer.asset}</span>
                        </div>
                        <span className="text-destructive font-medium">
                          {formatPercentage(dailyReport.bottomPerformer.performance)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Returns vs Benchmark</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyReport.dailyReturnsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="returns" stroke="#8884d8" name="Strategy" />
                      <Line type="monotone" dataKey="benchmark" stroke="#82ca9d" name="Benchmark" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        {/* Weekly Report Tab */}
        <TabsContent value="weekly" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Weekly Performance Report</h2>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => exportCSV('weekly')} disabled={isLoading.csv}>
                {isLoading.csv ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
              <Button variant="outline" onClick={loadWeeklyReport} disabled={isLoading.weekly}>
                {isLoading.weekly ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {weeklyReport ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Weekly Return</p>
                      <p className="text-2xl font-bold text-accent">
                        {formatCurrency(weeklyReport.weeklyReturn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Return %</p>
                      <p className="text-2xl font-bold">
                        {formatPercentage(weeklyReport.weeklyReturnPercent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold">
                        {formatPercentage(weeklyReport.winRate * 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Trades</p>
                      <p className="text-2xl font-bold">{weeklyReport.totalTrades}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Asset Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asset Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyReport.weeklyAssetData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="asset" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="returns" fill="#8884d8" name="Returns %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Asset Data Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Asset Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Returns %</TableHead>
                        <TableHead>Volatility %</TableHead>
                        <TableHead>Allocation %</TableHead>
                        <TableHead>Trades</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyReport.weeklyAssetData.map((asset) => (
                        <TableRow key={asset.asset}>
                          <TableCell className="font-medium">{asset.asset}</TableCell>
                          <TableCell className={asset.returns >= 0 ? 'text-accent' : 'text-destructive'}>
                            {formatPercentage(asset.returns)}
                          </TableCell>
                          <TableCell>{asset.volatility.toFixed(2)}%</TableCell>
                          <TableCell>{asset.allocation}%</TableCell>
                          <TableCell>{asset.trades}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        {/* Per-Asset Report Tab */}
        <TabsContent value="per-asset" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Per-Asset Analysis</h2>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => exportCSV('per-asset')} disabled={isLoading.csv}>
                {isLoading.csv ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
              <Button variant="outline" onClick={loadPerAssetReport} disabled={isLoading.perAsset}>
                {isLoading.perAsset ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {perAssetReport ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{perAssetReport.summary.totalAssets}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{perAssetReport.summary.topPerformer.symbol}</div>
                    <p className="text-xs text-accent">
                      {formatPercentage(perAssetReport.summary.topPerformer.return)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bottom Performer</CardTitle>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{perAssetReport.summary.bottomPerformer.symbol}</div>
                    <p className="text-xs text-destructive">
                      {formatPercentage(perAssetReport.summary.bottomPerformer.return)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Volatility</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{perAssetReport.summary.avgVolatility.toFixed(1)}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Search */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asset Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label>Sort by:</Label>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-1 border rounded-md"
                      >
                        <option value="symbol">Symbol</option>
                        <option value="return">Return</option>
                        <option value="volatility">Volatility</option>
                        <option value="allocation">Allocation</option>
                      </select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? 'ASC' : 'DESC'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Allocation Chart */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Portfolio Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={perAssetReport.assets.map((asset, index) => ({
                            name: asset.symbol,
                            value: asset.allocation,
                            fill: COLORS[index % COLORS.length]
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {perAssetReport.assets.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance vs Volatility</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart 
                        data={perAssetReport.assets.map(asset => ({
                          name: asset.symbol,
                          return: asset.totalReturnPercent,
                          volatility: asset.volatility
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="volatility" label={{ value: 'Volatility %', position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: 'Return %', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="return" stroke="#8884d8" strokeWidth={2} dot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Asset Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Asset Analysis</CardTitle>
                  <CardDescription>
                    {filteredAndSortedAssets.length} of {perAssetReport.assets.length} assets shown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>Daily Change</TableHead>
                        <TableHead>Weekly Change</TableHead>
                        <TableHead>Monthly Return</TableHead>
                        <TableHead>Total Return</TableHead>
                        <TableHead>Allocation</TableHead>
                        <TableHead>Volatility</TableHead>
                        <TableHead>Sharpe</TableHead>
                        <TableHead>Trades</TableHead>
                        <TableHead>Avg Hold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedAssets.map((asset) => (
                        <TableRow key={asset.symbol}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{asset.symbol}</div>
                              <div className="text-xs text-muted-foreground">{asset.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(asset.currentPrice)}</TableCell>
                          <TableCell className={asset.dailyChange >= 0 ? 'text-accent' : 'text-destructive'}>
                            {formatPercentage(asset.dailyChange)}
                          </TableCell>
                          <TableCell className={asset.weeklyChange >= 0 ? 'text-accent' : 'text-destructive'}>
                            {formatPercentage(asset.weeklyChange)}
                          </TableCell>
                          <TableCell className={asset.monthlyChange >= 0 ? 'text-accent' : 'text-destructive'}>
                            {formatPercentage(asset.monthlyChange)}
                          </TableCell>
                          <TableCell className={asset.totalReturn >= 0 ? 'text-accent' : 'text-destructive'}>
                            {formatCurrency(asset.totalReturn)}
                          </TableCell>
                          <TableCell>{asset.allocation}%</TableCell>
                          <TableCell>{asset.volatility.toFixed(2)}%</TableCell>
                          <TableCell>{asset.sharpeRatio.toFixed(2)}</TableCell>
                          <TableCell>{asset.trades}</TableCell>
                          <TableCell>{asset.avgHoldTime.toFixed(1)}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        {/* Backtest Report Tab */}
        <TabsContent value="backtest" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Backtest Reports</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Download Latest Backtest Report</span>
              </CardTitle>
              <CardDescription>
                Download the most recent backtest analysis results as a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading.backtest && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Preparing download...</span>
                    <span>{backtestProgress}%</span>
                  </div>
                  <Progress value={backtestProgress} className="w-full" />
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={downloadBacktestReport} 
                  disabled={isLoading.backtest}
                  className="min-w-48"
                >
                  {isLoading.backtest ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Latest Backtest
                    </>
                  )}
                </Button>
                
                {user?.role === 'admin' && (
                  <Button variant="outline" asChild>
                    <a href="/admin/backtest">
                      <Eye className="h-4 w-4 mr-2" />
                      View Backtest Admin
                    </a>
                  </Button>
                )}
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  The backtest report includes strategy performance, risk metrics, trade analysis, and comparison with benchmarks over the specified time period.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest report downloads and generation history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Daily Report Export</p>
                      <p className="text-xs text-muted-foreground">CSV download completed</p>
                    </div>
                  </div>
                  <Badge variant="outline">2 min ago</Badge>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Backtest Report Generated</p>
                      <p className="text-xs text-muted-foreground">Strategy backtest completed</p>
                    </div>
                  </div>
                  <Badge variant="outline">1 hour ago</Badge>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Weekly Analysis Update</p>
                      <p className="text-xs text-muted-foreground">Performance data refreshed</p>
                    </div>
                  </div>
                  <Badge variant="outline">3 hours ago</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
