import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Eye,
  Wallet,
  PieChart
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

// Mock data for user-specific charts
const dailyReturnsData = [
  { date: '2024-01-15', returns: 2.4, benchmark: 1.8 },
  { date: '2024-01-16', returns: -1.2, benchmark: -0.8 },
  { date: '2024-01-17', returns: 3.1, benchmark: 2.2 },
  { date: '2024-01-18', returns: 1.8, benchmark: 1.5 },
  { date: '2024-01-19', returns: -0.5, benchmark: 0.2 },
  { date: '2024-01-20', returns: 2.8, benchmark: 1.9 },
  { date: '2024-01-21', returns: 1.5, benchmark: 1.1 }
];

const portfolioAllocation = [
  { name: 'BTC', value: 35, amount: 21500 },
  { name: 'ETH', value: 25, amount: 15250 },
  { name: 'SOL', value: 15, amount: 9150 },
  { name: 'AVAX', value: 10, amount: 6100 },
  { name: 'MATIC', value: 10, amount: 6100 },
  { name: 'USDT', value: 5, amount: 3050 }
];

const recentTrades = [
  { asset: 'BTC', type: 'buy', amount: 0.25, price: 43200, pnl: 150, time: '2h ago' },
  { asset: 'ETH', type: 'sell', amount: 1.5, price: 2680, pnl: -75, time: '4h ago' },
  { asset: 'SOL', type: 'buy', amount: 50, price: 88, pnl: 125, time: '6h ago' }
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted))'];

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Trade Executed',
    message: 'Successfully bought 0.25 BTC at $43,200',
    severity: 'success',
    timestamp: '2024-01-21T14:30:00Z',
    read: false
  },
  {
    id: '2',
    title: 'Price Alert',
    message: 'ETH has reached your target price of $2,700',
    severity: 'info',
    timestamp: '2024-01-21T13:15:00Z',
    read: false
  },
  {
    id: '3',
    title: 'Stop Loss Triggered',
    message: 'SOL position closed due to stop loss at $85',
    severity: 'warning',
    timestamp: '2024-01-21T11:45:00Z',
    read: true
  },
  {
    id: '4',
    title: 'Portfolio Rebalanced',
    message: 'Your portfolio has been automatically rebalanced',
    severity: 'info',
    timestamp: '2024-01-21T10:20:00Z',
    read: false
  }
];

export default function UserDashboard() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState({
    daily: false,
    weekly: false,
    notifications: false
  });
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    // Load initial data
    loadDailyReport();
    loadWeeklyReport();
    loadNotifications();

    // Cleanup function
    return () => {
      setMounted(false);
    };
  }, []);

  const loadDailyReport = async () => {
    if (!mounted) return;
    setIsRefreshing(prev => ({ ...prev, daily: true }));
    try {
      // Mock API call - replace with GET /reports/daily
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!mounted) return;
      setDailyReport({
        portfolioValue: '$61,150',
        dailyChange: '+$1,245',
        dailyChangePercent: '+2.08%',
        totalReturn: '+$8,150',
        totalReturnPercent: '+15.3%',
        activeTrades: 3,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      if (mounted) {
        setIsRefreshing(prev => ({ ...prev, daily: false }));
      }
    }
  };

  const loadWeeklyReport = async () => {
    if (!mounted) return;
    setIsRefreshing(prev => ({ ...prev, weekly: true }));
    try {
      // Mock API call - replace with GET /reports/weekly
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!mounted) return;
      setWeeklyReport({
        weeklyReturn: '+$3,750',
        weeklyReturnPercent: '+6.5%',
        bestPerformer: 'SOL (+18.2%)',
        worstPerformer: 'MATIC (-2.1%)',
        winRate: '67%',
        sharpeRatio: 1.85,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading weekly report:', error);
    } finally {
      if (mounted) {
        setIsRefreshing(prev => ({ ...prev, weekly: false }));
      }
    }
  };

  const loadNotifications = async () => {
    setIsRefreshing(prev => ({ ...prev, notifications: true }));
    try {
      // Mock API call - replace with GET /notifications
      await new Promise(resolve => setTimeout(resolve, 800));
      // Data already loaded from mock
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsRefreshing(prev => ({ ...prev, notifications: false }));
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-accent' : 'text-destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your portfolio overview
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$61,150</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +2.08% today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">+$1,245</div>
                <p className="text-xs text-muted-foreground">
                  Since market open
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">+$8,150</div>
                <p className="text-xs text-muted-foreground">
                  +15.3% all time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Open positions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Portfolio */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Performance Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trend</CardTitle>
                  <CardDescription>7-day portfolio performance vs benchmark</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyReturnsData}>
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
                        name="Portfolio (%)"
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
                </CardContent>
              </Card>
            </div>

            {/* Portfolio Allocation */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Allocation</CardTitle>
                <CardDescription>Current asset distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={portfolioAllocation}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name} ${value}%`}
                    >
                      {portfolioAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>Your latest trading activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTrades.map((trade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant={trade.type === 'buy' ? 'default' : 'secondary'}>
                        {trade.type.toUpperCase()}
                      </Badge>
                      <div>
                        <div className="font-medium">{trade.asset}</div>
                        <div className="text-sm text-muted-foreground">
                          {trade.amount} @ {formatCurrency(trade.price)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${getPnLColor(trade.pnl)}`}>
                        {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                      </div>
                      <div className="text-sm text-muted-foreground">{trade.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Report */}
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
                        <p className="text-sm font-medium text-muted-foreground">Portfolio Value</p>
                        <p className="text-lg font-semibold">{dailyReport.portfolioValue}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Daily Change</p>
                        <p className="text-lg font-semibold text-accent">{dailyReport.dailyChange}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Return</p>
                        <p className="text-lg font-semibold text-accent">{dailyReport.totalReturn}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Trades</p>
                        <p className="text-lg font-semibold">{dailyReport.activeTrades}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(dailyReport.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Report */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Weekly Report</CardTitle>
                    <CardDescription>This week's performance analysis</CardDescription>
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
                        <p className="text-lg font-semibold text-accent">{weeklyReport.weeklyReturn}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                        <p className="text-lg font-semibold">{weeklyReport.winRate}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Best Performer</p>
                        <p className="text-lg font-semibold text-accent">{weeklyReport.bestPerformer}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Sharpe Ratio</p>
                        <p className="text-lg font-semibold">{weeklyReport.sharpeRatio}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(weeklyReport.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Notifications</CardTitle>
                  <CardDescription>Important updates and alerts</CardDescription>
                </div>
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
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        notification.read 
                          ? 'bg-muted/30 border-border' 
                          : 'bg-card border-primary/20 shadow-sm'
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
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
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(notification.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
