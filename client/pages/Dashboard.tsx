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
  Clock
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data for charts
const dailyReturnsData = [
  { date: '2024-01-15', returns: 2.4, benchmark: 1.8 },
  { date: '2024-01-16', returns: -1.2, benchmark: -0.8 },
  { date: '2024-01-17', returns: 3.1, benchmark: 2.2 },
  { date: '2024-01-18', returns: 1.8, benchmark: 1.5 },
  { date: '2024-01-19', returns: -0.5, benchmark: 0.2 },
  { date: '2024-01-20', returns: 2.8, benchmark: 1.9 },
  { date: '2024-01-21', returns: 1.5, benchmark: 1.1 }
];

const weeklyAssetData = [
  { asset: 'BTC', returns: 12.5, volatility: 8.2, allocation: 35 },
  { asset: 'ETH', returns: 8.7, volatility: 12.1, allocation: 25 },
  { asset: 'SOL', returns: 15.2, volatility: 18.5, allocation: 15 },
  { asset: 'AVAX', returns: 6.3, volatility: 15.2, allocation: 10 },
  { asset: 'MATIC', returns: 9.1, volatility: 14.8, allocation: 10 },
  { asset: 'LINK', returns: 4.2, volatility: 11.5, allocation: 5 }
];

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
    title: 'Model Performance Alert',
    message: 'Primary trading model showing decreased accuracy (78% vs 85% baseline)',
    severity: 'warning',
    timestamp: '2024-01-21T14:30:00Z',
    read: false
  },
  {
    id: '2',
    title: 'Portfolio Rebalance Complete',
    message: 'Successfully rebalanced 47 portfolios with new asset allocations',
    severity: 'success',
    timestamp: '2024-01-21T13:15:00Z',
    read: false
  },
  {
    id: '3',
    title: 'High Volatility Detected',
    message: 'BTC volatility exceeded 15% threshold. Stop-loss triggers activated.',
    severity: 'error',
    timestamp: '2024-01-21T11:45:00Z',
    read: true
  },
  {
    id: '4',
    title: 'New User Approval Required',
    message: '3 new user registrations pending admin approval',
    severity: 'info',
    timestamp: '2024-01-21T10:20:00Z',
    read: false
  }
];

export default function Dashboard() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState({
    daily: false,
    weekly: false,
    notifications: false
  });

  useEffect(() => {
    // Load initial data
    loadDailyReport();
    loadWeeklyReport();
    loadNotifications();
  }, []);

  const loadDailyReport = async () => {
    setIsRefreshing(prev => ({ ...prev, daily: true }));
    try {
      // Mock API call - replace with GET /reports/daily
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDailyReport({
        totalReturn: '+$24,580',
        totalReturnPercent: '+3.2%',
        activePortfolios: 47,
        avgPerformance: '+2.8%',
        topPerformer: 'SOL (+15.2%)',
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      setIsRefreshing(prev => ({ ...prev, daily: false }));
    }
  };

  const loadWeeklyReport = async () => {
    setIsRefreshing(prev => ({ ...prev, weekly: true }));
    try {
      // Mock API call - replace with GET /reports/weekly
      await new Promise(resolve => setTimeout(resolve, 1000));
      setWeeklyReport({
        weeklyReturn: '+$127,340',
        weeklyReturnPercent: '+8.7%',
        sharpeRatio: 2.14,
        maxDrawdown: '-2.3%',
        winRate: '73%',
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading weekly report:', error);
    } finally {
      setIsRefreshing(prev => ({ ...prev, weekly: false }));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of system performance and recent activity
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
                <CardTitle className="text-sm font-medium">Daily Returns</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">+$24,580</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +3.2% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Portfolios</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <p className="text-xs text-muted-foreground">
                  2 pending rebalance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">+2.8%</div>
                <p className="text-xs text-muted-foreground">
                  Above benchmark (+1.9%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">SOL</div>
                <p className="text-xs text-muted-foreground text-accent">
                  +15.2% today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Returns Trend</CardTitle>
                <CardDescription>7-day performance vs benchmark</CardDescription>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Performance</CardTitle>
                <CardDescription>Weekly returns by asset</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyAssetData}>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Report */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daily Report</CardTitle>
                    <CardDescription>Summary metrics for today</CardDescription>
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
                        <p className="text-lg font-semibold text-accent">{dailyReport.totalReturn}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Performance</p>
                        <p className="text-lg font-semibold">{dailyReport.avgPerformance}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Portfolios</p>
                        <p className="text-lg font-semibold">{dailyReport.activePortfolios}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                        <p className="text-lg font-semibold text-accent">{dailyReport.topPerformer}</p>
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
                    <CardDescription>Performance metrics and asset data</CardDescription>
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
                        <p className="text-sm font-medium text-muted-foreground">Sharpe Ratio</p>
                        <p className="text-lg font-semibold">{weeklyReport.sharpeRatio}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Max Drawdown</p>
                        <p className="text-lg font-semibold text-destructive">{weeklyReport.maxDrawdown}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                        <p className="text-lg font-semibold text-accent">{weeklyReport.winRate}</p>
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
                  <CardDescription>System alerts and updates</CardDescription>
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
