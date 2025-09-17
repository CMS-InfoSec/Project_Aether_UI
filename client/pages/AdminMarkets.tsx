import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  BarChart3,
  DollarSign,
  Activity,
  Database,
  Clock,
  Copy,
  AlertCircle,
  CheckCircle,
  Eye,
  XCircle,
  Shield,
  Ban,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SpotPriceChecker from './components/SpotPriceChecker';

// Types matching specification
interface MarketItem {
  symbol: string;
  cap_usd: number;
  realized_vol: number;
  status: 'active' | 'inactive' | 'delisted' | 'monitoring';
  profitability: number;
  volume: number;
  last_validated: string;
  last_refreshed: string;
  source: string;
  override: 'allow' | 'block' | null;
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
}

const DEFAULT_PAGE_LIMIT = 25;
const MAX_PAGE_LIMIT = 100;

export default function AdminMarkets() {
  // State
  const [marketData, setMarketData] = useState<MarketResponse | null>(null);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profitabilityThreshold, setProfitabilityThreshold] = useState(0.05);
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    min_profitability: '',
    min_volume: '',
    sort: 'symbol',
    limit: DEFAULT_PAGE_LIMIT,
    offset: 0
  });

  // Form state for filter panel
  const [filterForm, setFilterForm] = useState<Filters>({
    status: 'all',
    min_profitability: '',
    min_volume: '',
    sort: 'symbol',
    limit: DEFAULT_PAGE_LIMIT,
    offset: 0
  });

  // Status and sort options
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active', icon: CheckCircle, color: 'text-green-600' },
    { value: 'monitoring', label: 'Monitoring', icon: Eye, color: 'text-yellow-600' },
    { value: 'inactive', label: 'Inactive', icon: AlertCircle, color: 'text-gray-600' },
    { value: 'delisted', label: 'Delisted', icon: XCircle, color: 'text-red-600' }
  ];

  const sortOptions = [
    { value: 'symbol', label: 'Symbol' },
    { value: 'cap_usd', label: 'Market Cap' },
    { value: 'realized_vol', label: 'Realized Volatility' },
    { value: 'status', label: 'Status' },
    { value: 'profitability', label: 'Profitability' },
    { value: 'volume', label: 'Volume' }
  ];

  // Load/save filters from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFilters: Partial<Filters> = {};
    
    if (params.get('status')) urlFilters.status = params.get('status')!;
    if (params.get('min_profitability')) urlFilters.min_profitability = params.get('min_profitability')!;
    if (params.get('min_volume')) urlFilters.min_volume = params.get('min_volume')!;
    if (params.get('sort')) urlFilters.sort = params.get('sort')!;
    if (params.get('limit')) urlFilters.limit = parseInt(params.get('limit')!) || DEFAULT_PAGE_LIMIT;
    if (params.get('offset')) urlFilters.offset = parseInt(params.get('offset')!) || 0;

    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...urlFilters }));
      setFilterForm(prev => ({ ...prev, ...urlFilters }));
    }
  }, []);

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: Filters) => {
    const params = new URLSearchParams();
    
    if (newFilters.status && newFilters.status !== 'all') params.set('status', newFilters.status);
    if (newFilters.min_profitability) params.set('min_profitability', newFilters.min_profitability);
    if (newFilters.min_volume) params.set('min_volume', newFilters.min_volume);
    if (newFilters.sort !== 'symbol') params.set('sort', newFilters.sort);
    if (newFilters.limit !== DEFAULT_PAGE_LIMIT) params.set('limit', newFilters.limit.toString());
    if (newFilters.offset > 0) params.set('offset', newFilters.offset.toString());

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
  }, []);

  // Fetch market data
  const fetchMarkets = useCallback(async (currentFilters: Filters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (currentFilters.status && currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.min_profitability) params.append('min_profitability', currentFilters.min_profitability);
      if (currentFilters.min_volume) params.append('min_volume', currentFilters.min_volume);
      params.append('sort', currentFilters.sort);
      params.append('limit', currentFilters.limit.toString());
      params.append('offset', currentFilters.offset.toString());

      const response = await fetch(`/api/markets/eligible?${params}`);
      
      if (response.status === 401) {
        throw new Error('Unauthorized - please login');
      }
      
      if (response.status === 403) {
        throw new Error('Forbidden - admin access required');
      }
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: MarketResponse = await response.json();
      setMarketData(data);
      updateUrl(currentFilters);
      
    } catch (error) {
      console.error('Failed to fetch markets:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch market data');
      
      // Handle unauthorized/forbidden errors
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          // Redirect to login
          window.location.href = '/login';
          return;
        }
        if (error.message.includes('Forbidden')) {
          // Redirect to dashboard
          window.location.href = '/dashboard';
          return;
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [updateUrl]);

  // Fetch market statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/markets/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchMarkets(filters), fetchStats()]);
    };
    loadData();
  }, [filters, fetchMarkets]);

  // Apply filters
  const handleApplyFilters = () => {
    // Validate limit
    const validLimit = Math.min(Math.max(1, filterForm.limit), MAX_PAGE_LIMIT);
    const newFilters = { ...filterForm, limit: validLimit, offset: 0 };
    setFilters(newFilters);
  };

  // Reset filters
  const handleResetFilters = () => {
    const defaultFilters: Filters = {
      status: 'all',
      min_profitability: '',
      min_volume: '',
      sort: 'symbol',
      limit: DEFAULT_PAGE_LIMIT,
      offset: 0
    };
    setFilterForm(defaultFilters);
    setFilters(defaultFilters);
  };

  // Handle pagination
  const handlePagination = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && filters.offset > 0) {
      const newFilters = { ...filters, offset: Math.max(0, filters.offset - filters.limit) };
      setFilters(newFilters);
    } else if (direction === 'next' && marketData?.next !== null) {
      const newFilters = { ...filters, offset: marketData.next };
      setFilters(newFilters);
    }
  };

  // Export to CSV (client-side conversion as specified)
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.min_profitability) params.append('min_profitability', filters.min_profitability);
      if (filters.min_volume) params.append('min_volume', filters.min_volume);
      params.append('sort', filters.sort);

      const response = await fetch(`/api/markets/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Client-side CSV conversion as specified
        const csvHeaders = [
          'Symbol',
          'Market Cap (USD)',
          'Realized Volatility',
          'Status',
          'Profitability',
          'Volume',
          'Last Validated',
          'Last Refreshed',
          'Source',
          'Override'
        ].join(',');

        const csvRows = data.data.map((item: MarketItem) => [
          item.symbol,
          item.cap_usd,
          item.realized_vol,
          item.status,
          item.profitability,
          item.volume,
          item.last_validated,
          item.last_refreshed,
          item.source,
          item.override || ''
        ].join(','));

        const csvContent = [csvHeaders, ...csvRows].join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'eligible_markets.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: "Market data exported to CSV",
        });
      } else {
        throw new Error(data.message || 'Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Copy symbol to clipboard
  const copySymbolToClipboard = async (symbol: string) => {
    try {
      await navigator.clipboard.writeText(symbol);
      toast({
        title: "Copied",
        description: `${symbol} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(opt => opt.value === status);
    if (!config || !config.icon) return <Badge variant="secondary">{status}</Badge>;

    const Icon = config.icon;
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'} className="flex items-center space-x-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getOverrideBadge = (override: 'allow' | 'block' | null) => {
    if (!override) return null;
    
    return override === 'allow' ? (
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

  const isRecentlyValidated = (timestamp: string) => {
    const validatedTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - validatedTime) < 24 * 60 * 60 * 1000; // Less than 24 hours
  };

  // Error handling
  if (error && (error.includes('Unauthorized') || error.includes('Forbidden'))) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.includes('Unauthorized') && 'Unauthorized - please login.'}
            {error.includes('Forbidden') && 'Forbidden - admin access required.'}
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
            <h1 className="text-3xl font-bold tracking-tight">Market Eligibility</h1>
            <p className="text-muted-foreground">
              Review, filter, and export eligible market pairs (USDT quote, ≥ $200M market cap)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => fetchMarkets(filters)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Markets</CardTitle>
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
                <CardTitle className="text-sm font-medium">Avg Profitability</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">
                  {formatPercentage(stats.avg_profitability)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across all markets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.total_volume)}</div>
                <p className="text-xs text-muted-foreground">
                  24h trading volume
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Cap</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.total_market_cap)}</div>
                <p className="text-xs text-muted-foreground">
                  Combined market cap
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Spot Price Checker */}
        <Card>
          <CardHeader>
            <CardTitle>Spot Price Checker</CardTitle>
            <CardDescription>Check latest price for a symbol (e.g., BTC/USDT)</CardDescription>
          </CardHeader>
          <CardContent>
            <SpotPriceChecker />
          </CardContent>
        </Card>

        {/* Governance Override (Admins) */}
        <Card>
          <CardHeader>
            <CardTitle>Governance Override</CardTitle>
            <CardDescription>Allow or block trading for a symbol with audit reason.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div>
                <Label>Symbol</Label>
                <Input id="ov-symbol" placeholder="BTC/USDT" />
              </div>
              <div>
                <Label>Action</Label>
                <Select defaultValue="allow" onValueChange={(v)=> ((window as any)._ovAction = v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow">Allow</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label>Reason</Label>
                <Textarea id="ov-reason" rows={3} placeholder="Provide detailed justification (min 10 chars)" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="default" onClick={async ()=>{
                const symbol = (document.getElementById('ov-symbol') as HTMLInputElement)?.value?.trim().toUpperCase();
                const action = (window as any)._ovAction || 'allow';
                const reason = (document.getElementById('ov-reason') as HTMLTextAreaElement)?.value || '';
                if (!symbol || !/^[A-Z0-9]+\/[A-Z0-9]+$/.test(symbol)) { toast({ title:'Invalid symbol', description:'Use format BASE/QUOTE', variant:'destructive' }); return; }
                if (reason.trim().length < 10){ toast({ title:'Reason too short', description:'Minimum 10 characters', variant:'destructive' }); return; }
                try{
                  const r = await fetch('/api/admin/strategy-override', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ symbol, action, reason }) });
                  if (r.status === 201){ const j = await r.json(); toast({ title:'Override applied', description:`${j.data.symbol} → ${j.data.override}` }); fetchMarkets(filters); }
                  else if (r.status === 403){ const j = await r.json().catch(()=>({detail:'Founder approvals required'})); toast({ title:'Approval required', description: j.detail || 'Founder approvals required', variant:'destructive' }); }
                  else { const j = await r.json().catch(()=>({detail:'Failed'})); toast({ title:'Error', description: j.detail || 'Failed', variant:'destructive' }); }
                }catch{ toast({ title:'Network error', description:'Please retry' , variant:'destructive' }); }
              }}>Submit Override</Button>
              <Button variant="outline" onClick={()=>{ (document.getElementById('ov-symbol') as HTMLInputElement).value=''; (document.getElementById('ov-reason') as HTMLTextAreaElement).value=''; }}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        {marketData && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm">
                    <strong>Last Refreshed:</strong> {new Date(marketData.last_refreshed).toLocaleString()}
                  </div>
                  <div className="text-sm">
                    <strong>Data Source:</strong> {marketData.source}
                  </div>
                </div>
                <Button onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Filter Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filter Panel</span>
              </CardTitle>
              <CardDescription>
                Filter markets by eligibility criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Dropdown */}
              <div>
                <Label>Status</Label>
                <Select 
                  value={filterForm.status} 
                  onValueChange={(value) => setFilterForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Profitability */}
              <div>
                <Label htmlFor="minProf">Min Profitability</Label>
                <Input
                  id="minProf"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="0.05"
                  value={filterForm.min_profitability}
                  onChange={(e) => setFilterForm(prev => ({ ...prev, min_profitability: e.target.value }))}
                />
              </div>

              {/* Min Volume */}
              <div>
                <Label htmlFor="minVol">Min Volume</Label>
                <Input
                  id="minVol"
                  type="number"
                  step="1000000"
                  min="0"
                  placeholder="1000000000"
                  value={filterForm.min_volume}
                  onChange={(e) => setFilterForm(prev => ({ ...prev, min_volume: e.target.value }))}
                />
              </div>

              {/* Sort By */}
              <div>
                <Label>Sort By</Label>
                <Select 
                  value={filterForm.sort} 
                  onValueChange={(value) => setFilterForm(prev => ({ ...prev, sort: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Limit */}
              <div>
                <Label htmlFor="limit">Limit (1-{MAX_PAGE_LIMIT})</Label>
                <Input
                  id="limit"
                  type="number"
                  min="1"
                  max={MAX_PAGE_LIMIT}
                  value={filterForm.limit}
                  onChange={(e) => setFilterForm(prev => ({ 
                    ...prev, 
                    limit: Math.min(Math.max(1, parseInt(e.target.value) || DEFAULT_PAGE_LIMIT), MAX_PAGE_LIMIT) 
                  }))}
                />
              </div>

              {/* Apply/Reset Buttons */}
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
              <CardTitle>Eligible Markets Table</CardTitle>
              <CardDescription>
                Click symbol to copy to clipboard. Row highlighting indicates recently validated entries.
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
                      <Button variant="outline" size="sm" onClick={() => fetchMarkets(filters)}>
                        Retry
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : marketData ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Market Cap (USD)</TableHead>
                          <TableHead>Realized Volatility</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Profitability</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>Last Validated</TableHead>
                          <TableHead>Last Refreshed</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Override</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marketData.items.length > 0 ? (
                          marketData.items.map((market) => (
                            <TableRow 
                              key={market.symbol}
                              className={isRecentlyValidated(market.last_validated) ? 'bg-blue-50 hover:bg-blue-100' : ''}
                            >
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="font-medium p-0 h-auto"
                                      onClick={() => copySymbolToClipboard(market.symbol)}
                                    >
                                      {market.symbol}
                                      <Copy className="h-3 w-3 ml-1" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Click to copy to clipboard</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>{formatNumber(market.cap_usd)}</TableCell>
                              <TableCell>{formatPercentage(market.realized_vol)}</TableCell>
                              <TableCell>{getStatusBadge(market.status)}</TableCell>
                              <TableCell className={market.profitability >= profitabilityThreshold ? 'text-green-600 font-medium' : ''}>
                                {formatPercentage(market.profitability)}
                              </TableCell>
                              <TableCell>{formatCurrency(market.volume)}</TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm text-muted-foreground cursor-help">
                                      {new Date(market.last_validated).toLocaleDateString()}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{new Date(market.last_validated).toLocaleString()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(market.last_refreshed).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{market.source}</span>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>{getOverrideBadge(market.override)}</div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {market.override === 'allow' && 'Governance override: Allow trading'}
                                      {market.override === 'block' && 'Governance override: Block trading'}
                                      {!market.override && 'No governance override applied'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8">
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

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {filters.offset + 1}-{Math.min(filters.offset + filters.limit, marketData.total)} of {marketData.total}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePagination('prev')}
                        disabled={filters.offset === 0}
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePagination('next')}
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
