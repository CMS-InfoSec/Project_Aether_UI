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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Eye,
  XCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface MarketData {
  symbol: string;
  cap_usd: number;
  volatility: number;
  profitability: number;
  volume: number;
  last_updated: string;
  created_at: string;
  data_source: string;
  status: 'active' | 'inactive' | 'delisted' | 'monitoring';
}

interface MarketStats {
  total_markets: number;
  active_markets: number;
  monitoring_markets: number;
  inactive_markets: number;
  delisted_markets: number;
  avg_profitability: number;
  avg_volatility: number;
  total_volume: number;
  total_market_cap: number;
}

interface Filters {
  status: string[];
  min_profitability: string;
  min_volume: string;
  sort: string;
  order: 'asc' | 'desc';
  limit: number;
  offset: number;
}

interface Metadata {
  total: number;
  limit: number;
  offset: number;
  last_refreshed: string;
  sources: string;
}

export default function AdminMarkets() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    status: ['active'],
    min_profitability: '',
    min_volume: '',
    sort: 'profitability',
    order: 'desc',
    limit: 50,
    offset: 0
  });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Active', icon: CheckCircle, color: 'text-green-600' },
    { value: 'monitoring', label: 'Monitoring', icon: Eye, color: 'text-yellow-600' },
    { value: 'inactive', label: 'Inactive', icon: AlertCircle, color: 'text-gray-600' },
    { value: 'delisted', label: 'Delisted', icon: XCircle, color: 'text-red-600' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'symbol', label: 'Symbol' },
    { value: 'cap_usd', label: 'Market Cap' },
    { value: 'volatility', label: 'Volatility' },
    { value: 'profitability', label: 'Profitability' },
    { value: 'volume', label: 'Volume' },
    { value: 'last_updated', label: 'Last Updated' }
  ];

  // Load filters from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem('market-filters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFilters(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('market-filters', JSON.stringify(filters));
  }, [filters]);

  // Fetch market data
  const fetchMarkets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.min_profitability) {
        params.append('min_profitability', filters.min_profitability);
      }
      if (filters.min_volume) {
        params.append('min_volume', filters.min_volume);
      }
      params.append('sort', filters.sort);
      params.append('order', filters.order);
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/markets/eligible?${params}`);
      const data = await response.json();

      if (data.status === 'success') {
        setMarkets(data.data);
        setMetadata(data.metadata);
      } else {
        throw new Error(data.message || 'Failed to fetch markets');
      }
    } catch (error) {
      console.error('Failed to fetch markets:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch market data",
        variant: "destructive"
      });
    }
  }, [filters]);

  // Fetch market statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/markets/stats');
      const data = await response.json();

      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMarkets(), fetchStats()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchMarkets]);

  // Handle filter changes
  const updateFilter = (key: keyof Filters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: key !== 'offset' ? 0 : value // Reset to first page when changing filters
    }));
  };

  // Handle status filter toggle
  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
      offset: 0
    }));
  };

  // Handle sorting
  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sort: field,
      order: prev.sort === field && prev.order === 'desc' ? 'asc' : 'desc',
      offset: 0
    }));
  };

  // Handle pagination
  const handlePagination = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && filters.offset > 0) {
      updateFilter('offset', Math.max(0, filters.offset - filters.limit));
    } else if (direction === 'next' && metadata && filters.offset + filters.limit < metadata.total) {
      updateFilter('offset', filters.offset + filters.limit);
    }
  };

  // Export to CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.min_profitability) {
        params.append('min_profitability', filters.min_profitability);
      }
      if (filters.min_volume) {
        params.append('min_volume', filters.min_volume);
      }
      params.append('sort', filters.sort);
      params.append('order', filters.order);

      const response = await fetch(`/api/markets/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'markets.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: "Market data exported to CSV",
        });
      } else {
        throw new Error('Export failed');
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

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: ['active'],
      min_profitability: '',
      min_volume: '',
      sort: 'profitability',
      order: 'desc',
      limit: 50,
      offset: 0
    });
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
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(opt => opt.value === status);
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'} className="flex items-center space-x-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getSortIcon = (field: string) => {
    if (filters.sort !== field) return null;
    return filters.order === 'desc' ? 
      <ChevronDown className="h-4 w-4" /> : 
      <ChevronUp className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Eligibility</h1>
          <p className="text-muted-foreground">
            Monitor eligible markets with filtering and sorting capabilities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}>
            <Filter className="h-4 w-4 mr-2" />
            {isFilterPanelOpen ? 'Hide' : 'Show'} Filters
          </Button>
          <Button variant="outline" onClick={fetchMarkets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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

      {/* Header Metadata */}
      {metadata && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm">
                  <strong>Last Refreshed:</strong> {new Date(metadata.last_refreshed).toLocaleString()}
                </div>
                <div className="text-sm">
                  <strong>Data Sources:</strong> {metadata.sources}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {metadata.offset + 1}-{Math.min(metadata.offset + metadata.limit, metadata.total)} of {metadata.total} markets
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filter Panel */}
        {isFilterPanelOpen && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
              <CardDescription>
                Filter markets by status and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Filter */}
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="space-y-2 mt-2">
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={filters.status.includes(option.value)}
                          onCheckedChange={() => toggleStatus(option.value)}
                        />
                        <Label htmlFor={option.value} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <Icon className={`h-3 w-3 ${option.color}`} />
                          <span>{option.label}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Min Profitability */}
              <div>
                <Label htmlFor="minProf">Min Profitability (%)</Label>
                <Input
                  id="minProf"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="0.05"
                  value={filters.min_profitability}
                  onChange={(e) => updateFilter('min_profitability', e.target.value)}
                />
              </div>

              {/* Min Volume */}
              <div>
                <Label htmlFor="minVol">Min Volume (USD)</Label>
                <Input
                  id="minVol"
                  type="number"
                  step="1000000"
                  min="0"
                  placeholder="1000000000"
                  value={filters.min_volume}
                  onChange={(e) => updateFilter('min_volume', e.target.value)}
                />
              </div>

              {/* Sort Options */}
              <div>
                <Label>Sort By</Label>
                <div className="space-y-2 mt-2">
                  <Select value={filters.sort} onValueChange={(value) => updateFilter('sort', value)}>
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
                  
                  <Select value={filters.order} onValueChange={(value: 'asc' | 'desc') => updateFilter('order', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Limit */}
              <div>
                <Label>Results per page</Label>
                <Select value={filters.limit.toString()} onValueChange={(value) => updateFilter('limit', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" className="w-full" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Markets Table */}
        <Card className={isFilterPanelOpen ? "lg:col-span-3" : "lg:col-span-4"}>
          <CardHeader>
            <CardTitle>Eligible Markets</CardTitle>
            <CardDescription>
              Real-time market data with eligibility status and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('symbol')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Symbol</span>
                        {getSortIcon('symbol')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('cap_usd')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Market Cap</span>
                        {getSortIcon('cap_usd')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('volatility')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Volatility</span>
                        {getSortIcon('volatility')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('profitability')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Profitability</span>
                        {getSortIcon('profitability')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('volume')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Volume (24h)</span>
                        {getSortIcon('volume')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('last_updated')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Last Updated</span>
                        {getSortIcon('last_updated')}
                      </div>
                    </TableHead>
                    <TableHead>Data Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {markets.length > 0 ? (
                    markets.map((market) => (
                      <TableRow key={market.symbol}>
                        <TableCell className="font-medium">{market.symbol}</TableCell>
                        <TableCell>{formatCurrency(market.cap_usd)}</TableCell>
                        <TableCell>{formatPercentage(market.volatility)}</TableCell>
                        <TableCell className="text-accent font-medium">
                          {formatPercentage(market.profitability)}
                        </TableCell>
                        <TableCell>{formatCurrency(market.volume)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(market.last_updated).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm">{market.data_source}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(market.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <Activity className="h-8 w-8 mx-auto mb-2" />
                          <p>No markets found with current filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {metadata && metadata.total > filters.limit && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {metadata.offset + 1}-{Math.min(metadata.offset + metadata.limit, metadata.total)} of {metadata.total} markets
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePagination('prev')}
                    disabled={filters.offset === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePagination('next')}
                    disabled={filters.offset + filters.limit >= metadata.total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
