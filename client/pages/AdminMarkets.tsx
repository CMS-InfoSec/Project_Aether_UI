import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import apiFetch from "@/lib/apiClient";
import copy from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  DollarSign,
  Activity,
  Database,
  AlertCircle,
  CheckCircle,
  Eye,
  XCircle,
  Shield,
  Ban,
  Copy,
  ArrowUp,
  ArrowDown,
  Check,
  CircleAlert,
  CloudDownload,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SpotPriceChecker from "./components/SpotPriceChecker";
import { HelpTip } from "@/components/ui/help-tip";

// Types matching specification
interface MarketItem {
  symbol: string;
  cap_usd: number;
  realized_vol: number;
  status: "active" | "inactive" | "delisted" | "monitoring";
  profitability: number;
  volume: number;
  last_validated: string;
  last_refreshed: string;
  source: string;
  override: "allow" | "block" | null;
  volume_reliable?: boolean;
}

interface MarketResponse {
  total: number;
  items: MarketItem[];
  next: number | null;
  last_refreshed: string;
  source: string;
}

interface MarketStats {
  total_markets: number;
  active_markets: number;
  monitoring_markets: number;
  inactive_markets: number;
  delisted_markets: number;
  avg_profitability: number;
  avg_realized_vol: number;
  total_volume: number;
  total_market_cap: number;
}

interface Filters {
  status: string;
  min_profitability: string;
  min_volume: string;
  sort: string;
  limit: number;
  offset: number;
  symbol?: string;
}

const DEFAULT_PAGE_LIMIT = 25;
const MAX_PAGE_LIMIT = 100;
const MIN_ELIGIBLE_MARKETS = 5;

