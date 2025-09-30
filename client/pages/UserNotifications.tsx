import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import apiFetch from "@/lib/apiClient";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  RefreshCw,
  Filter,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  AlertCircle,
  User,
  Settings as SettingsIcon,
  Shield,
  Download,
  Copy as CopyIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import HelpTip from "@/components/ui/help-tip";
import copy from "@/lib/clipboard";

// Types
interface Notification {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  timestamp: string;
  read?: boolean;
  category?: "system" | "trading" | "user" | "security" | string;
  actionRequired?: boolean;
  metadata?: any;
}

interface NotificationsResponse {
  total: number;
  items: Notification[];
  next: number | null;
}

const SEVERITY_COLORS = {
  error: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
  success: "bg-green-100 text-green-800 border-green-200",
};

const SEVERITY_ICONS = {
  error: AlertCircle,
  warning: AlertCircle,
  info: AlertCircle,
  success: CheckCircle2,
};

const CATEGORY_ICONS = {
  system: SettingsIcon,
  trading: RefreshCw,
  user: User,
  security: Shield,
};

export default function UserNotifications() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [prefs, setPrefs] = useState<{
    supported_channels: string[];
    channels: Record<string, boolean>;
  } | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  // URL-based filter and pagination state
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("limit") || "10", 10);
  const severityFilter = searchParams.get("severity") || "all";
  const categoryFilter = searchParams.get("category") || "all";
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const getSeverityIcon = (severity: string) => {
    const Icon =
      SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };
  const getCategoryIcon = (category?: string) => {
    const Icon = category ? (CATEGORY_ICONS as any)[category] : null;
    const C = Icon || AlertCircle;
    return <C className="h-4 w-4" />;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60),
    );
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return time.toLocaleDateString();
  };

  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all")
          params.delete(key);
        else params.set(key, value);
      });
      if (!newParams.page) params.delete("page");
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  // Load preferences (graceful)
  const loadPreferences = useCallback(async () => {
    try {
      const r = await apiFetch("/api/v1/notifications/preferences");
      if (!r.ok) return;
      const j = await r.json().catch(() => null);
      if (j?.status === "success") setPrefs(j.data);
    } catch (e) {
      console.warn("loadPreferences error", e);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!isLoading) setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", pageSize.toString());
      // Best-effort filters; backend may support these
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (unreadOnly) params.set("unreadOnly", "true");
      // Offset-based paging if supported
      const offset = (currentPage - 1) * pageSize;
      if (offset > 0) params.set("offset", String(offset));

      let response: Response | null = null;
      try {
        response = await apiFetch(`/api/v1/notifications?${params}`);
      } catch (e1) {
        console.warn("Network error, retrying /api/v1/notifications", e1);
        await new Promise((r) => setTimeout(r, 600));
        response = await apiFetch(`/api/v1/notifications?${params}`);
      }

      if (!response.ok && response.status === 503) {
        setDegraded(true);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const j: NotificationsResponse = await response
        .json()
        .catch(
          () => ({ total: 0, items: [], next: null }) as NotificationsResponse,
        );

      setData({
        total: j.total || 0,
        items: Array.isArray(j.items) ? j.items : [],
        next: j.next ?? null,
      });
      setNextCursor(j.next ?? null);
      setDegraded(false);
    } catch (error: any) {
      console.error("Load notifications error:", error);
      setDegraded(true);
      toast({
        title: "Notifications",
        description: "Backend unavailable; showing degraded state.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, severityFilter, categoryFilter, unreadOnly]);

  // Load notifications when filters change
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return;
    const t = window.setInterval(() => loadNotifications(), 30000);
    return () => window.clearInterval(t);
  }, [autoRefresh, loadNotifications]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Please log in to view notifications.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Derived summary
  const total = data?.total || 0;
  const unread = (data?.items || []).filter((n) => !n.read).length;
  const actionRequired = (data?.items || []).filter(
    (n) => (n as any).actionRequired && !n.read,
  ).length;
  const severityCounts: Record<string, number> = {
    error: 0,
    warning: 0,
    info: 0,
    success: 0,
  };
  for (const n of data?.items || [])
    severityCounts[n.severity] = (severityCounts[n.severity] || 0) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goToPage = (page: number) => updateFilters({ page: page.toString() });
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(Math.max(1, currentPage - 1));
  const goToNextPage = () => goToPage(Math.min(totalPages, currentPage + 1));

  const toggleExpansion = (id: string) => {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleCopyJson = async () => {
    const payload = JSON.stringify(
      {
        total: data?.total || 0,
        items: data?.items || [],
        next: data?.next ?? null,
      },
      null,
      2,
    );
    const ok = await copy(payload);
    toast({
      title: ok ? "Copied" : "Copy failed",
      description: ok ? "JSON copied" : "Unable to copy",
    });
  };
  const handleDownloadJson = async () => {
    const payload = JSON.stringify(
      {
        total: data?.total || 0,
        items: data?.items || [],
        next: data?.next ?? null,
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notifications.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Bell className="h-8 w-8" />
            <span>Notifications</span>
          </h1>
          <p className="text-muted-foreground">
            Live system alerts and messages
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 mr-2 text-sm">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh">Auto-refresh 30s</Label>
          </div>
          <Button variant="outline" onClick={handleCopyJson}>
            <CopyIcon className="h-4 w-4 mr-2" /> Copy JSON
          </Button>
          <Button variant="outline" onClick={handleDownloadJson}>
            <Download className="h-4 w-4 mr-2" /> Download JSON
          </Button>
          <Button
            variant="outline"
            onClick={loadNotifications}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {degraded && (
        <Alert>
          <AlertDescription>
            Degraded mode: backend notifications API unavailable. Pagination may
            be limited.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute right-2 top-2">
                <HelpTip
                  content="Total notifications in the system (server-reported)."
                  side="left"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute right-2 top-2">
                <HelpTip
                  content="Unread notifications from the current query."
                  side="left"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{unread}</div>
                <div className="text-xs text-muted-foreground">Unread</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute right-2 top-2">
                <HelpTip
                  content="Requires attention from the current query."
                  side="left"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {actionRequired}
                </div>
                <div className="text-xs text-muted-foreground">
                  Action Required
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute right-2 top-2">
                <HelpTip
                  content="Count of warnings in the current query."
                  side="left"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {severityCounts.warning || 0}
                </div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
            <HelpTip
              content="Refine by severity, category, page size, and unread status."
              side="left"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Severity</Label>
                <HelpTip content="Filter by severity level." side="right" />
              </div>
              <Select
                value={severityFilter}
                onValueChange={(v) => updateFilters({ severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Category</Label>
                <HelpTip content="Filter by category." side="right" />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={(v) => updateFilters({ category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Page Size</Label>
                <HelpTip
                  content="How many notifications per page."
                  side="right"
                />
              </div>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => updateFilters({ limit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="unread-only"
                checked={unreadOnly}
                onCheckedChange={(checked) =>
                  updateFilters({ unreadOnly: checked ? "true" : null })
                }
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="unread-only">Show unread only</Label>
                <HelpTip
                  content="Show only unread notifications."
                  side="right"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      {prefs && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Select channels for alerts</CardDescription>
              </div>
              <HelpTip
                content="Choose which channels deliver your notifications."
                side="left"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              {prefs.supported_channels.includes("email") && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!prefs.channels.email}
                    onChange={(e) =>
                      setPrefs((p) =>
                        p
                          ? {
                              ...p,
                              channels: {
                                ...p.channels,
                                email: e.target.checked,
                              },
                            }
                          : p,
                      )
                    }
                  />
                  <span>Email</span>
                </label>
              )}
              {prefs.supported_channels.includes("slack") && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!prefs.channels.slack}
                    onChange={(e) =>
                      setPrefs((p) =>
                        p
                          ? {
                              ...p,
                              channels: {
                                ...p.channels,
                                slack: e.target.checked,
                              },
                            }
                          : p,
                      )
                    }
                  />
                  <span>Slack</span>
                </label>
              )}
              {prefs.supported_channels.includes("telegram") && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!prefs.channels.telegram}
                    onChange={(e) =>
                      setPrefs((p) =>
                        p
                          ? {
                              ...p,
                              channels: {
                                ...p.channels,
                                telegram: e.target.checked,
                              },
                            }
                          : p,
                      )
                    }
                  />
                  <span>Telegram</span>
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    const r = await apiFetch(
                      "/api/v1/notifications/preferences",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ channels: prefs.channels }),
                      },
                    );
                    const j = await r.json();
                    if (!r.ok || j.status !== "success")
                      throw new Error(j.error || "Failed");
                    toast({
                      title: "Saved",
                      description: "Preferences updated",
                    });
                  } catch (e: any) {
                    toast({
                      title: "Error",
                      description: e.message || "Failed",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Save Preferences
              </Button>
              <Button variant="outline" onClick={loadPreferences}>
                Reload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>
              {data
                ? `${total} Notification${total !== 1 ? "s" : ""}`
                : "Loading..."}
            </CardTitle>
            <HelpTip
              content="View notifications. Mark-as-read is not supported by the backend yet."
              side="left"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="space-y-4">
              {data.items.map((n) => {
                const isExpanded = expanded.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`p-4 border rounded-lg transition-colors ${n.read ? "bg-muted/20" : "bg-background border-primary/20"}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">{getCategoryIcon(n.category)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3
                                className={`font-medium ${n.read ? "text-muted-foreground" : "text-foreground"}`}
                              >
                                {n.title}
                              </h3>
                              <Badge
                                className={`${SEVERITY_COLORS[n.severity]} border`}
                                variant="outline"
                              >
                                <span className="flex items-center space-x-1">
                                  {getSeverityIcon(n.severity)}
                                  <span className="capitalize">
                                    {n.severity}
                                  </span>
                                </span>
                              </Badge>
                              {n.actionRequired && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Action Required
                                </Badge>
                              )}
                            </div>
                            <p
                              className={`text-sm ${n.read ? "text-muted-foreground" : "text-foreground"} ${isExpanded ? "" : "line-clamp-2"}`}
                            >
                              {n.message}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTimeAgo(n.timestamp)}</span>
                              </div>
                              {n.category && (
                                <Badge variant="outline" className="text-xs">
                                  {n.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {n.metadata && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpansion(n.id)}
                              >
                                {isExpanded ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        {isExpanded && n.metadata && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md">
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">
                              Additional Details:
                            </h4>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {JSON.stringify(n.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="mt-3 flex items-center justify-center">
                <Button
                  variant="outline"
                  disabled={!nextCursor}
                  onClick={() =>
                    updateFilters({ page: String(currentPage + 1) })
                  }
                >
                  Load more
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No notifications found
              </h3>
              <p className="text-sm text-muted-foreground">
                {unreadOnly
                  ? "No unread notifications available."
                  : "You're all caught up!"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <Card>
          <CardContent className="pt-6 relative">
            <div className="absolute right-2 top-2">
              <HelpTip
                content="Pagination controls to navigate through notifications."
                side="left"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, total)} of {total}{" "}
                  notifications
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Page</span>
                    <HelpTip
                      content="Go to a specific page number."
                      side="top"
                    />
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value, 10);
                      if (page >= 1 && page <= totalPages) goToPage(page);
                    }}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-sm text-muted-foreground">
                    of {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        Mark-as-read is not supported yet by the backend. JSON export available
        above.
      </div>
    </div>
  );
}
