import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  Settings,
  Shield,
  AlertCircle,
  Bell,
  BarChart3,
  LineChart as LineChartIcon,
  Eye,
  EyeOff,
  Download,
  FileText
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';

// Error Boundary Component
class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode; widgetName: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; widgetName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.widgetName} widget:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Widget Error</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Failed to load {this.props.widgetName}. Please try refreshing.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  weeklyAssetData: Array<{ asset: string; returns: number; volatility: number; allocation: number; trades: number }>;
  performanceMetrics: { informationRatio: number; calmarRatio: number; sortinoRatio: number };
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

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  category: 'system' | 'trading' | 'user' | 'security';
  actionRequired: boolean;
  metadata?: any;
}

interface NotificationData {
  notifications: Notification[];
  summary: {
    total: number;
    unread: number;
    actionRequired: number;
    severityCounts: Record<string, number>;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Admin access required for this page.",
        variant: "destructive"
      });
      // In a real app, you'd redirect to a different page
      window.location.href = '/dashboard';
    }
  }, [user]);

  // State
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [perAssetReport, setPerAssetReport] = useState<PerAssetReport | null>(null);
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  
  // Loading states
  const [isRefreshing, setIsRefreshing] = useState({
    daily: false,
    weekly: false,
    perAsset: false,
    notifications: false,
    csv: false,
    backtest: false
  });
  const [backtestProgress, setBacktestProgress] = useState(0);

  // Auto-refresh settings
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Notification settings
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<string>('all');

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      refreshAllData();
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, refreshInterval]);

  // Initial data load
  useEffect(() => {
    if (user?.role === 'admin') {
      refreshAllData();
    }
  }, [user]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      loadDailyReport(),
      loadWeeklyReport(),
      loadNotifications()
    ]);
    setLastRefresh(new Date());
  }, [showUnreadOnly, notificationFilter]);

  // Load daily report
  const loadDailyReport = async () => {
    setIsRefreshing(prev => ({ ...prev, daily: true }));
    try {
      const response = await fetch('/api/reports/daily');
      const data = await response.json();

      if (data.status === 'success') {
        setDailyReport(data.data);
      } else {
        throw new Error(data.error || 'Failed to load daily report');
      }
    } catch (error) {
      console.error('Error loading daily report:', error);
      toast({
        title: "Daily Report Error",
        description: "Failed to load daily report data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(prev => ({ ...prev, daily: false }));
    }
  };

  // Load weekly report
  const loadWeeklyReport = async () => {
    setIsRefreshing(prev => ({ ...prev, weekly: true }));
    try {
      const response = await fetch('/api/reports/weekly');
      const data = await response.json();

      if (data.status === 'success') {
        setWeeklyReport(data.data);
      } else {
        throw new Error(data.error || 'Failed to load weekly report');
      }
    } catch (error) {
      console.error('Error loading weekly report:', error);
      toast({
        title: "Weekly Report Error",
        description: "Failed to load weekly report data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(prev => ({ ...prev, weekly: false }));
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    setIsRefreshing(prev => ({ ...prev, notifications: true }));
    try {
      const params = new URLSearchParams({
        limit: '20',
        unreadOnly: showUnreadOnly.toString(),
        ...(notificationFilter !== 'all' && { severity: notificationFilter })
      });

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (data.status === 'success') {
        setNotificationData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Notifications Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(prev => ({ ...prev, notifications: false }));
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (id: string, read: boolean = true) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read })
      });

      if (response.ok) {
        // Update local state
        setNotificationData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map(n => 
              n.id === id ? { ...n, read } : n
            )
          };
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });

      if (response.ok) {
        await loadNotifications();
        toast({
          title: "All Read",
          description: "All notifications marked as read"
        });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Toggle notification expansion
  const toggleNotificationExpansion = (id: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-accent" />;
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      default: return 'outline';
    }
  };

  // Don't render if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Admin Access Required</h2>
          <p className="text-muted-foreground">This page requires administrator privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview, reports, and administrative controls
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
            <Shield className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          {lastRefresh && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Clock className="h-3 w-3 mr-1" />
              {lastRefresh.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Auto-refresh Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Dashboard Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refresh"
                checked={autoRefreshEnabled}
                onCheckedChange={setAutoRefreshEnabled}
              />
              <Label htmlFor="auto-refresh">Auto-refresh</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="refresh-interval">Interval:</Label>
              <Select 
                value={refreshInterval.toString()} 
                onValueChange={(value) => setRefreshInterval(parseInt(value))}
                disabled={!autoRefreshEnabled}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={refreshAllData}
              disabled={Object.values(isRefreshing).some(Boolean)}
            >
              {Object.values(isRefreshing).some(Boolean) ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            Notifications
            {notificationData?.summary.unread > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {notificationData.summary.unread}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <WidgetErrorBoundary widgetName="Key Metrics">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Returns</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">
                    {dailyReport ? formatCurrency(dailyReport.totalReturn) : '--'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    {dailyReport ? formatPercentage(dailyReport.totalReturnPercent) : '--'} from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Portfolios</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dailyReport ? dailyReport.activePortfolios : '--'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    System managed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">
                    {dailyReport ? formatPercentage(dailyReport.avgPerformance) : '--'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Above benchmark
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dailyReport ? dailyReport.topPerformer.asset : '--'}
                  </div>
                  <p className="text-xs text-muted-foreground text-accent">
                    {dailyReport ? formatPercentage(dailyReport.topPerformer.performance) : '--'} today
                  </p>
                </CardContent>
              </Card>
            </div>
          </WidgetErrorBoundary>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <WidgetErrorBoundary widgetName="Daily Returns Chart">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <LineChartIcon className="h-5 w-5" />
                        <span>Daily Returns Trend</span>
                      </CardTitle>
                      <CardDescription>7-day performance vs benchmark</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadDailyReport}
                      disabled={isRefreshing.daily}
                    >
                      {isRefreshing.daily ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {dailyReport ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyReport.dailyReturnsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="returns" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Returns (%)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="benchmark" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Benchmark (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary widgetName="Weekly Asset Performance">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5" />
                        <span>Asset Performance</span>
                      </CardTitle>
                      <CardDescription>Weekly returns by asset</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadWeeklyReport}
                      disabled={isRefreshing.weekly}
                    >
                      {isRefreshing.weekly ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {weeklyReport ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={weeklyReport.weeklyAssetData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="asset" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="returns" 
                          fill="hsl(var(--primary))" 
                          name="Returns (%)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </WidgetErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Report */}
            <WidgetErrorBoundary widgetName="Daily Report">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Daily Report</CardTitle>
                      <CardDescription>Today's performance summary</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadDailyReport}
                      disabled={isRefreshing.daily}
                    >
                      {isRefreshing.daily ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {dailyReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Return</p>
                          <p className="text-lg font-semibold text-accent">
                            {formatCurrency(dailyReport.totalReturn)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Performance</p>
                          <p className="text-lg font-semibold">
                            {formatPercentage(dailyReport.avgPerformance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Sharpe Ratio</p>
                          <p className="text-lg font-semibold">{dailyReport.riskMetrics.sharpeRatio.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Max Drawdown</p>
                          <p className="text-lg font-semibold text-destructive">
                            {formatPercentage(dailyReport.riskMetrics.maxDrawdown)}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Top: {dailyReport.topPerformer.asset}</span>
                          <span className="text-accent">{formatPercentage(dailyReport.topPerformer.performance)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Bottom: {dailyReport.bottomPerformer.asset}</span>
                          <span className="text-destructive">{formatPercentage(dailyReport.bottomPerformer.performance)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(dailyReport.lastUpdated).toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </WidgetErrorBoundary>

            {/* Weekly Report */}
            <WidgetErrorBoundary widgetName="Weekly Report">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Weekly Report</CardTitle>
                      <CardDescription>7-day performance analysis</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadWeeklyReport}
                      disabled={isRefreshing.weekly}
                    >
                      {isRefreshing.weekly ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {weeklyReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Weekly Return</p>
                          <p className="text-lg font-semibold text-accent">
                            {formatCurrency(weeklyReport.weeklyReturn)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                          <p className="text-lg font-semibold">
                            {formatPercentage(weeklyReport.winRate * 100)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Trades</p>
                          <p className="text-lg font-semibold">{weeklyReport.totalTrades}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Avg Hold Time</p>
                          <p className="text-lg font-semibold">{weeklyReport.avgHoldTime.toFixed(1)}h</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Information Ratio:</span>
                          <span>{weeklyReport.performanceMetrics.informationRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Calmar Ratio:</span>
                          <span>{weeklyReport.performanceMetrics.calmarRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sortino Ratio:</span>
                          <span>{weeklyReport.performanceMetrics.sortinoRatio.toFixed(2)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(weeklyReport.lastUpdated).toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </WidgetErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <WidgetErrorBoundary widgetName="Notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>System Notifications</span>
                      {notificationData?.summary.unread > 0 && (
                        <Badge variant="destructive">
                          {notificationData.summary.unread} unread
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Alerts, updates, and system messages</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={!notificationData?.summary.unread}
                    >
                      Mark All Read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadNotifications}
                      disabled={isRefreshing.notifications}
                    >
                      {isRefreshing.notifications ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Notification Filters */}
                <div className="flex items-center space-x-4 mb-4 pb-4 border-b">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="unread-only"
                      checked={showUnreadOnly}
                      onCheckedChange={setShowUnreadOnly}
                    />
                    <Label htmlFor="unread-only">Show unread only</Label>
                  </div>
                  
                  <Select value={notificationFilter} onValueChange={setNotificationFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notification Summary */}
                {notificationData && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold">{notificationData.summary.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-3 bg-destructive/10 rounded-lg">
                      <div className="text-lg font-bold text-destructive">{notificationData.summary.severityCounts.error || 0}</div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </div>
                    <div className="text-center p-3 bg-warning/10 rounded-lg">
                      <div className="text-lg font-bold text-warning">{notificationData.summary.severityCounts.warning || 0}</div>
                      <div className="text-xs text-muted-foreground">Warnings</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">{notificationData.summary.actionRequired}</div>
                      <div className="text-xs text-muted-foreground">Action Required</div>
                    </div>
                  </div>
                )}

                {/* Notifications List */}
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {notificationData?.notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          notification.read 
                            ? 'bg-muted/30 border-border' 
                            : 'bg-card border-primary/20 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            {getSeverityIcon(notification.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <div className="flex items-center space-x-2">
                                <Badge variant={getSeverityBadgeVariant(notification.severity)} className="text-xs">
                                  {notification.severity}
                                </Badge>
                                {notification.actionRequired && (
                                  <Badge variant="outline" className="text-xs bg-warning/10">
                                    Action Required
                                  </Badge>
                                )}
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                )}
                              </div>
                            </div>
                            
                            <p className={`text-sm text-muted-foreground mt-1 ${
                              expandedNotifications.has(notification.id) ? '' : 'line-clamp-2'
                            }`}>
                              {notification.message}
                            </p>
                            
                            {/* Expandable metadata */}
                            {expandedNotifications.has(notification.id) && notification.metadata && (
                              <div className="mt-3 p-3 bg-muted/50 rounded text-xs">
                                <div className="font-medium mb-1">Additional Details:</div>
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(notification.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(notification.timestamp).toLocaleString()}
                                <span className="mx-2">•</span>
                                <span className="capitalize">{notification.category}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {notification.metadata && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleNotificationExpansion(notification.id)}
                                  >
                                    {expandedNotifications.has(notification.id) ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markNotificationAsRead(notification.id, !notification.read)}
                                >
                                  {notification.read ? 'Mark Unread' : 'Mark Read'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )) || []}
                    
                    {(!notificationData || notificationData.notifications.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2" />
                        <p>No notifications found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </WidgetErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