export default function AdminMarkets() {
  // State
  const [marketData, setMarketData] = useState<MarketResponse | null>(null);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profitabilityThreshold, setProfitabilityThreshold] = useState(0.0);

  // Header freshness
  const [hdrLastRefreshed, setHdrLastRefreshed] = useState<string | null>(null);
  const [hdrSource, setHdrSource] = useState<string | null>(null);
  const [hdrVersion, setHdrVersion] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    min_profitability: "",
    min_volume: "",
    sort: "symbol",
    limit: DEFAULT_PAGE_LIMIT,
    offset: 0,
    symbol: "",
  });

  // Form state for filter panel (editable)
  const [filterForm, setFilterForm] = useState<Filters>({
    status: "all",
    min_profitability: "",
    min_volume: "",
    sort: "symbol",
    limit: DEFAULT_PAGE_LIMIT,
    offset: 0,
    symbol: "",
  });

  // Saved views (localStorage)
  const savedViews = useMemo(() => {
    const raw = localStorage.getItem("eligibility_saved_views");
    try {
      return raw ? (JSON.parse(raw) as Record<string, Filters>) : {};
    } catch {
      return {};
    }
  }, [marketData?.total, hdrVersion]);

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    {
      value: "active",
      label: "Active",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      value: "monitoring",
      label: "Monitoring",
      icon: Eye,
      color: "text-yellow-600",
    },
    {
      value: "inactive",
      label: "Inactive",
      icon: AlertCircle,
      color: "text-gray-600",
    },
    {
      value: "delisted",
      label: "Delisted",
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  const sortOptions = [
    { value: "symbol", label: "Symbol" },
    { value: "cap_usd", label: "Market Cap" },
    { value: "realized_vol", label: "Realized Volatility" },
    { value: "status", label: "Status" },
    { value: "profitability", label: "Profitability" },
    { value: "volume", label: "Volume" },
  ];

  // Load filters from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFilters: Partial<Filters> = {};
    if (params.get("status")) urlFilters.status = params.get("status")!;
    if (params.get("min_profitability"))
      urlFilters.min_profitability = params.get("min_profitability")!;
    if (params.get("min_volume"))
      urlFilters.min_volume = params.get("min_volume")!;
    if (params.get("sort")) urlFilters.sort = params.get("sort")!;
    if (params.get("limit"))
      urlFilters.limit = parseInt(params.get("limit")!) || DEFAULT_PAGE_LIMIT;
    if (params.get("offset"))
      urlFilters.offset = parseInt(params.get("offset")!) || 0;
    if (params.get("symbol")) urlFilters.symbol = params.get("symbol")!;
    if (Object.keys(urlFilters).length > 0) {
      setFilters((prev) => ({ ...prev, ...urlFilters }));
      setFilterForm((prev) => ({ ...prev, ...urlFilters }));
    }
  }, []);

  const updateUrl = useCallback((newFilters: Filters) => {
    const params = new URLSearchParams();
    if (newFilters.status && newFilters.status !== "all")
      params.set("status", newFilters.status);
    if (newFilters.min_profitability)
      params.set("min_profitability", newFilters.min_profitability);
    if (newFilters.min_volume) params.set("min_volume", newFilters.min_volume);
    if (newFilters.sort !== "symbol") params.set("sort", newFilters.sort);
    if (newFilters.limit !== DEFAULT_PAGE_LIMIT)
      params.set("limit", newFilters.limit.toString());
    if (newFilters.offset > 0)
      params.set("offset", newFilters.offset.toString());
    if (newFilters.symbol) params.set("symbol", newFilters.symbol);
    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);
  }, []);

  // Fetch market data
  const fetchMarkets = useCallback(
    async (currentFilters: Filters) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (currentFilters.status && currentFilters.status !== "all")
          params.append("status", currentFilters.status);
        if (currentFilters.min_profitability)
          params.append("min_profitability", currentFilters.min_profitability);
        if (currentFilters.min_volume)
          params.append("min_volume", currentFilters.min_volume);
        if (currentFilters.symbol)
          params.append("symbol", currentFilters.symbol);
        params.append("sort", currentFilters.sort);
        params.append("limit", currentFilters.limit.toString());
        params.append("offset", currentFilters.offset.toString());

        const response = await apiFetch(`/api/v1/markets/eligible?${params}`);

        if (response.status === 401)
          throw new Error("Unauthorized - please login");
        if (response.status === 403)
          throw new Error("Forbidden - admin access required");
        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        // Headers for freshness banners
        setHdrLastRefreshed(response.headers.get("X-Last-Refreshed"));
        setHdrSource(response.headers.get("X-Source"));
        setHdrVersion(response.headers.get("X-Eligibility-Version"));

        const data: MarketResponse = await response.json();
        setMarketData(data);
        updateUrl(currentFilters);
      } catch (e) {
        console.error("Failed to fetch markets:", e);
        setError(
          e instanceof Error ? e.message : "Failed to fetch market data",
        );
        if (e instanceof Error) {
          if (e.message.includes("Unauthorized")) {
            window.location.href = "/login";
            return;
          }
          if (e.message.includes("Forbidden")) {
            window.location.href = "/dashboard";
            return;
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [updateUrl],
  );

  // Derive market statistics from current dataset
  useEffect(() => {
    try {
      if (!marketData || !Array.isArray(marketData.items)) {
        setStats(null);
        return;
      }
      const items = marketData.items;
      const total_markets = marketData.total || items.length;
      const active_markets = items.filter((m) => m.status === "active").length;
      const monitoring_markets = items.filter(
        (m) => m.status === "monitoring",
      ).length;
      const inactive_markets = items.filter(
        (m) => m.status === "inactive",
      ).length;
      const delisted_markets = items.filter(
        (m) => m.status === "delisted",
      ).length;
      const avg_profitability = items.length
        ? items.reduce((s, m) => s + (m.profitability || 0), 0) / items.length
        : 0;
      const avg_realized_vol = items.length
        ? items.reduce((s, m) => s + (m.realized_vol || 0), 0) / items.length
        : 0;
      const total_volume = items.reduce((s, m) => s + (m.volume || 0), 0);
      const total_market_cap = items.reduce((s, m) => s + (m.cap_usd || 0), 0);
      setStats({
        total_markets,
        active_markets,
        monitoring_markets,
        inactive_markets,
        delisted_markets,
        avg_profitability,
        avg_realized_vol,
        total_volume,
        total_market_cap,
      });
    } catch (e: any) {
      setStats(null);
      setError(e?.message || "Failed to aggregate market statistics");
    }
  }, [marketData]);

  useEffect(() => {
    (async () => {
      await fetchMarkets(filters);
    })();
  }, [filters, fetchMarkets]);

  // Apply filters
  const handleApplyFilters = () => {
    const validLimit = Math.min(Math.max(1, filterForm.limit), MAX_PAGE_LIMIT);
    const newFilters = { ...filterForm, limit: validLimit, offset: 0 };
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    const defaultFilters: Filters = {
      status: "all",
      min_profitability: "",
      min_volume: "",
      sort: "symbol",
      limit: DEFAULT_PAGE_LIMIT,
      offset: 0,
      symbol: "",
    };
    setFilterForm(defaultFilters);
    setFilters(defaultFilters);
  };

  const handlePagination = (direction: "prev" | "next") => {
    if (direction === "prev" && filters.offset > 0) {
      const newFilters = {
        ...filters,
        offset: Math.max(0, filters.offset - filters.limit),
      };
      setFilters(newFilters);
    } else if (direction === "next" && marketData?.next !== null) {
      const newFilters = { ...filters, offset: marketData.next! };
      setFilters(newFilters);
    }
  };

  const copySymbolToClipboard = async (symbol: string) => {
    const ok = await copy(symbol);
    if (ok)
      toast({ title: "Copied", description: `${symbol} copied to clipboard` });
    else
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
  };

  // Export (iterate through all pages)
  const exportAll = async (type: "csv" | "json") => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "all")
        params.append("status", filters.status);
      if (filters.min_profitability)
        params.append("min_profitability", filters.min_profitability);
      if (filters.min_volume) params.append("min_volume", filters.min_volume);
      if (filters.symbol) params.append("symbol", filters.symbol);
      params.append("sort", filters.sort);

      // Derive metadata from eligible endpoint headers while paging
      let headerLast = hdrLastRefreshed || "";
      let headerSrc = hdrSource || "";
      let headerVer = hdrVersion || "";

      // Page through dataset
      let all: MarketItem[] = [];
      let offset = 0;
      const limit = 100;
      while (true) {
        const p = new URLSearchParams(params);
        p.set("limit", String(limit));
        p.set("offset", String(offset));
        const r = await apiFetch(`/api/v1/markets/eligible?${p.toString()}`);
        if (!r.ok) break;
        const j: MarketResponse = await r.json();
        if (offset === 0) {
          headerLast = r.headers.get("X-Last-Refreshed") || headerLast;
          headerSrc = r.headers.get("X-Source") || headerSrc;
          headerVer = r.headers.get("X-Eligibility-Version") || headerVer;
        }
        all = all.concat(j.items);
        if (j.next === null) break;
        offset = j.next;
      }

      if (type === "json") {
        const payload = {
          metadata: {
            last_refreshed: headerLast,
            source: headerSrc,
            eligibility_version: headerVer,
            total: all.length,
          },
          items: all,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "eligible_markets.json";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({ title: "Export Successful", description: "Exported JSON" });
        return;
      }

      const headerLines = [
        `# X-Last-Refreshed: ${headerLast}`,
        `# X-Source: ${headerSrc}`,
        `# X-Eligibility-Version: ${headerVer}`,
      ];
      const csvHeaders = [
        "Symbol",
        "Market Cap (USD)",
        "Realized Volatility",
        "Status",
        "Profitability",
        "Volume",
        "Last Validated",
        "Last Refreshed",
        "Source",
        "Override",
        "Volume Reliable",
      ];
      const csvRows = all.map((item) =>
        [
          item.symbol,
          item.cap_usd,
          item.realized_vol,
          item.status,
          item.profitability,
          item.volume,
          item.last_validated,
          item.last_refreshed,
          item.source,
          item.override || "",
          item.volume_reliable === false ? "false" : "true",
        ].join(","),
      );
      const csvContent = [
        ...headerLines,
        csvHeaders.join(","),
        ...csvRows,
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "eligible_markets.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Export Successful", description: "Exported CSV" });
    } catch (error) {
      toast({
        title: "Export Failed",
        description:
          error instanceof Error ? error.message : "Failed to export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Utility
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(amount);
  const formatNumber = (num: number) =>
    new Intl.NumberFormat("en-US").format(num);
  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find((opt) => opt.value === status);
    if (!config || !(config as any).icon)
      return <Badge variant="secondary">{status}</Badge>;
    const Icon = (config as any).icon;
    return (
      <Badge
        variant={status === "active" ? "default" : "secondary"}
        className="flex items-center space-x-1"
      >
        <Icon className={`h-3 w-3 ${(config as any).color}`} />
        <span>{(config as any).label}</span>
      </Badge>
    );
  };

  const getOverrideBadge = (override: "allow" | "block" | null) => {
    if (!override) return null;
    return override === "allow" ? (
      <Badge variant="default" className="flex items-center space-x-1">
        <Shield className="h-3 w-3" />
        <span>Allow</span>
      </Badge>
    ) : (
      <Badge variant="destructive" className="flex items-center space-x-1">
        <Ban className="h-3 w-3" />
        <span>Block</span>
      </Badge>
    );
  };

  const recentlyValidated = (ts: string) =>
    Date.now() - new Date(ts).getTime() < 24 * 60 * 60 * 1000;
  const isStale = useMemo(() => {
    const ts = hdrLastRefreshed || marketData?.last_refreshed;
    if (!ts) return false;
    return Date.now() - new Date(ts).getTime() > 24 * 60 * 60 * 1000;
  }, [hdrLastRefreshed, marketData?.last_refreshed]);

  const symbolList = useMemo(
    () => (marketData?.items || []).map((i) => i.symbol).sort(),
    [marketData],
  );

  // Error page for auth errors
  if (
    error &&
    (error.includes("Unauthorized") || error.includes("Forbidden"))
  ) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.includes("Unauthorized")
              ? "Unauthorized - please login."
              : "Forbidden - admin access required."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight inline-flex items-center gap-2">
              Market Eligibility{" "}
              <HelpTip content="Universe of eligible markets refreshed daily based on criteria and governance overrides." />
            </h1>
            <p className="text-muted-foreground">
              Daily refreshed universe of USDT-quoted markets (≥ $200M cap)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => fetchMarkets(filters)}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* Freshness banner */}
        {(hdrLastRefreshed || marketData?.last_refreshed) && (
          <Alert variant={isStale ? "destructive" : "default"}>
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  <strong>Last Refreshed:</strong>{" "}
                  {new Date(
                    (hdrLastRefreshed || marketData!.last_refreshed)!,
                  ).toLocaleString()}
                </span>
                {hdrSource && (
                  <span>
                    <strong>Source:</strong> {hdrSource}
                  </span>
                )}
                {hdrVersion && (
                  <span>
                    <strong>Eligibility Version:</strong> {hdrVersion}
                  </span>
                )}
                {isStale && (
                  <span className="text-red-600">
                    Stale data — retry refresh
                  </span>
                )}
                {marketData && marketData.total < MIN_ELIGIBLE_MARKETS && (
                  <span className="text-red-600">
                    Eligible count low ({marketData.total})
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium inline-flex items-center gap-2">
                  Total Markets{" "}
                  <HelpTip content="Number of markets currently eligible under the rules." />
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_markets}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.active_markets} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium inline-flex items-center gap-2">
                  Avg Profitability{" "}
                  <HelpTip content="Average backtest profitability across eligible markets." />
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">
                  {formatPercentage(stats.avg_profitability)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across markets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium inline-flex items-center gap-2">
                  Total Volume{" "}
                  <HelpTip content="Aggregate 24h trading volume across eligible markets." />
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.total_volume)}
                </div>
                <p className="text-xs text-muted-foreground">24h volume</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium inline-flex items-center gap-2">
                  Market Cap{" "}
                  <HelpTip content="Combined market capitalization of all eligible markets." />
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.total_market_cap)}
                </div>
                <p className="text-xs text-muted-foreground">Combined</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Spot Price Checker */}
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              Spot Price Checker{" "}
              <HelpTip content="Lookup latest spot price for a trading pair (e.g., BTC/USDT)." />
            </CardTitle>
            <CardDescription>
              Check latest price for a symbol (e.g., BTC/USDT)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpotPriceChecker />
          </CardContent>
        </Card>

        {/* Governance Override */}
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              Governance Override{" "}
              <HelpTip content="Force allow or block a symbol with an auditable reason." />
            </CardTitle>
            <CardDescription>
              Allow or block a symbol with audit reason
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="inline-flex items-center gap-2">
                  Symbol{" "}
                  <HelpTip content="Trading pair in BASE/QUOTE format, e.g., BTC/USDT." />
                </Label>
                <Input id="ov-symbol" placeholder="BTC/USDT" />
              </div>
              <div>
                <Label className="inline-flex items-center gap-2">
                  Action{" "}
                  <HelpTip content="Choose Allow to include or Block to exclude from eligibility." />
                </Label>
                <Select
                  defaultValue="allow"
                  onValueChange={(v) => ((window as any)._ovAction = v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow">Allow</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label className="inline-flex items-center gap-2">
                  Reason{" "}
                  <HelpTip content="Provide justification for audit (minimum 10 characters)." />
                </Label>
                <Textarea
                  id="ov-reason"
                  rows={3}
                  placeholder="Provide detailed justification (min 10 chars)"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  const symbol = (
                    document.getElementById("ov-symbol") as HTMLInputElement
                  )?.value
                    ?.trim()
                    .toUpperCase();
                  const action = (window as any)._ovAction || "allow";
                  const reason =
                    (
                      document.getElementById(
                        "ov-reason",
                      ) as HTMLTextAreaElement
                    )?.value || "";
                  if (!symbol || !/^[A-Z0-9]+\/[A-Z0-9]+$/.test(symbol)) {
                    toast({
                      title: "Invalid symbol",
                      description: "Use format BASE/QUOTE",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (reason.trim().length < 10) {
                    toast({
                      title: "Reason too short",
                      description: "Minimum 10 characters",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    const r = await apiFetch("/api/admin/strategy-override", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ symbol, action, reason }),
                    });
                    if (r.status === 201) {
                      const j = await r.json();
                      toast({
                        title: "Override applied",
                        description: `${j.data.symbol} → ${j.data.override}`,
                      });
                      fetchMarkets(filters);
                    } else if (r.status === 403) {
                      const j = await r.json().catch(() => ({
                        detail: "Founder approvals required",
                      }));
                      toast({
                        title: "Approval required",
                        description: j.detail || "Founder approvals required",
                        variant: "destructive",
                      });
                    } else {
                      const j = await r
                        .json()
                        .catch(() => ({ detail: "Failed" }));
                      toast({
                        title: "Error",
                        description: j.detail || "Failed",
                        variant: "destructive",
                      });
                    }
                  } catch {
                    toast({
                      title: "Network error",
                      description: "Please retry",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Submit Override
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  (
                    document.getElementById("ov-symbol") as HTMLInputElement
                  ).value = "";
                  (
                    document.getElementById("ov-reason") as HTMLTextAreaElement
                  ).value = "";
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Filter Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span className="inline-flex items-center gap-2">
                  Filter Panel{" "}
                  <HelpTip content="Refine the eligible universe by status, profitability, volume, and more." />
                </span>
              </CardTitle>
              <CardDescription>Filter by eligibility criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick chips */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilterForm((f) => ({ ...f, min_profitability: "0" }))
                  }
                >
                  Profitability ≥ 0
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilterForm((f) => ({ ...f, min_volume: "1000000000" }))
                  }
                >
                  Volume ≥ 1B
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilterForm((f) => ({ ...f, status: "active" }))
                  }
                >
                  Active only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilterForm((f) => ({ ...f, sort: "profitability" }))
                  }
                >
                  Sort by Profitability
                </Button>
              </div>

              <div>
                <Label className="inline-flex items-center gap-2">
                  Status{" "}
                  <HelpTip content="Filter markets by current eligibility status." />
                </Label>
                <Select
                  value={filterForm.status}
                  onValueChange={(value) =>
                    setFilterForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="symbol"
                  className="inline-flex items-center gap-2"
                >
                  Symbol search{" "}
                  <HelpTip content="Find a specific trading pair by symbol." />
                </Label>
                <Input
                  id="symbol"
                  placeholder="e.g., BTC/USDT"
                  value={filterForm.symbol}
                  onChange={(e) =>
                    setFilterForm((prev) => ({
                      ...prev,
                      symbol: e.target.value.toUpperCase(),
                    }))
                  }
                  list="symbol-list"
                />
                <datalist id="symbol-list">
                  {symbolList.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label
                  htmlFor="minProf"
                  className="inline-flex items-center gap-2"
                >
                  Min Profitability{" "}
                  <HelpTip content="Minimum profitability threshold (0.00–1.00 equals 0%–100%)." />
                </Label>
                <Input
                  id="minProf"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="0.00"
                  value={filterForm.min_profitability}
                  onChange={(e) =>
                    setFilterForm((prev) => ({
                      ...prev,
                      min_profitability: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label
                  htmlFor="minVol"
                  className="inline-flex items-center gap-2"
                >
                  Min Volume{" "}
                  <HelpTip content="Minimum 24h volume in USD for inclusion." />
                </Label>
                <Input
                  id="minVol"
                  type="number"
                  step="1000000"
                  min="0"
                  placeholder="1000000000"
                  value={filterForm.min_volume}
                  onChange={(e) =>
                    setFilterForm((prev) => ({
                      ...prev,
                      min_volume: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label className="inline-flex items-center gap-2">
                  Sort By{" "}
                  <HelpTip content="Order results by symbol, cap, volatility, profitability, or volume." />
                </Label>
                <Select
                  value={filterForm.sort}
                  onValueChange={(value) =>
                    setFilterForm((prev) => ({ ...prev, sort: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="limit"
                  className="inline-flex items-center gap-2"
                >
                  Limit (1-{MAX_PAGE_LIMIT}){" "}
                  <HelpTip content="Number of rows per page (max 100)." />
                </Label>
                <Input
                  id="limit"
                  type="number"
                  min="1"
                  max={MAX_PAGE_LIMIT}
                  value={filterForm.limit}
                  onChange={(e) =>
                    setFilterForm((prev) => ({
                      ...prev,
                      limit: Math.min(
                        Math.max(
                          1,
                          parseInt(e.target.value) || DEFAULT_PAGE_LIMIT,
                        ),
                        MAX_PAGE_LIMIT,
                      ),
                    }))
                  }
                />
              </div>

              {/* Saved views */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input id="viewName" placeholder="Save current filters as…" />
                  <Button
                    size="sm"
                    onClick={() => {
                      const name = (
                        document.getElementById("viewName") as HTMLInputElement
                      )?.value?.trim();
                      if (!name) {
                        toast({
                          title: "Name required",
                          description: "Enter a view name",
                          variant: "destructive",
                        });
                        return;
                      }
                      const views = savedViews as Record<string, Filters>;
                      const next = {
                        ...views,
                        [name]: { ...filterForm, offset: 0 },
                      };
                      localStorage.setItem(
                        "eligibility_saved_views",
                        JSON.stringify(next),
                      );
                      toast({
                        title: "Saved",
                        description: `View "${name}" saved`,
                      });
                    }}
                  >
                    Save
                  </Button>
                </div>
                {Object.keys(savedViews).length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(savedViews).map((k) => (
                      <Button
                        key={k}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFilterForm(savedViews[k]);
                          setFilters(savedViews[k]);
                        }}
                      >
                        {k}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleApplyFilters}
                  className="w-full"
                  disabled={isLoading}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Markets Table */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                Eligible Markets{" "}
                <HelpTip content="Table of currently eligible markets. Click a symbol to copy it." />
              </CardTitle>
              <CardDescription>
                Click symbol to copy. Recent validations highlighted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>{error}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchMarkets(filters)}
                      >
                        Retry
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : marketData ? (
                <div className="space-y-4">
                  {/* Export controls */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div>
                        <strong>Last Refreshed:</strong>{" "}
                        {new Date(
                          (hdrLastRefreshed || marketData.last_refreshed)!,
                        ).toLocaleString()}
                      </div>
                      <div>
                        <strong>Source:</strong>{" "}
                        {hdrSource || marketData.source}
                      </div>
                      {hdrVersion && (
                        <div>
                          <strong>Eligibility Version:</strong> {hdrVersion}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => exportAll("csv")}
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Exporting…
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => exportAll("json")}
                        disabled={isExporting}
                      >
                        <CloudDownload className="h-4 w-4 mr-2" />
                        Export JSON
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Symbol{" "}
                              <HelpTip content="Trading pair (BASE/QUOTE). Click entries to copy." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Market Cap (USD){" "}
                              <HelpTip content="Market capitalization in US dollars." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Realized Volatility{" "}
                              <HelpTip content="Observed price variability over the evaluation window." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Status{" "}
                              <HelpTip content="Eligibility state: Active, Monitoring, Inactive, or Delisted." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Profitability{" "}
                              <HelpTip content="Backtest profitability metric for the market." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Volume{" "}
                              <HelpTip content="24-hour traded volume in USD." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Vol. Reliability{" "}
                              <HelpTip content="Indicates if reported volume is considered reliable." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Last Validated{" "}
                              <HelpTip content="Timestamp of the last eligibility validation." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Last Refreshed{" "}
                              <HelpTip content="Timestamp when market data was last refreshed." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Source{" "}
                              <HelpTip content="Data provider or ingestion source." />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="inline-flex items-center gap-1">
                              Override{" "}
                              <HelpTip content="Manual governance override applied to the market." />
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marketData.items.length > 0 ? (
                          marketData.items.map((market) => (
                            <TableRow
                              key={market.symbol}
                              className={
                                recentlyValidated(market.last_validated)
                                  ? "bg-blue-50 hover:bg-blue-100"
                                  : ""
                              }
                            >
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="font-medium p-0 h-auto"
                                      onClick={() =>
                                        copySymbolToClipboard(market.symbol)
                                      }
                                    >
                                      {market.symbol}
                                      <Copy className="h-3 w-3 ml-1" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Click to copy</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                {formatNumber(market.cap_usd)}
                              </TableCell>
                              <TableCell>
                                {formatPercentage(market.realized_vol)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(market.status)}
                              </TableCell>
                              <TableCell
                                className={
                                  market.profitability >= profitabilityThreshold
                                    ? "text-green-600 font-medium"
                                    : ""
                                }
                              >
                                {formatPercentage(market.profitability)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(market.volume)}
                              </TableCell>
                              <TableCell>
                                {market.volume_reliable === false ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-yellow-700"
                                  >
                                    Unreliable
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-green-700 border-green-300"
                                  >
                                    Reliable
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm text-muted-foreground cursor-help">
                                      {new Date(
                                        market.last_validated,
                                      ).toLocaleDateString()}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {new Date(
                                        market.last_validated,
                                      ).toLocaleString()}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(
                                  market.last_refreshed,
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{market.source}</span>
                              </TableCell>
                              <TableCell>
                                <div>{getOverrideBadge(market.override)}</div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="text-center py-8"
                            >
                              <div className="text-muted-foreground">
                                <Activity className="h-8 w-8 mx-auto mb-2" />
                                <p>No markets match current filters.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {filters.offset + 1}-
                      {Math.min(
                        filters.offset + filters.limit,
                        marketData.total,
                      )}{" "}
                      of {marketData.total}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePagination("prev")}
                        disabled={filters.offset === 0}
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePagination("next")}
                        disabled={marketData.next === null}
                      >
                        Next
                        <ArrowDown className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
