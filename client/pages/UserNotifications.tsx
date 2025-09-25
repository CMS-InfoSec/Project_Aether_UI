import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  RefreshCw,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import HelpTip from "@/components/ui/help-tip";

// Types
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

const SEVERITY_COLORS = {
  error: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
  success: "bg-green-100 text-green-800 border-green-200",
};

const SEVERITY_ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
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
  const [notifications, setNotifications] = useState<NotificationData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState<
    Set<string>
  >(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [prefs, setPrefs] = useState<{
    supported_channels: string[];
    channels: Record<string, boolean>;
  } | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<any | null>(null);
  const [pushStatus, setPushStatus] = useState<any | null>(null);
  const [pushForm, setPushForm] = useState({
    token: "",
    title: "",
    body: "",
    url: "",
    nonce: "",
  });

  // URL-based filter and pagination state
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("limit") || "10", 10);
  const severityFilter = searchParams.get("severity") || "all";
  const categoryFilter = searchParams.get("category") || "all";
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  // Utility functions
  const getSeverityIcon = (severity: string) => {
    const IconComponent =
      SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || Info;
    return <IconComponent className="h-4 w-4" />;
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent =
      CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Info;
    return <IconComponent className="h-4 w-4" />;
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

  // Update URL parameters
  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Reset to page 1 when filters change (except when only page changes)
      if (!newParams.page) {
        params.delete("page");
      }

      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  // Helper: obtain a native fetch (bypasses patched window.fetch from extensions)
  const getNativeFetch = async (): Promise<typeof fetch> => {
    const w = window as any;
    if (w.__nativeFetch) return w.__nativeFetch;
    // If we previously created a persistent iframe, try to use it
    if (w.__nativeFetchIframe) {
      try {
        w.__nativeFetch = (
          w.__nativeFetchIframe.contentWindow as any
        ).fetch.bind(w.__nativeFetchIframe.contentWindow);
        return w.__nativeFetch;
      } catch {}
    }
    const isPatched =
      typeof w.fetch === "function" && !/\[native code\]/.test(String(w.fetch));
    if (!isPatched) {
      w.__nativeFetch = w.fetch.bind(w);
      return w.__nativeFetch;
    }

    // Create a persistent hidden iframe on same origin to obtain an unpatched fetch
    return await new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.setAttribute("aria-hidden", "true");
      iframe.src = window.location.origin;

      const onLoad = () => {
        try {
          const contentWindow = iframe.contentWindow as any;
          if (!contentWindow || typeof contentWindow.fetch !== "function") {
            w.__nativeFetch = w.fetch.bind(w);
            w.__nativeFetchIframe = iframe;
            resolve(w.__nativeFetch);
            return;
          }
          w.__nativeFetch = contentWindow.fetch.bind(contentWindow);
          w.__nativeFetchIframe = iframe;
          resolve(w.__nativeFetch);
        } catch {
          w.__nativeFetch = w.fetch.bind(w);
          w.__nativeFetchIframe = iframe;
          resolve(w.__nativeFetch);
        }
      };

      iframe.onload = onLoad;
      document.body.appendChild(iframe);

      // Fallback: if iframe doesn't load in time, use window.fetch but keep iframe in DOM for later
      const to = window.setTimeout(() => {
        if (!w.__nativeFetch) {
          try {
            w.__nativeFetch = w.fetch.bind(w);
            w.__nativeFetchIframe = iframe;
          } catch {}
          resolve(w.__nativeFetch);
        }
        clearTimeout(to);
      }, 3000);

      // Ensure iframe is removed on unload to avoid leaks
      window.addEventListener(
        "unload",
        () => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        },
        { once: true },
      );
    });
  };

  // Helper: safe fetch with timeout using native fetch, with fallbacks and clearer error messages
  const safeFetch = async (
    input: RequestInfo,
    init?: RequestInit,
    timeout = 10000,
  ) => {
    if (!navigator.onLine) {
      throw new Error("Offline: network unavailable");
    }

    const controller = new AbortController();
    const id = window.setTimeout(() => controller.abort(), timeout);

    const finalInit: RequestInit = {
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
      ...(init || {}),
    } as RequestInit;

    const xhrFetch = (url: string, opts: RequestInit) => {
      return new Promise<any>((resolve, reject) => {
        try {
          const xhr = new XMLHttpRequest();
          const method = (opts.method || "GET").toUpperCase();
          xhr.open(method, url, true);
          xhr.responseType = "text";

          // Credentials handling: for same-origin or include, set withCredentials
          if (
            opts.credentials === "include" ||
            opts.credentials === "same-origin"
          )
            xhr.withCredentials = true;

          // Timeout handling
          xhr.timeout = timeout;

          // Headers
          const headers = (opts.headers || {}) as Record<string, string>;
          Object.entries(headers).forEach(([k, v]) => {
            try {
              xhr.setRequestHeader(k, v);
            } catch {}
          });

          // Abort support
          const signal = opts.signal as AbortSignal | undefined;
          const onAbort = () => {
            try {
              xhr.abort();
            } catch {}
            reject(new DOMException("Aborted", "AbortError"));
          };
          if (signal) {
            if (signal.aborted) return onAbort();
            signal.addEventListener("abort", onAbort, { once: true });
          }

          xhr.onload = () => {
            const headersStr = xhr.getAllResponseHeaders() || "";
            const headersObj: Record<string, string> = {};
            headersStr
              .trim()
              .split(/\r?\n/)
              .forEach((line) => {
                const idx = line.indexOf(":");
                if (idx > -1) {
                  const name = line.slice(0, idx).trim();
                  const value = line.slice(idx + 1).trim();
                  headersObj[name] = value;
                }
              });

            const res = {
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: {
                get: (k: string) => headersObj[k] ?? null,
              },
              text: async () => xhr.responseText,
              json: async () => {
                try {
                  return JSON.parse(xhr.responseText);
                } catch {
                  return Promise.reject(new Error("Invalid JSON"));
                }
              },
            };
            resolve(res);
          };

          xhr.onerror = () => reject(new Error("Network request failed"));
          xhr.ontimeout = () => reject(new Error("Request timed out"));

          // Send body for non-GET methods
          if (method === "GET" || method === "HEAD") xhr.send();
          else xhr.send(opts.body as any);
        } catch (e) {
          reject(e);
        }
      });
    };

    try {
      // If global fetch appears to be monkey-patched (e.g. FullStory), skip calling it and use XHR directly
      const w = window as any;
      const globalFetchPatched =
        typeof w.fetch === "function" &&
        !/\[native code\]/.test(String(w.fetch));
      if (globalFetchPatched) {
        try {
          const url =
            typeof input === "string" ? input : (input as Request).url;
          const xhrResp = await xhrFetch(url, finalInit);
          clearTimeout(id);
          return xhrResp;
        } catch (xhrErr) {
          clearTimeout(id);
          if ((xhrErr as any)?.name === "AbortError") throw xhrErr;
          throw new Error(
            (xhrErr && (xhrErr as any).message) || "Network request failed",
          );
        }
      }

      // Primary: try to use the unpatched/native fetch obtained from iframe (if needed)
      const nativeFetch = await getNativeFetch();
      try {
        const response = await nativeFetch(input as any, finalInit as any);
        clearTimeout(id);
        return response;
      } catch (nativeErr) {
        // If native fetch fails, fall back to window.fetch and log details
        console.warn(
          "nativeFetch failed, falling back to window.fetch",
          nativeErr,
        );
      }

      // Fallback: try the global window.fetch
      try {
        const response = await window.fetch(input as any, finalInit);
        clearTimeout(id);
        return response;
      } catch (winErr) {
        console.warn("window.fetch failed as fallback", winErr);
        // Try XHR fallback, which bypasses any fetch wrappers
        try {
          const url =
            typeof input === "string" ? input : (input as Request).url;
          const xhrResp = await xhrFetch(url, finalInit);
          clearTimeout(id);
          return xhrResp;
        } catch (xhrErr) {
          clearTimeout(id);
          // Differentiate abort vs network errors
          if ((xhrErr as any)?.name === "AbortError") throw xhrErr;
          throw new Error(
            (xhrErr && (xhrErr as any).message) || "Network request failed",
          );
        }
      }
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  // Load preferences (graceful)
  const loadPreferences = useCallback(async () => {
    try {
      const r = await safeFetch("/api/notifications/preferences");
      if (!r.ok) return;
      const j = await r.json().catch(() => null);
      if (j?.status === "success") setPrefs(j.data);
    } catch (e) {
      console.warn("loadPreferences error", e);
    }
  }, []);

  // Load notifications with better error handling
  const loadNotifications = useCallback(async () => {
    if (!isLoading) setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      const offset = (currentPage - 1) * pageSize;
      params.set("limit", pageSize.toString());
      params.set("offset", offset.toString());
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (unreadOnly) params.set("unreadOnly", "true");

      let response: Response;
      try {
        response = await safeFetch(`/api/notifications?${params}`);
      } catch (networkErr) {
        console.warn(
          "Network error fetching notifications, retrying once",
          networkErr,
        );
        try {
          await new Promise((res) => setTimeout(res, 700));
          response = await safeFetch(`/api/notifications?${params}`);
        } catch (networkErr2) {
          console.error("Network error fetching notifications", networkErr2);
          setDegraded(true);
          toast({
            title: "Network error",
            description:
              "Unable to reach notifications backend. Showing cached data if available.",
            variant: "destructive",
          });
          return;
        }
      }

      if (response.status === 503) {
        setDegraded(true);
        const cached = await response.json().catch(() => null);
        if (!notifications && cached?.data) setNotifications(cached.data);
        return;
      }

      setDegraded(false);

      const data = await response.json().catch(() => null);
      if (!data) throw new Error("Invalid response from notifications API");

      if (data.status === "success" && data.data) {
        setNotifications(data.data);
        setNextCursor(data.data.nextCursor || null);
      } else {
        throw new Error(data.error || "Failed to load notifications");
      }
    } catch (error: any) {
      console.error("Load notifications error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    currentPage,
    pageSize,
    severityFilter,
    categoryFilter,
    unreadOnly,
    notifications,
  ]);

  // Mark notification as read
  const markAsRead = async (notificationId: string, read: boolean = true) => {
    try {
      const response = await safeFetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read }),
        },
      );

      if (response.ok) {
        // Update local state
        setNotifications((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === notificationId ? { ...n, read } : n,
            ),
            summary: {
              ...prev.summary,
              unread: prev.summary.unread + (read ? -1 : 1),
            },
          };
        });

        toast({
          title: read ? "Marked as Read" : "Marked as Unread",
          description: `Notification has been ${read ? "marked as read" : "marked as unread"}.`,
        });
      } else {
        throw new Error("Failed to update notification");
      }
    } catch (error) {
      console.error("Mark as read error:", error);
      toast({
        title: "Error",
        description: "Failed to update notification status.",
        variant: "destructive",
      });
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await safeFetch("/api/notifications/mark-all-read", {
        method: "POST",
      });

      if (response.ok) {
        await loadNotifications();
        toast({
          title: "All Marked as Read",
          description: "All notifications have been marked as read.",
        });
      } else {
        throw new Error("Failed to mark all as read");
      }
    } catch (error) {
      console.error("Mark all as read error:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    }
  };

  // Toggle notification expansion
  const toggleExpansion = (notificationId: string) => {
    setExpandedNotifications((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // Pagination controls
  const totalPages = notifications
    ? Math.ceil(notifications.pagination.total / pageSize)
    : 0;

  const goToPage = (page: number) => {
    updateFilters({ page: page.toString() });
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    try {
      const params = new URLSearchParams();
      params.set("limit", pageSize.toString());
      params.set("offset", nextCursor);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (unreadOnly) params.set("unreadOnly", "true");
      const r = await safeFetch(`/api/notifications?${params}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setNotifications((prev) =>
        prev
          ? {
              ...j.data,
              notifications: prev.notifications.concat(j.data.notifications),
              summary: j.data.summary,
              pagination: j.data.pagination,
            }
          : j.data,
      );
      setNextCursor(j.data.nextCursor || null);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Load more failed",
        variant: "destructive",
      });
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(Math.max(1, currentPage - 1));
  const goToNextPage = () => goToPage(Math.min(totalPages, currentPage + 1));

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
    const t = window.setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => window.clearInterval(t);
  }, [autoRefresh, loadNotifications]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view notifications.
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
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Bell className="h-8 w-8" />
            <span>Notifications</span>
          </h1>
          <p className="text-muted-foreground">
            Stay updated with important alerts and system messages
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
          {notifications?.summary.unread > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark All Read
            </Button>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              const params = new URLSearchParams();
              params.set("limit", pageSize.toString());
              params.set("offset", ((currentPage - 1) * pageSize).toString());
              if (severityFilter !== "all")
                params.set("severity", severityFilter);
              if (categoryFilter !== "all")
                params.set("category", categoryFilter);
              if (unreadOnly) params.set("unreadOnly", "true");
              const r = await safeFetch(
                `/api/notifications?${params}&format=csv`,
              );
              const txt = await r.text();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([txt], { type: "text/csv" }),
              );
              a.download = "notifications.csv";
              a.click();
            }}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const params = new URLSearchParams();
              params.set("limit", pageSize.toString());
              params.set("offset", ((currentPage - 1) * pageSize).toString());
              if (severityFilter !== "all")
                params.set("severity", severityFilter);
              if (categoryFilter !== "all")
                params.set("category", categoryFilter);
              if (unreadOnly) params.set("unreadOnly", "true");
              const r = await safeFetch(`/api/notifications?${params}`);
              const j = await r.json();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([JSON.stringify(j.data.notifications, null, 2)], {
                  type: "application/json",
                }),
              );
              a.download = "notifications.json";
              a.click();
            }}
          >
            Export JSON
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
        <Alert variant="destructive">
          <AlertDescription>
            Degraded mode: using cached results until backend recovers.
          </AlertDescription>
        </Alert>
      )}
      {/* Summary Cards */}
      {notifications && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute right-2 top-2">
                <HelpTip content="Total notifications received." side="left" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {notifications.summary.total}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute right-2 top-2">
                <HelpTip
                  content="Unread notifications that you haven't viewed yet."
                  side="left"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {notifications.summary.unread}
                </div>
                <div className="text-xs text-muted-foreground">Unread</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 relative">
              <div className="absolute right-2 top-2">
                <HelpTip
                  content="Notifications that require your attention or action."
                  side="left"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {notifications.summary.actionRequired}
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
                <HelpTip content="Number of warnings detected." side="left" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {notifications.summary.severityCounts.warning || 0}
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
              content="Refine your notifications by severity, category, page size, and unread status."
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
                onValueChange={(value) => updateFilters({ severity: value })}
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
                <HelpTip
                  content="Filter by notification category."
                  side="right"
                />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={(value) => updateFilters({ category: value })}
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
                  content="How many notifications to show per page."
                  side="right"
                />
              </div>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => updateFilters({ limit: value })}
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

      {/* Channel features are not supported by backend; hidden in UI */}

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
                    const r = await safeFetch(
                      "/api/notifications/preferences",
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

      {/* Push / Mobile Delivery */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>Mobile / Push Delivery</CardTitle>
            <HelpTip
              content="Send a test push notification to your device tokens."
              side="left"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const r = await safeFetch("/api/mobile/status");
                  const j = await r.json();
                  setPushStatus(j.data);
                } catch {}
              }}
            >
              Check Status
            </Button>
          </div>
          {pushStatus && (
            <div className="text-sm text-muted-foreground">
              Ready: {String(pushStatus.ready)} • Queue:{" "}
              {pushStatus.queue_depth} • Last nonce: {pushStatus.last_nonce}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Label>Token(s) (comma-separated)</Label>
                <HelpTip
                  content="Device tokens; separate multiple tokens with commas."
                  side="right"
                />
              </div>
              <Input
                value={pushForm.token}
                onChange={(e) =>
                  setPushForm((p) => ({ ...p, token: e.target.value }))
                }
                placeholder="token1,token2"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label>Nonce (must increase)</Label>
                <HelpTip
                  content="Monotonically increasing number to prevent replay; must be greater than the last sent."
                  side="right"
                />
              </div>
              <Input
                value={pushForm.nonce}
                onChange={(e) =>
                  setPushForm((p) => ({ ...p, nonce: e.target.value }))
                }
                placeholder="1001"
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Label>Title</Label>
                <HelpTip content="Push notification title." side="right" />
              </div>
              <Input
                value={pushForm.title}
                onChange={(e) =>
                  setPushForm((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Label>Body</Label>
                <HelpTip
                  content="Main message shown in the notification."
                  side="right"
                />
              </div>
              <Input
                value={pushForm.body}
                onChange={(e) =>
                  setPushForm((p) => ({ ...p, body: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Label>URL (optional)</Label>
                <HelpTip
                  content="Optional URL to open when the notification is tapped."
                  side="right"
                />
              </div>
              <Input
                value={pushForm.url}
                onChange={(e) =>
                  setPushForm((p) => ({ ...p, url: e.target.value }))
                }
              />
            </div>
          </div>
          <Button
            onClick={async () => {
              try {
                const payload: any = {
                  token: pushForm.token.includes(",")
                    ? pushForm.token
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : pushForm.token,
                  title: pushForm.title,
                  body: pushForm.body,
                  url: pushForm.url || undefined,
                  nonce: Number(pushForm.nonce),
                };
                const r = await safeFetch("/api/mobile/push", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                const j = await r.json();
                if (r.status === 202)
                  toast({
                    title: "Queued",
                    description: `Queued ${j.data?.queued || ""}`,
                  });
                else throw new Error(j.error || "Failed");
              } catch (e: any) {
                toast({
                  title: "Error",
                  description: e.message || "Failed",
                  variant: "destructive",
                });
              }
            }}
          >
            Send Push
          </Button>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>
              {notifications
                ? `${notifications.pagination.total} Notification${notifications.pagination.total !== 1 ? "s" : ""}`
                : "Loading..."}
            </CardTitle>
            <HelpTip
              content="View and manage your notifications. Click to expand for details or mark as read."
              side="left"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications && notifications.notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.notifications.map((notification) => {
                const isExpanded = expandedNotifications.has(notification.id);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      notification.read
                        ? "bg-muted/20"
                        : "bg-background border-primary/20"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getCategoryIcon(notification.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3
                                className={`font-medium ${notification.read ? "text-muted-foreground" : "text-foreground"}`}
                              >
                                {notification.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`${SEVERITY_COLORS[notification.severity]} border`}
                              >
                                <span className="flex items-center space-x-1">
                                  {getSeverityIcon(notification.severity)}
                                  <span className="capitalize">
                                    {notification.severity}
                                  </span>
                                </span>
                              </Badge>
                              {notification.actionRequired && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Action Required
                                </Badge>
                              )}
                            </div>

                            <p
                              className={`text-sm ${notification.read ? "text-muted-foreground" : "text-foreground"} ${isExpanded ? "" : "line-clamp-2"}`}
                            >
                              {notification.message}
                            </p>

                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTimeAgo(notification.timestamp)}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {notification.category}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpansion(notification.id)}
                            >
                              {isExpanded ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                markAsRead(notification.id, !notification.read)
                              }
                            >
                              {notification.read ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && notification.metadata && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md">
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">
                              Additional Details:
                            </h4>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {JSON.stringify(notification.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
          <div className="mt-3 flex items-center justify-center">
            <Button variant="outline" disabled={!nextCursor} onClick={loadMore}>
              Load more
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {notifications && totalPages > 1 && (
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
                  {Math.min(
                    currentPage * pageSize,
                    notifications.pagination.total,
                  )}{" "}
                  of {notifications.pagination.total} notifications
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
                      if (page >= 1 && page <= totalPages) {
                        goToPage(page);
                      }
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
    </div>
  );
}
