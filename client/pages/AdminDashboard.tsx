import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import apiFetch from "@/lib/apiClient";
import copy from "@/lib/clipboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  CheckCircle,
  Info,
  Clock,
  Settings,
  Shield,
  Bell,
  BarChart3,
  LineChart as LineChartIcon,
  Eye,
  EyeOff,
  Download,
  FileText,
  Copy as CopyIcon,
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
} from "recharts";
import { toast } from "@/hooks/use-toast";
import HelpTip from "@/components/ui/help-tip";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";

// Integrations of existing admin feature pages
import AdminSystemControl from "./AdminSystemControl";
import Governance from "./Governance";
import AdminPlugins from "./AdminPlugins";
import AdminStrategyReview from "./AdminStrategyReview";
import AdminSystemConfig from "./AdminSystemConfig";
import AdminFeedback from "./AdminFeedback";
import AdminPortfolio from "./AdminPortfolio";
import AdminAutomationSocial from "./AdminAutomationSocial";
import AdminPushConsole from "./AdminPushConsole";
import DataQualityTab from "./components/DataQualityTab";

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
    console.error(
      `Error in ${this.props.widgetName} widget:`,
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-center space-x-2 text-destructive">
            <Info className="h-4 w-4" />
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
    correlationMatrix: Array<{
      asset1: string;
      asset2: string;
      correlation: number;
    }>;
  };
  lastUpdated: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  timestamp: string;
  read: boolean;
  category: "system" | "trading" | "user" | "security";
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
    if (user && user.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "Admin access required for this page.",
        variant: "destructive",
      });
      window.location.href = "/dashboard";
    }
  }, [user]);

  // Reports state (kept local to this page to power Reports tab)
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [perAssetReport, setPerAssetReport] = useState<PerAssetReport | null>(
    null,
  );
  const [notificationData, setNotificationData] =
    useState<NotificationData | null>(null);
  const [expandedNotifications, setExpandedNotifications] = useState<
    Set<string>
  >(new Set());
  const [isRefreshing, setIsRefreshing] = useState({
    daily: false,
    weekly: false,
    perAsset: false,
    notifications: false,
    csv: false,
    backtest: false,
  });
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<string>("all");

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const timer = setInterval(() => {
      refreshAllData();
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [autoRefreshEnabled, refreshInterval]);

  useEffect(() => {
    if (user?.role === "admin") {
      refreshAllData();
    }
  }, [user]);

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      loadDailyReport(),
      loadWeeklyReport(),
      loadPerAssetReport(),
      loadNotifications(),
    ]);
    setLastRefresh(new Date());
  }, [showUnreadOnly, notificationFilter]);

  const loadDailyReport = async () => {
    setIsRefreshing((prev) => ({ ...prev, daily: true }));
    try {
      const response = await apiFetch("/api/reports/daily");
      const data = await response.json();
      if (data.status === "success") setDailyReport(data.data);
      else throw new Error(data.error || "Failed to load daily report");
    } catch (error) {
      console.error("Error loading daily report:", error);
      toast({
        title: "Daily Report Error",
        description: "Failed to load daily report data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing((prev) => ({ ...prev, daily: false }));
    }
  };

  const loadWeeklyReport = async () => {
    setIsRefreshing((prev) => ({ ...prev, weekly: true }));
    try {
      const response = await apiFetch("/api/reports/weekly");
      const data = await response.json();
      if (data.status === "success") setWeeklyReport(data.data);
      else throw new Error(data.error || "Failed to load weekly report");
    } catch (error) {
      console.error("Error loading weekly report:", error);
      toast({
        title: "Weekly Report Error",
        description: "Failed to load weekly report data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing((prev) => ({ ...prev, weekly: false }));
    }
  };

  const loadPerAssetReport = async () => {
    setIsRefreshing((prev) => ({ ...prev, perAsset: true }));
    try {
      const response = await apiFetch("/api/reports/per-asset");
      const data = await response.json();
      if (data.status === "success") setPerAssetReport(data.data);
      else throw new Error(data.error || "Failed to load per-asset report");
    } catch (error) {
      console.error("Error loading per-asset report:", error);
      toast({
        title: "Per-Asset Report Error",
        description: "Failed to load per-asset report data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing((prev) => ({ ...prev, perAsset: false }));
    }
  };

  const exportCSV = async (reportType: "daily" | "weekly" | "per-asset") => {
    setIsRefreshing((prev) => ({ ...prev, csv: true }));
    try {
      const response = await apiFetch(`/api/reports/export?type=${reportType}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;
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
        throw new Error(errorData.error || "Export failed");
      }
    } catch (error) {
      console.error("Export CSV error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing((prev) => ({ ...prev, csv: false }));
    }
  };

  const downloadBacktestReport = async () => {
    setIsRefreshing((prev) => ({ ...prev, backtest: true }));
    setBacktestProgress(0);
    try {
      const progressInterval = setInterval(() => {
        setBacktestProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      const response = await apiFetch("/api/reports/backtest?format=daily");
      clearInterval(progressInterval);
      setBacktestProgress(100);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backtest-report-${new Date().toISOString().split("T")[0]}.csv`;
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
            description:
              "No backtest report found. Please run a backtest first.",
            variant: "destructive",
          });
        } else {
          throw new Error(errorData.error || "Download failed");
        }
      }
    } catch (error) {
      console.error("Download backtest report error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download backtest report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing((prev) => ({ ...prev, backtest: false }));
      setBacktestProgress(0);
    }
  };

  const loadNotifications = async () => {
    setIsRefreshing((prev) => ({ ...prev, notifications: true }));
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (showUnreadOnly) params.set("unreadOnly", "true");
      if (notificationFilter !== "all") params.set("severity", notificationFilter);
      const response = await apiFetch(`/api/v1/notifications?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const j = await response.json().catch(() => ({ total:0, items:[], next:null }));
      const items = Array.isArray(j.items) ? j.items : [];
      const total = Number(j.total) || items.length;
      const summary = {
        total,
        unread: items.filter((n: any) => !n.read).length,
        actionRequired: items.filter((n: any) => n.actionRequired && !n.read).length,
        severityCounts: items.reduce((acc: any, n: any) => { acc[n.severity] = (acc[n.severity]||0)+1; return acc; }, {} as any),
      } as any;
      setNotificationData({ notifications: items, summary, pagination: { total, limit: items.length, offset: 0, hasMore: Boolean(j.next) } });
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast({ title: "Notifications Error", description: "Failed to load notifications", variant: "destructive" });
    } finally {
      setIsRefreshing((prev) => ({ ...prev, notifications: false }));
    }
  };

  const markNotificationAsRead = async (id: string, read: boolean = true) => {
    try {
      const response = await apiFetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      if (response.ok) {
        setNotificationData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === id ? { ...n, read } : n,
            ),
          };
        });
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiFetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (response.ok) {
        await loadNotifications();
        toast({
          title: "All Read",
          description: "All notifications marked as read",
        });
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const toggleNotificationExpansion = (id: string) => {
    setExpandedNotifications((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  const formatPercentage = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  const getSeverityIcon = (severity: string) =>
    ({
      error: <Info className="h-4 w-4 text-destructive" />,
      warning: <Info className="h-4 w-4 text-warning" />,
      success: <CheckCircle className="h-4 w-4 text-accent" />,
      info: <Info className="h-4 w-4 text-primary" />,
    })[severity as keyof any] || <Info className="h-4 w-4 text-primary" />;
  const getSeverityBadgeVariant = (severity: string) =>
    ({
      error: "destructive",
      warning: "secondary",
      success: "default",
      info: "outline",
    })[severity as keyof any] || "outline";

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Admin Access Required</h2>
          <p className="text-muted-foreground">
            This page requires administrator privileges.
          </p>
        </div>
      </div>
    );
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const allowedTabs = new Set([
    "controls",
    "governance",
    "plugins",
    "review",
    "config",
    "feedback",
    "portfolio",
    "automation",
    "reports",
  ]);
  const [tab, setTab] = useState<string>(() => {
    const t = searchParams.get("tab") || "controls";
    return allowedTabs.has(t) ? t : "controls";
  });

  useEffect(() => {
    const t = searchParams.get("tab") || "controls";
    if (allowedTabs.has(t) && t !== tab) setTab(t);
  }, [location.search]);

  const onChangeTab = (value: string) => {
    setTab(value);
    const params = new URLSearchParams(location.search);
    params.set("tab", value);
    navigate({ search: params.toString() }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <HelpTip content="Admin home for controls, governance, reporting, and alerts. Use tabs to navigate tools." />
          </div>
          <p className="text-muted-foreground">
            Controls, governance, reports, and operational tooling
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className="bg-accent/10 text-accent border-accent/20"
          >
            <Shield className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          {lastRefresh && (
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20"
            >
              <Clock className="h-3 w-3 mr-1" />
              {lastRefresh.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={onChangeTab} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto whitespace-nowrap gap-2">
          <TabsTrigger value="controls">
            <span className="inline-flex items-center gap-1">
              Controls{" "}
              <HelpTip content="Pause/resume trading, change modes, and access the kill switch." />
            </span>
          </TabsTrigger>
          <TabsTrigger value="governance">
            <span className="inline-flex items-center gap-1">
              Governance{" "}
              <HelpTip content="Review proposals and governance decisions affecting the system." />
            </span>
          </TabsTrigger>
          <TabsTrigger value="plugins">
            <span className="inline-flex items-center gap-1">
              Plugins{" "}
              <HelpTip content="Manage strategy plugins and extensions." />
            </span>
          </TabsTrigger>
          <TabsTrigger value="review">
            <span className="inline-flex items-center gap-1">
              Strategy Review{" "}
              <HelpTip content="Approve or reject strategy changes and promotions." />
            </span>
          </TabsTrigger>
          <TabsTrigger value="config">
            <span className="inline-flex items-center gap-1">
              Config{" "}
              <HelpTip content="Inspect and update system configuration safely." />
            </span>
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <span className="inline-flex items-center gap-1">
              Feedback{" "}
              <HelpTip content="View and triage user/admin feedback for improvements." />
            </span>
          </TabsTrigger>
          <TabsTrigger value="portfolio">
            <span className="inline-flex items-center gap-1">
              Portfolio{" "}
              <HelpTip content="Portfolio monitoring and management tools." />
            </span>
          </TabsTrigger>
          <TabsTrigger value="automation">
            <span className="inline-flex items-center gap-1">
              Automation{" "}
              <HelpTip content="Automation and social integrations to streamline workflows." />
            </span>
          </TabsTrigger>
          <TabsTrigger value="reports">
            <span className="inline-flex items-center gap-1">
              Reports{" "}
              <HelpTip content="Performance dashboards, analytics, and notifications." />
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="space-y-6">
          <AdminSystemControl />
        </TabsContent>

        <TabsContent value="governance" className="space-y-6">
          <Tabs defaultValue="proposals">
            <TabsList className="mb-4">
              <TabsTrigger value="proposals">
                <span className="inline-flex items-center gap-1">
                  Proposals{" "}
                  <HelpTip content="Review, vote, and track governance proposals and outcomes." />
                </span>
              </TabsTrigger>
              <TabsTrigger value="plugins">
                <span className="inline-flex items-center gap-1">
                  Strategy Plugins{" "}
                  <HelpTip content="Manage external strategy modules: enable, configure, and validate." />
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="proposals">
              <Governance />
            </TabsContent>
            <TabsContent value="plugins">
              <AdminPlugins />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="plugins" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">Plugins</h2>
              <HelpTip content="Install, enable, and monitor strategy plugins. Useful for extending core capabilities." />
            </div>
          </div>
          <AdminPlugins />
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">Strategy Review</h2>
              <HelpTip content="Approve/reject strategy changes and promotions; ensure quality and safety before rollout." />
            </div>
          </div>
          <AdminStrategyReview />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">System Config</h2>
              <HelpTip content="View effective configuration, compare overrides, and safely update settings." />
            </div>
          </div>
          <AdminSystemConfig />
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">Feedback</h2>
              <HelpTip content="Collect and triage feedback from users and admins for continuous improvement." />
            </div>
          </div>
          <AdminFeedback />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">Portfolio Management</h2>
              <HelpTip content="Monitor portfolios, run rebalances, and inspect history with audit trails." />
            </div>
          </div>
          <AdminPortfolio />
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">Automation & Messaging</h2>
              <HelpTip content="Automate workflows, broadcast alerts, and test push/mobile delivery." />
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <AdminAutomationSocial />
            </div>
            <div className="space-y-6">
              <AdminPushConsole />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Auto-refresh Settings (reports-only) */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Dashboard Settings</span>
                </CardTitle>
                <HelpTip content="Control auto-refresh and manually refresh all widgets." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefreshEnabled}
                    onCheckedChange={setAutoRefreshEnabled}
                  />
                  <Label
                    htmlFor="auto-refresh"
                    className="inline-flex items-center gap-2"
                  >
                    Auto-refresh{" "}
                    <HelpTip content="Automatically refresh dashboard data at the configured interval." />
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Label
                    htmlFor="refresh-interval"
                    className="inline-flex items-center gap-2"
                  >
                    Interval{" "}
                    <HelpTip content="How often to refresh dashboard widgets when auto-refresh is enabled." />
                  </Label>
                  <Select
                    value={refreshInterval.toString()}
                    onValueChange={(value) =>
                      setRefreshInterval(parseInt(value))
                    }
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

          {/* Reports inner tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex w-full overflow-x-auto whitespace-nowrap gap-2">
              <TabsTrigger value="overview">
                <span className="inline-flex items-center gap-1">
                  Overview{" "}
                  <HelpTip content="Key metrics and charts at a glance." />
                </span>
              </TabsTrigger>
              <TabsTrigger value="reporting">
                <span className="inline-flex items-center gap-1">
                  Reports{" "}
                  <HelpTip content="Detailed daily and weekly reports." />
                </span>
              </TabsTrigger>
              <TabsTrigger value="per-asset">
                <span className="inline-flex items-center gap-1">
                  Per-Asset{" "}
                  <HelpTip content="Deep dive into each asset's metrics." />
                </span>
              </TabsTrigger>
              <TabsTrigger value="data-quality">
                <span className="inline-flex items-center gap-1">
                  Data Quality{" "}
                  <HelpTip content="Monitor anomalies in market data feeds and ingestion." />
                </span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="relative">
                <span className="inline-flex items-center gap-1">
                  Notifications{" "}
                  <HelpTip content="System alerts and messages; unread count shown." />
                </span>
                {notificationData?.summary.unread > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {notificationData.summary.unread}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <WidgetErrorBoundary widgetName="Key Metrics">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium inline-flex items-center gap-1">
                        Daily Returns{" "}
                        <HelpTip content="Net returns generated today across all portfolios." />
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-accent">
                        {dailyReport
                          ? formatCurrency(dailyReport.totalReturn)
                          : "--"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <TrendingUp className="inline h-3 w-3 mr-1" />
                        {dailyReport
                          ? formatPercentage(dailyReport.totalReturnPercent)
                          : "--"}{" "}
                        from yesterday
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium inline-flex items-center gap-1">
                        Active Portfolios{" "}
                        <HelpTip content="Number of portfolios currently managed by the system." />
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dailyReport ? dailyReport.activePortfolios : "--"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        System managed
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium inline-flex items-center gap-1">
                        Avg Performance{" "}
                        <HelpTip content="Average performance relative to benchmark for today." />
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-accent">
                        {dailyReport
                          ? formatPercentage(dailyReport.avgPerformance)
                          : "--"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Above benchmark
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium inline-flex items-center gap-1">
                        Top Performer{" "}
                        <HelpTip content="Best-performing asset for the selected period." />
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dailyReport ? dailyReport.topPerformer.asset : "--"}
                      </div>
                      <p className="text-xs text-accent">
                        {dailyReport
                          ? formatPercentage(
                              dailyReport.topPerformer.performance,
                            )
                          : "--"}{" "}
                        today
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </WidgetErrorBoundary>

              <div className="grid gap-6 lg:grid-cols-2">
                <WidgetErrorBoundary widgetName="Daily Returns Chart">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <LineChartIcon className="h-5 w-5" />
                            <span>Daily Returns Trend</span>
                            <HelpTip content="Line chart of daily returns vs benchmark over the last 7 days." />
                          </CardTitle>
                          <CardDescription>
                            7-day performance vs benchmark
                          </CardDescription>
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
                            <HelpTip content="Weekly returns per asset to compare relative performance." />
                          </CardTitle>
                          <CardDescription>
                            Weekly returns by asset
                          </CardDescription>
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

            <TabsContent value="reporting" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <WidgetErrorBoundary widgetName="Daily Report">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="inline-flex items-center gap-2">
                            Daily Report{" "}
                            <HelpTip content="Summary of today's performance metrics and risk figures." />
                          </CardTitle>
                          <CardDescription>
                            Today's performance summary
                          </CardDescription>
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
                              <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
                                Total Return{" "}
                                <HelpTip content="Absolute profit/loss in currency over the selected period." />
                              </p>
                              <p className="text-lg font-semibold text-accent">
                                {formatCurrency(dailyReport.totalReturn)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
                                Performance{" "}
                                <HelpTip content="Percentage return over the selected period." />
                              </p>
                              <p className="text-lg font-semibold">
                                {formatPercentage(dailyReport.avgPerformance)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
                                Sharpe Ratio{" "}
                                <HelpTip content="Risk-adjusted return: (return − risk‑free rate) ÷ volatility. Values >1 are generally good." />
                              </p>
                              <p className="text-lg font-semibold">
                                {dailyReport.riskMetrics.sharpeRatio.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
                                Max Drawdown{" "}
                                <HelpTip content="Largest peak‑to‑trough decline over the period. Lower magnitude indicates better capital preservation." />
                              </p>
                              <p className="text-lg font-semibold text-destructive">
                                {formatPercentage(
                                  dailyReport.riskMetrics.maxDrawdown,
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Top: {dailyReport.topPerformer.asset}
                              </span>
                              <span className="text-accent">
                                {formatPercentage(
                                  dailyReport.topPerformer.performance,
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Bottom: {dailyReport.bottomPerformer.asset}
                              </span>
                              <span className="text-destructive">
                                {formatPercentage(
                                  dailyReport.bottomPerformer.performance,
                                )}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Last updated:{" "}
                            {new Date(
                              dailyReport.lastUpdated,
                            ).toLocaleTimeString()}
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

                <WidgetErrorBoundary widgetName="Weekly Report">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="inline-flex items-center gap-2">
                            Weekly Report{" "}
                            <HelpTip content="Aggregated performance over the past 7 days, with trade and risk stats." />
                          </CardTitle>
                          <CardDescription>
                            7-day performance analysis
                          </CardDescription>
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
                              <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
                                Weekly Return{" "}
                                <HelpTip content="Total P/L in currency over the last 7 days." />
                              </p>
                              <p className="text-lg font-semibold text-accent">
                                {formatCurrency(weeklyReport.weeklyReturn)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
                                Win Rate{" "}
                                <HelpTip content="Portion of trades that were profitable (wins ÷ total trades)." />
                              </p>
                              <p className="text-lg font-semibold">
                                {formatPercentage(weeklyReport.winRate * 100)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
                                Total Trades{" "}
                                <HelpTip content="Number of executed trades during the week." />
                              </p>
                              <p className="text-lg font-semibold">
                                {weeklyReport.totalTrades}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-1">
                                Avg Hold Time{" "}
                                <HelpTip content="Average time positions were held before closing." />
                              </p>
                              <p className="text-lg font-semibold">
                                {weeklyReport.avgHoldTime.toFixed(1)}h
                              </p>
                            </div>
                          </div>
                          <div className="pt-2 border-t space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground inline-flex items-center gap-1">
                                Information Ratio{" "}
                                <HelpTip content="Excess return vs benchmark per unit of tracking error (std. dev. of active returns)." />
                              </span>
                              <span>
                                {weeklyReport.performanceMetrics.informationRatio.toFixed(
                                  2,
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground inline-flex items-center gap-1">
                                Calmar Ratio{" "}
                                <HelpTip content="Return divided by maximum drawdown; higher indicates better drawdown-adjusted performance." />
                              </span>
                              <span>
                                {weeklyReport.performanceMetrics.calmarRatio.toFixed(
                                  2,
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground inline-flex items-center gap-1">
                                Sortino Ratio{" "}
                                <HelpTip content="Like Sharpe but only penalizes downside (bad) volatility." />
                              </span>
                              <span>
                                {weeklyReport.performanceMetrics.sortinoRatio.toFixed(
                                  2,
                                )}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Last updated:{" "}
                            {new Date(
                              weeklyReport.lastUpdated,
                            ).toLocaleTimeString()}
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

              <WidgetErrorBoundary widgetName="Export Controls">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Download className="h-5 w-5" />
                      <span>Export & Download</span>
                      <HelpTip content="Export CSVs for reports and download the latest backtest output." />
                    </CardTitle>
                    <CardDescription>
                      Export report data and download backtest results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Button
                        variant="outline"
                        onClick={() => exportCSV("daily")}
                        disabled={isRefreshing.csv}
                        className="w-full"
                      >
                        {isRefreshing.csv ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Daily CSV
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => exportCSV("weekly")}
                        disabled={isRefreshing.csv}
                        className="w-full"
                      >
                        {isRefreshing.csv ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Weekly CSV
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => exportCSV("per-asset")}
                        disabled={isRefreshing.csv}
                        className="w-full"
                      >
                        {isRefreshing.csv ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Per-Asset CSV
                      </Button>
                      <Button
                        onClick={downloadBacktestReport}
                        disabled={isRefreshing.backtest}
                        className="w-full"
                      >
                        {isRefreshing.backtest ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        Backtest Report
                      </Button>
                    </div>
                    {isRefreshing.backtest && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Preparing download...</span>
                          <span>{backtestProgress}%</span>
                        </div>
                        <Progress value={backtestProgress} className="w-full" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </WidgetErrorBoundary>
            </TabsContent>

            <TabsContent value="per-asset" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold">
                      Per-Asset Analysis
                    </h2>
                    <HelpTip content="Breakdown of metrics per asset to identify outliers and rebalance needs." />
                  </div>
                  <p className="text-muted-foreground">
                    Detailed performance breakdown by asset
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={loadPerAssetReport}
                  disabled={isRefreshing.perAsset}
                >
                  {isRefreshing.perAsset ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>

              {perAssetReport ? (
                <div className="space-y-6">
                  <WidgetErrorBoundary widgetName="Asset Summary">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Total Assets
                          </CardTitle>
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {perAssetReport.summary.totalAssets}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium inline-flex items-center gap-1">
                            Top Performer{" "}
                            <HelpTip content="Best-performing asset for the selected period." />
                          </CardTitle>
                          <TrendingUp className="h-4 w-4 text-accent" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-lg font-bold">
                            {perAssetReport.summary.topPerformer.symbol}
                          </div>
                          <p className="text-xs text-accent">
                            {formatPercentage(
                              perAssetReport.summary.topPerformer.return,
                            )}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Bottom Performer
                          </CardTitle>
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-lg font-bold">
                            {perAssetReport.summary.bottomPerformer.symbol}
                          </div>
                          <p className="text-xs text-destructive">
                            {formatPercentage(
                              perAssetReport.summary.bottomPerformer.return,
                            )}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Avg Volatility
                          </CardTitle>
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {perAssetReport.summary.avgVolatility.toFixed(1)}%
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </WidgetErrorBoundary>

                  <WidgetErrorBoundary widgetName="Asset Performance">
                    <Card>
                      <CardHeader>
                        <CardTitle className="inline-flex items-center gap-2">
                          Asset Performance Summary{" "}
                          <HelpTip content="Detailed KPIs across all tracked assets (returns, allocation, volatility)." />
                        </CardTitle>
                        <CardDescription>
                          Performance metrics for all tracked assets
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-96 w-full">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">
                                  <div className="inline-flex items-center gap-1">
                                    Asset{" "}
                                    <HelpTip content="Ticker and asset name." />
                                  </div>
                                </th>
                                <th className="text-right p-2">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    Price{" "}
                                    <HelpTip content="Latest traded price." />
                                  </div>
                                </th>
                                <th className="text-right p-2">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    Daily %{" "}
                                    <HelpTip content="Price percent change since yesterday." />
                                  </div>
                                </th>
                                <th className="text-right p-2">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    Weekly %{" "}
                                    <HelpTip content="Price percent change over the last 7 days." />
                                  </div>
                                </th>
                                <th className="text-right p-2">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    Monthly %{" "}
                                    <HelpTip content="Return percent over the past month." />
                                  </div>
                                </th>
                                <th className="text-right p-2">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    Allocation{" "}
                                    <HelpTip content="Percent of portfolio invested in the asset." />
                                  </div>
                                </th>
                                <th className="text-right p-2">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    Volatility{" "}
                                    <HelpTip content="Return variability; higher means more risk." />
                                  </div>
                                </th>
                                <th className="text-right p-2">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    Sharpe{" "}
                                    <HelpTip content="Risk-adjusted return: (return − risk‑free) ÷ volatility." />
                                  </div>
                                </th>
                                <th className="text-right p-2">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    Trades{" "}
                                    <HelpTip content="Number of trades used to compute these metrics." />
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {perAssetReport.assets.map((asset) => (
                                <tr
                                  key={asset.symbol}
                                  className="border-b hover:bg-muted/50"
                                >
                                  <td className="p-2">
                                    <div>
                                      <div className="font-semibold">
                                        {asset.symbol}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {asset.name}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-right p-2">
                                    {formatCurrency(asset.currentPrice)}
                                  </td>
                                  <td
                                    className={`text-right p-2 ${asset.dailyChange >= 0 ? "text-accent" : "text-destructive"}`}
                                  >
                                    {formatPercentage(asset.dailyChange)}
                                  </td>
                                  <td
                                    className={`text-right p-2 ${asset.weeklyChange >= 0 ? "text-accent" : "text-destructive"}`}
                                  >
                                    {formatPercentage(asset.weeklyChange)}
                                  </td>
                                  <td
                                    className={`text-right p-2 ${asset.monthlyChange >= 0 ? "text-accent" : "text-destructive"}`}
                                  >
                                    {formatPercentage(asset.monthlyChange)}
                                  </td>
                                  <td className="text-right p-2">
                                    {asset.allocation}%
                                  </td>
                                  <td className="text-right p-2">
                                    {asset.volatility.toFixed(2)}%
                                  </td>
                                  <td className="text-right p-2">
                                    {asset.sharpeRatio.toFixed(2)}
                                  </td>
                                  <td className="text-right p-2">
                                    {asset.trades}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </WidgetErrorBoundary>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="data-quality" className="space-y-6">
              {/* Data Quality Tab Component */}
              <DataQualityTab />
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
                          <HelpTip content="Alerts and messages from trading, system, and security components." />
                          {notificationData?.summary.unread > 0 && (
                            <Badge variant="destructive">
                              {notificationData.summary.unread} unread
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Alerts, updates, and system messages
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const payload = JSON.stringify(notificationData ? { notifications: notificationData.notifications } : { notifications: [] }, null, 2);
                            const ok = await copy(payload);
                            toast({ title: ok ? "Copied" : "Copy failed" });
                          }}
                        >
                          <CopyIcon className="h-4 w-4 mr-1" /> Copy JSON
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const payload = JSON.stringify(notificationData ? { notifications: notificationData.notifications } : { notifications: [] }, null, 2);
                            const blob = new Blob([payload], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "notifications.json";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" /> Download JSON
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
                    <div className="flex items-center space-x-4 mb-4 pb-4 border-b">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="unread-only"
                          checked={showUnreadOnly}
                          onCheckedChange={setShowUnreadOnly}
                        />
                        <Label
                          htmlFor="unread-only"
                          className="inline-flex items-center gap-2"
                        >
                          Show unread only{" "}
                          <HelpTip content="Only display notifications that have not been marked read." />
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="inline-flex items-center gap-2 text-sm">
                          <span>Severity</span>
                          <HelpTip content="Filter notifications by severity level." />
                        </div>
                        <Select
                          value={notificationFilter}
                          onValueChange={setNotificationFilter}
                        >
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
                    </div>

                    {notificationData && (
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold">
                            {notificationData.summary.total}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total
                          </div>
                        </div>
                        <div className="text-center p-3 bg-destructive/10 rounded-lg">
                          <div className="text-lg font-bold text-destructive">
                            {notificationData.summary.severityCounts.error || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Errors
                          </div>
                        </div>
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <div className="text-lg font-bold text-primary">
                            {notificationData.summary.severityCounts.warning ||
                              0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Warnings
                          </div>
                        </div>
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <div className="text-lg font-bold text-primary">
                            {notificationData.summary.actionRequired}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Action Required
                          </div>
                        </div>
                      </div>
                    )}

                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {notificationData?.notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg border transition-colors ${notification.read ? "bg-muted/30 border-border" : "bg-card border-primary/20 shadow-sm"}`}
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
                                    {notification.actionRequired && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-primary/10"
                                      >
                                        Action Required
                                      </Badge>
                                    )}
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                                    )}
                                  </div>
                                </div>
                                <p
                                  className={`text-sm text-muted-foreground mt-1 ${expandedNotifications.has(notification.id) ? "" : "line-clamp-2"}`}
                                >
                                  {notification.message}
                                </p>
                                {expandedNotifications.has(notification.id) &&
                                  notification.metadata && (
                                    <div className="mt-3 p-3 bg-muted/50 rounded text-xs">
                                      <div className="font-medium mb-1">
                                        Additional Details:
                                      </div>
                                      <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(
                                          notification.metadata,
                                          null,
                                          2,
                                        )}
                                      </pre>
                                    </div>
                                  )}
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {new Date(
                                      notification.timestamp,
                                    ).toLocaleString()}
                                    <span className="mx-2">•</span>
                                    <span className="capitalize">
                                      {notification.category}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {notification.metadata && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          toggleNotificationExpansion(
                                            notification.id,
                                          )
                                        }
                                      >
                                        {expandedNotifications.has(
                                          notification.id,
                                        ) ? (
                                          <EyeOff className="h-3 w-3" />
                                        ) : (
                                          <Eye className="h-3 w-3" />
                                        )}
                                      </Button>
                                    )}
                                    <span className="text-xs text-muted-foreground">Mark-as-read not supported</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )) || []}

                        {(!notificationData ||
                          notificationData.notifications.length === 0) && (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
