import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HelpTip from "@/components/ui/help-tip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  PieChart,
  Bell,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import RiskMonitoringPanel from "./components/RiskMonitoringPanel";

import { getJson, patchJson } from "@/lib/apiClient";


const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted))",
];

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  timestamp: string;
  read: boolean;
}


export default function UserDashboard() {
  const [notifications, setNotifications] =
    useState<Notification[]>([]);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<Array<{date:string; returns:number; benchmark:number}>>([]);
  const [allocationData, setAllocationData] = useState<Array<{name:string; value:number; amount?:number}>>([]);
  const [recentTrades, setRecentTrades] = useState<Array<{asset:string; type:'buy'|'sell'; amount:number; price:number; pnl:number; time:string}>>([]);
  const [isRefreshing, setIsRefreshing] = useState({
    daily: false,
    weekly: false,
    notifications: false,
  });
  const [mounted, setMounted] = useState(true);
  const [alerts, setAlerts] = useState<Array<{ id:string; timestamp:number; title:string; message:string; severity:'info'|'warning'|'error'|'success'; read?:boolean; source?:string }>>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [portfolioHoldings, setPortfolioHoldings] = useState<Array<{ symbol:string; value:number; allocation:number; pnl:number }>>([]);
  const [portfolioTotal, setPortfolioTotal] = useState<number>(0);
  const [portfolioPnL, setPortfolioPnL] = useState<number>(0);
  const [hedgePercent, setHedgePercent] = useState<number>(0);

  useEffect(() => {
    // Load initial data
    loadDailyReport();
    loadWeeklyReport();
    loadNotifications();
    loadPerAsset();
    loadRecentTrades();
    loadPortfolioPanel();
    loadAlerts();

    // Cleanup function
    return () => {
      setMounted(false);
    };
  }, []);

  const loadDailyReport = async () => {
    if (!mounted) return;
    setIsRefreshing((prev) => ({ ...prev, daily: true }));
    try {
      const j = await getJson<any>("/api/reports/daily");
      const data = j?.data || j;
      if (!mounted) return;
      setDailyReport({
        portfolioValue: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(1000000 + (data?.totalReturn || 0)),
        dailyChange: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data?.totalReturn || 0),
        dailyChangePercent: `${(data?.totalReturnPercent ?? 0).toFixed(2)}%`,
        totalReturn: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data?.totalReturn || 0),
        totalReturnPercent: `${(data?.totalReturnPercent ?? 0).toFixed(2)}%`,
        activeTrades: data?.activePortfolios ?? 0,
        lastUpdated: data?.lastUpdated || new Date().toISOString(),
      });
      const dr = Array.isArray(data?.dailyReturnsData) ? data.dailyReturnsData : [];
      setPerformanceData(dr.map((d:any)=> ({ date: d.date, returns: Number(d.returns)||0, benchmark: Number(d.benchmark)||0 })));
    } catch (error) {
      console.error("Error loading daily report:", error);
    } finally {
      if (mounted) {
        setIsRefreshing((prev) => ({ ...prev, daily: false }));
      }
    }
  };

  const loadWeeklyReport = async () => {
    if (!mounted) return;
    setIsRefreshing((prev) => ({ ...prev, weekly: true }));
    try {
      const j = await getJson<any>("/api/reports/weekly");
      const data = j?.data || j;
      if (!mounted) return;
      const sortedBest = Array.isArray(data?.weeklyAssetData) ? [...data.weeklyAssetData].sort((a:any,b:any)=> (b.returns||0)-(a.returns||0)) : [];
      const sortedWorst = Array.isArray(data?.weeklyAssetData) ? [...data.weeklyAssetData].sort((a:any,b:any)=> (a.returns||0)-(b.returns||0)) : [];
      setWeeklyReport({
        weeklyReturn: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data?.weeklyReturn || 0),
        weeklyReturnPercent: `${(data?.weeklyReturnPercent ?? 0).toFixed(2)}%`,
        bestPerformer: `${sortedBest[0]?.asset || "-"} (+${(sortedBest[0]?.returns ?? 0).toFixed?.(1) || 0}%)`,
        worstPerformer: `${sortedWorst[0]?.asset || "-"} (${(sortedWorst[0]?.returns ?? 0).toFixed?.(1) || 0}%)`,
        winRate: `${Math.round((data?.winRate ?? 0)*100)}%`,
        sharpeRatio: Number(data?.sharpeRatio ?? 0).toFixed ? Number(data?.sharpeRatio).toFixed(2) : data?.sharpeRatio,
        lastUpdated: data?.lastUpdated || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error loading weekly report:", error);
    } finally {
      if (mounted) {
        setIsRefreshing((prev) => ({ ...prev, weekly: false }));
      }
    }
  };

  const loadNotifications = async () => {
    if (!mounted) return;
    setIsRefreshing((prev) => ({ ...prev, notifications: true }));
    try {
      const j = await getJson<any>("/api/notifications");
      const data = j?.data || j;
      const items = data?.notifications || data?.items || [];
      if (Array.isArray(items)) setNotifications(items as any);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      if (mounted) {
        setIsRefreshing((prev) => ({ ...prev, notifications: false }));
      }
    }
  };

  const loadPerAsset = async () => {
    try {
      const j = await getJson<any>("/api/reports/per-asset");
      const data = j?.data || j;
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      setAllocationData(assets.map((a:any)=> ({ name: a.symbol || a.name, value: Number(a.allocation)||0, amount: Number(a.currentPrice)||undefined })));
    } catch (e) {
      console.error("Error loading per-asset report:", e);
    }
  };

  const loadPortfolioPanel = async () => {
    try {
      const pos = await getJson<any>("/api/positions/open");
      const items = Array.isArray(pos?.items) ? pos.items : [];
      const holdingsRaw = items.map((p:any)=>{
        const price = Number(p.current_price ?? p.entry_price) || 0;
        const value = price * (Number(p.amount)||0);
        const pnl = Number(p.net_pnl ?? p.pnl ?? 0) || 0;
        const symbol = String(p.symbol||'');
        return { symbol, value, pnl };
      });
      const total = holdingsRaw.reduce((s:any,h:any)=> s + h.value, 0);
      const holdings = holdingsRaw
        .sort((a:any,b:any)=> b.value - a.value)
        .map((h:any)=> ({ ...h, allocation: total > 0 ? (h.value/total)*100 : 0 }));
      setPortfolioHoldings(holdings);
      setPortfolioTotal(total);
      setPortfolioPnL(holdings.reduce((s:any,h:any)=> s + h.pnl, 0));
    } catch (e) {}
    try {
      const hp = await getJson<any>("/api/hedge/percent");
      const data = hp?.data || hp;
      const eff = Number(data?.effectivePercent ?? data?.hedgePercent ?? 0) || 0;
      setHedgePercent(eff);
    } catch(e) {}
  };

  const loadRecentTrades = async () => {
    try {
      const j = await getJson<any>("/api/trades/recent");
      const items = Array.isArray(j?.items) ? j.items : [];
      const toAgo = (ts:string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const m = Math.floor(diff/60000);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m/60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h/24);
        return `${d}d ago`;
      };
      setRecentTrades(items.map((t:any)=> ({
        asset: String(t.symbol||'').split('/')[0] || t.symbol || '-',
        type: (t.action === 'sell' ? 'sell' : 'buy') as 'buy'|'sell',
        amount: Number(t.amount)||0,
        price: Number(t.price)||0,
        pnl: Number(t.net_pnl ?? t.pnl ?? 0),
        time: t.timestamp ? toAgo(t.timestamp) : '',
      })));
    } catch (e) {
      console.error("Error loading recent trades:", e);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!mounted) return;
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)),
    );
    try { await patchJson(`/api/notifications/${id}/read`, { read: true }); } catch {}
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-accent" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      case "success":
        return "default";
      default:
        return "outline";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? "text-accent" : "text-destructive";
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
          <Badge
            variant="outline"
            className="bg-accent/10 text-accent border-accent/20"
          >
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
                <CardTitle className="text-sm font-medium">
                  Portfolio Value
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <HelpTip content="Total current value of your portfolio including all assets." />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dailyReport?.portfolioValue || "$0"}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  {dailyReport?.dailyChangePercent || "+0.00%"} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <HelpTip content="Profit or loss realized today across your portfolio." />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{dailyReport?.dailyChange || "$0"}</div>
                <p className="text-xs text-muted-foreground">
                  Since market open
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Return
                </CardTitle>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <HelpTip content="Cumulative gains since you started trading on this platform." />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{dailyReport?.totalReturn || "$0"}</div>
                <p className="text-xs text-muted-foreground">+15.3% all time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Trades
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <HelpTip content="Number of open positions currently held." />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dailyReport?.activeTrades ?? 0}</div>
                <p className="text-xs text-muted-foreground">Open positions</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Portfolio */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Performance Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex items-start justify-between">
                  <div>
                    <CardTitle>Performance Trend</CardTitle>
                    <CardDescription>
                      7-day portfolio performance vs benchmark
                    </CardDescription>
                  </div>
                  <HelpTip content="Line chart comparing your daily returns against a benchmark." />
                </CardHeader>
                <CardContent>
                  {performanceData && performanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={performanceData}>
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
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Portfolio Allocation */}
            <Card>
              <CardHeader className="flex items-start justify-between">
                <div>
                  <CardTitle>Portfolio Allocation</CardTitle>
                  <CardDescription>Current asset distribution</CardDescription>
                </div>
                <HelpTip content="Breakdown of assets by percentage of your portfolio." />
              </CardHeader>
              <CardContent>
                {allocationData && allocationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                      >
                        {allocationData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Panel */}
          <Card>
            <CardHeader className="flex items-start justify-between">
              <div>
                <CardTitle className="inline-flex items-center gap-2">Portfolio</CardTitle>
                <CardDescription>Holdings, allocations, hedge exposure, and unrealized P&L</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <HelpTip content="Pulled from open positions and hedge settings. Hedge ratio applies at portfolio level." />
                <Button variant="outline" size="sm" onClick={loadPortfolioPanel}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Hedge Ratio</div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-3 bg-primary rounded-full" style={{ width: `${Math.min(100, Math.max(0, hedgePercent*100)).toFixed(0)}%` }} />
                  </div>
                  <div className="text-xs mt-1">{(hedgePercent*100).toFixed(0)}% hedged</div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-medium mb-2">Current Holdings</div>
                    <div className="space-y-2">
                      {portfolioHoldings.length === 0 && (
                        <div className="text-xs text-muted-foreground">No open positions</div>
                      )}
                      {portfolioHoldings.map((h, idx)=> (
                        <div key={h.symbol+idx}>
                          <div className="flex items-center justify-between text-xs">
                            <div className="font-medium">{h.symbol}</div>
                            <div className="text-muted-foreground">{formatCurrency(h.value)}</div>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-2" style={{ width: `${h.allocation.toFixed(2)}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                          </div>
                          <div className="text-[11px] text-muted-foreground">{h.allocation.toFixed(2)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Unrealized P&L</div>
                    <div className="space-y-2">
                      {portfolioHoldings.map((h)=> (
                        <div key={h.symbol} className="flex items-center justify-between text-xs">
                          <div>{h.symbol}</div>
                          <div className={`${h.pnl>=0? 'text-accent':'text-destructive'} font-medium`}>{h.pnl>=0? '+':''}{formatCurrency(h.pnl)}</div>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex items-center justify-between text-sm">
                        <div className="font-medium">Total</div>
                        <div className={`${portfolioPnL>=0? 'text-accent':'text-destructive'} font-semibold`}>{portfolioPnL>=0? '+':''}{formatCurrency(portfolioPnL)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Portfolio Market Value: {formatCurrency(portfolioTotal)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Monitoring */}
          <RiskMonitoringPanel />

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex items-start justify-between">
              <div>
                <CardTitle>Recent Trades</CardTitle>
                <CardDescription>Your latest trading activity</CardDescription>
              </div>
              <HelpTip content="Most recent executed trades with P&L and timestamps." />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTrades.map((trade, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <Badge
                        variant={trade.type === "buy" ? "default" : "secondary"}
                      >
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
                        {trade.pnl >= 0 ? "+" : ""}
                        {formatCurrency(trade.pnl)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {trade.time}
                      </div>
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
                    <CardDescription>
                      Today's performance summary
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpTip content="Snapshot of today's key metrics. Use refresh to fetch the latest." />
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
                </div>
              </CardHeader>
              <CardContent>
                {dailyReport ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Portfolio Value
                        </p>
                        <p className="text-lg font-semibold">
                          {dailyReport.portfolioValue}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Daily Change
                        </p>
                        <p className="text-lg font-semibold text-accent">
                          {dailyReport.dailyChange}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Return
                        </p>
                        <p className="text-lg font-semibold text-accent">
                          {dailyReport.totalReturn}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Active Trades
                        </p>
                        <p className="text-lg font-semibold">
                          {dailyReport.activeTrades}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last updated:{" "}
                      {new Date(dailyReport.lastUpdated).toLocaleTimeString()}
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
                    <CardDescription>
                      This week's performance analysis
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpTip content="Weekly performance summary with win rate and risk stats." />
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
                </div>
              </CardHeader>
              <CardContent>
                {weeklyReport ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Weekly Return
                        </p>
                        <p className="text-lg font-semibold text-accent">
                          {weeklyReport.weeklyReturn}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Win Rate
                        </p>
                        <p className="text-lg font-semibold">
                          {weeklyReport.winRate}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Best Performer
                        </p>
                        <p className="text-lg font-semibold text-accent">
                          {weeklyReport.bestPerformer}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Sharpe Ratio
                        </p>
                        <p className="text-lg font-semibold">
                          {weeklyReport.sharpeRatio}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last updated:{" "}
                      {new Date(weeklyReport.lastUpdated).toLocaleTimeString()}
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
                  <CardDescription>
                    Important updates and alerts
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <HelpTip content="Your latest alerts and messages. Click a notification to mark it read." />
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
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        notification.read
                          ? "bg-muted/30 border-border"
                          : "bg-card border-primary/20 shadow-sm"
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getSeverityIcon(notification.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={getSeverityBadgeVariant(
                                  notification.severity,
                                )}
                                className="text-xs"
                              >
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
