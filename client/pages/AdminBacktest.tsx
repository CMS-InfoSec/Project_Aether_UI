import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  ChevronUp,
  ChevronDown,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Types
interface BacktestReport {
  summary: {
    net_pnl: number;
    return_percentage: number;
    win_rate: number;
    profit_factor: number;
    expectancy: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    confidence_decay: number;
    alternative_scenario_success: number;
    daily_volatility: number;
    streak_consistency: number;
    risk_of_ruin: number;
    max_drawdown: number;
    fee_percentage: number;
    slippage_bps: number;
  };
  equity_curve: Array<{
    date: string;
    balance: number;
    trade_number: number;
  }>;
  trade_history: Array<{
    action: 'BUY' | 'SELL';
    symbol: string;
    amount: number;
    price: number;
    timestamp: string;
    pnl?: number;
  }>;
  factor_performance?: {
    [key: string]: {
      average_confidence: number;
      win_rate: number;
      return_contribution: number;
    };
  };
  hypothetical_trades?: {
    hypothetical_pnl: number;
    hypothetical_success_rate: number;
  };
  generated_at: string;
  test_period: {
    start_date: string;
    end_date: string;
  };
}

export default function AdminBacktest() {
  const [report, setReport] = useState<BacktestReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'timestamp', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [cmpA, setCmpA] = useState<BacktestReport|null>(null);
  const [cmpB, setCmpB] = useState<BacktestReport|null>(null);

  // Launch form state
  const [pricesJson, setPricesJson] = useState<string>('');
  const [actionsJson, setActionsJson] = useState<string>('');
  const [volumesJson, setVolumesJson] = useState<string>('');
  const [seed, setSeed] = useState<string>('');
  const [startingBalance, setStartingBalance] = useState<string>('100000');
  const [feeRate, setFeeRate] = useState<string>('0.001');
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string|null>(null);

  // History of report paths
  const [history, setHistory] = useState<string[]>(()=>{
    try { return JSON.parse(localStorage.getItem('backtest_history')||'[]') } catch { return []; }
  });
  const [selectedReportPath, setSelectedReportPath] = useState<string>('');
  const [lastChecksum, setLastChecksum] = useState<string>('');

  // Mock backtest report data
  const mockReport: BacktestReport = {
    summary: {
      net_pnl: 125780.50,
      return_percentage: 0.2289,
      win_rate: 0.6842,
      profit_factor: 1.847,
      expectancy: 185.32,
      sharpe_ratio: 1.923,
      sortino_ratio: 2.456,
      confidence_decay: 0.0156,
      alternative_scenario_success: 0.7891,
      daily_volatility: 0.0234,
      streak_consistency: 0.8923,
      risk_of_ruin: 0.0034,
      max_drawdown: -0.0823,
      fee_percentage: 0.0015,
      slippage_bps: 2.5
    },
    equity_curve: Array.from({ length: 50 }, (_, i) => ({
      date: new Date(Date.now() - (49 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      balance: 100000 + (Math.random() * 50000 - 10000) + (i * 2000),
      trade_number: i + 1
    })),
    trade_history: Array.from({ length: 127 }, (_, i) => ({
      action: Math.random() > 0.5 ? 'BUY' : 'SELL' as 'BUY' | 'SELL',
      symbol: ['BTC', 'ETH', 'ADA', 'SOL', 'MATIC', 'DOT'][Math.floor(Math.random() * 6)],
      amount: Math.random() * 10 + 0.1,
      price: Math.random() * 50000 + 1000,
      timestamp: new Date(Date.now() - i * 2 * 60 * 60 * 1000).toISOString(),
      pnl: (Math.random() - 0.3) * 5000
    })),
    factor_performance: {
      'momentum': {
        average_confidence: 0.7845,
        win_rate: 0.7234,
        return_contribution: 0.3456
      },
      'mean_reversion': {
        average_confidence: 0.6789,
        win_rate: 0.6543,
        return_contribution: 0.2987
      },
      'volatility': {
        average_confidence: 0.8123,
        win_rate: 0.7890,
        return_contribution: 0.2234
      },
      'volume_profile': {
        average_confidence: 0.7456,
        win_rate: 0.6789,
        return_contribution: 0.1323
      }
    },
    hypothetical_trades: {
      hypothetical_pnl: 45672.30,
      hypothetical_success_rate: 0.7234
    },
    generated_at: new Date().toISOString(),
    test_period: {
      start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString()
    }
  };

  // Fetch report data
  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock API response
      setReport(mockReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backtest report');
    } finally {
      setIsLoading(false);
    }
  };

  // Download latest loaded report JSON (mock)
  const downloadReport = () => {
    if (!report) return;
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'latest_backtest.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Backtest report downloaded as latest_backtest.json"
    });
  };

  const validateAndLaunch = async () => {
    setLaunchError(null);
    let prices: number[] = [];
    let actions: number[] = [];
    let volumes: number[] | undefined = undefined;
    try { prices = JSON.parse(pricesJson || '[]'); if (!Array.isArray(prices) || prices.some(v=> !isFinite(Number(v)))) throw new Error('prices must be array of finite numbers'); } catch(e:any){ setLaunchError(e.message || 'Invalid prices'); return; }
    try { actions = JSON.parse(actionsJson || '[]'); if (!Array.isArray(actions) || actions.some(v=> !isFinite(Number(v)))) throw new Error('actions must be array of finite numbers'); } catch(e:any){ setLaunchError(e.message || 'Invalid actions'); return; }
    if (volumesJson && volumesJson.trim().length>0){ try { volumes = JSON.parse(volumesJson); if (!Array.isArray(volumes) || volumes.some(v=> !isFinite(Number(v)))) throw new Error('volumes must be array of finite numbers'); } catch(e:any){ setLaunchError(e.message || 'Invalid volumes'); return; } }
    if (prices.length === 0 || actions.length === 0){ setLaunchError('prices and actions are required'); return; }
    if (prices.length !== actions.length){ setLaunchError('prices and actions must have matching lengths'); return; }
    if (volumes && volumes.length !== prices.length){ setLaunchError('volumes length must match prices'); return; }
    const seedNum = seed? Number(seed): undefined; if (seed && !Number.isFinite(seedNum!)){ setLaunchError('seed must be a finite number'); return; }
    const balNum = Number(startingBalance); if (!Number.isFinite(balNum) || balNum<=0){ setLaunchError('starting balance must be > 0'); return; }
    const feeNum = Number(feeRate); if (!Number.isFinite(feeNum) || feeNum<0 || feeNum>1){ setLaunchError('fee must be in [0,1]'); return; }

    setLaunching(true);
    try{
      const body = { config: { prices, actions, volumes, seed: seedNum, starting_balance: balNum, fee: feeNum } };
      const r = await fetch('/api/strategies/backtest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const j = await r.json();
      if (r.status === 422){ setLaunchError(j.error || 'Validation failed'); return; }
      if (r.status === 504){ setLaunchError('Backtest timed out'); return; }
      if (!r.ok){ setLaunchError(j.error || 'Failed to start backtest'); return; }
      toast({ title:'Backtest launched', description: `Job ${j.jobId}` });
      if (j.report_path){
        setHistory(prev=>{ const next=[j.report_path, ...prev.filter(p=>p!==j.report_path)].slice(0,20); localStorage.setItem('backtest_history', JSON.stringify(next)); return next; });
        setSelectedReportPath(j.report_path);
      }
    }catch(e:any){ setLaunchError(e.message || 'Network error'); }
    finally{ setLaunching(false); }
  };

  const downloadArtifact = async (format: 'json'|'trades'|'daily'|'pdf') => {
    const qp = new URLSearchParams(); qp.set('format', format);
    if (selectedReportPath) qp.set('path', selectedReportPath.replace(/^.*path=/,'').replace(/^\/?api\/reports\/backtest\?/,''));
    const url = `/api/reports/backtest?${qp.toString()}`;
    try{
      const r = await fetch(url);
      if (!r.ok){ const j = await r.json().catch(()=>({error:`HTTP ${r.status}`})); toast({ title:'Download failed', description: j.error || `HTTP ${r.status}`, variant:'destructive' }); return; }
      const checksum = r.headers.get('X-Checksum-SHA256') || '';
      setLastChecksum(checksum);
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const ext = format==='json' ? 'json' : 'csv';
      a.download = `backtest_${format}.${ext}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      toast({ title:'Download ready', description: checksum? `Checksum ${checksum.slice(0,12)}…` : 'Downloaded' });
    }catch{ toast({ title:'Download failed', description:'Network error', variant:'destructive' }); }
  };

  // Copy value to clipboard
  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({
      title: "Copied",
      description: "Value copied to clipboard"
    });
  };

  // Sort trade history
  const sortedTrades = report?.trade_history.sort((a, b) => {
    const aVal = a[sortConfig.key as keyof typeof a];
    const bVal = b[sortConfig.key as keyof typeof b];
    
    if (sortConfig.direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  }) || [];

  // Paginate trade history
  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
  const paginatedTrades = sortedTrades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Get sort icon
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'desc' ? 
      <ChevronDown className="h-4 w-4" /> : 
      <ChevronUp className="h-4 w-4" />;
  };

  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number, decimals: 2 | 4 = 2) => {
    return `${(value * 100).toFixed(decimals)}%`;
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  const getValueColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getValueIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };

  // Initial load
  useEffect(() => {
    fetchReport();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Backtest Report</h1>
            <p className="text-muted-foreground">Latest trading backtest results and analysis</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error === 'Not Found' ? 'No backtest report available' : error}
            <div className="mt-2 space-x-2">
              <Button variant="outline" size="sm" onClick={fetchReport}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No backtest report available
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backtest Report</h1>
          <p className="text-muted-foreground">
            Latest trading backtest results and analysis
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Generated: {new Date(report.generated_at).toLocaleString()} | 
            Period: {new Date(report.test_period.start_date).toLocaleDateString()} - {new Date(report.test_period.end_date).toLocaleDateString()}
          </p>
        </div>
        
        {/* Report Controls */}
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchReport} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Report
          </Button>
          <Button onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
        </div>
      </div>

      {/* Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison View</CardTitle>
          <CardDescription>Load two report JSON URLs for side-by-side comparison</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Report A URL (JSON)" value={compareA} onChange={(e)=> setCompareA(e.target.value)} />
            <Input placeholder="Report B URL (JSON)" value={compareB} onChange={(e)=> setCompareB(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={async ()=>{
              try{ const r = await fetch(compareA); const j = await r.json(); setCmpA(j as BacktestReport); }catch{ toast({ title:'Error', description:'Failed to load A', variant:'destructive' }); }
              try{ const r = await fetch(compareB); const j = await r.json(); setCmpB(j as BacktestReport); }catch{ toast({ title:'Error', description:'Failed to load B', variant:'destructive' }); }
            }}>Load</Button>
            <Button variant="ghost" onClick={()=>{ setCmpA(null); setCmpB(null); }}>Clear</Button>
          </div>
          {(cmpA && cmpB) && (
            <div className="grid md:grid-cols-2 gap-4">
              {[{label:'Net PnL', key:'net_pnl'}, {label:'Return %', key:'return_percentage'}, {label:'Win Rate', key:'win_rate'}, {label:'Sharpe', key:'sharpe_ratio'}, {label:'Max DD', key:'max_drawdown'}].map((m)=> (
                <div key={m.key} className="p-3 border rounded">
                  <div className="text-sm font-medium mb-1">{m.label}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>A: {typeof (cmpA!.summary as any)[m.key]==='number'? (m.key==='net_pnl'? formatCurrency((cmpA!.summary as any)[m.key]) : formatNumber((cmpA!.summary as any)[m.key])): '—'}</div>
                    <div>B: {typeof (cmpB!.summary as any)[m.key]==='number'? (m.key==='net_pnl'? formatCurrency((cmpB!.summary as any)[m.key]) : formatNumber((cmpB!.summary as any)[m.key])): '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net PnL</CardTitle>
            <div className="flex items-center space-x-1">
              <span className={`text-2xl font-bold ${getValueColor(report.summary.net_pnl)}`}>
                {formatCurrency(report.summary.net_pnl)}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(report.summary.net_pnl.toString())}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return %</CardTitle>
            <div className="flex items-center space-x-1">
              <span className={`text-2xl font-bold ${getValueColor(report.summary.return_percentage)}`}>
                {formatPercentage(report.summary.return_percentage)}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(formatPercentage(report.summary.return_percentage))}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <div className="flex items-center space-x-1">
              <span className="text-2xl font-bold text-blue-600">
                {formatPercentage(report.summary.win_rate)}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(formatPercentage(report.summary.win_rate))}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <div className="flex items-center space-x-1">
              <span className="text-2xl font-bold">
                {formatNumber(report.summary.sharpe_ratio)}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(formatNumber(report.summary.sharpe_ratio))}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <div className="flex items-center space-x-1">
              <span className={`text-2xl font-bold ${getValueColor(report.summary.max_drawdown)}`}>
                {formatPercentage(report.summary.max_drawdown)}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(formatPercentage(report.summary.max_drawdown))}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Metrics</CardTitle>
          <CardDescription>Detailed performance and risk metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Profit Factor</span>
                <span className="font-medium">{formatNumber(report.summary.profit_factor)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Expectancy</span>
                <span className="font-medium">{formatCurrency(report.summary.expectancy)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sortino Ratio</span>
                <span className="font-medium">{formatNumber(report.summary.sortino_ratio)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Volatility</span>
                <span className="font-medium">{formatPercentage(report.summary.daily_volatility)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Risk of Ruin</span>
                <span className="font-medium">{formatPercentage(report.summary.risk_of_ruin, 4)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Confidence Decay</span>
                <span className="font-medium">{formatPercentage(report.summary.confidence_decay, 4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Alt Scenario Success</span>
                <span className="font-medium">{formatPercentage(report.summary.alternative_scenario_success)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Streak Consistency</span>
                <span className="font-medium">{formatPercentage(report.summary.streak_consistency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Fee %</span>
                <span className="font-medium">{formatPercentage(report.summary.fee_percentage, 4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Slippage (bps)</span>
                <span className="font-medium">{formatNumber(report.summary.slippage_bps, 1)} bps</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Account balance progression throughout the backtest period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.equity_curve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Balance']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>
            Complete record of all trades executed during the backtest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Timestamp</span>
                      {getSortIcon('timestamp')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('action')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Action</span>
                      {getSortIcon('action')}
                    </div>
                  </TableHead>
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
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      {getSortIcon('amount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Price</span>
                      {getSortIcon('price')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('pnl')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>PnL</span>
                      {getSortIcon('pnl')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTrades.map((trade, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm">
                      {new Date(trade.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.action === 'BUY' ? 'default' : 'secondary'}>
                        {trade.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>{formatNumber(trade.amount, 4)}</TableCell>
                    <TableCell>{formatCurrency(trade.price)}</TableCell>
                    <TableCell className={trade.pnl ? getValueColor(trade.pnl) : ''}>
                      {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedTrades.length)} of {sortedTrades.length} trades
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factor Performance */}
      {report.factor_performance && (
        <Card>
          <CardHeader>
            <CardTitle>Factor Performance</CardTitle>
            <CardDescription>Performance breakdown by trading factors</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factor Name</TableHead>
                  <TableHead>Avg. Confidence</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Return Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(report.factor_performance).map(([factor, data]) => (
                  <TableRow key={factor}>
                    <TableCell className="font-medium capitalize">
                      {factor.replace('_', ' ')}
                    </TableCell>
                    <TableCell>{formatPercentage(data.average_confidence)}</TableCell>
                    <TableCell>{formatPercentage(data.win_rate)}</TableCell>
                    <TableCell>{formatPercentage(data.return_contribution)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Hypothetical Trades Summary */}
      {report.hypothetical_trades && (
        <Card>
          <CardHeader>
            <CardTitle>Hypothetical Trades Summary</CardTitle>
            <CardDescription>Analysis of hypothetical trading scenarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hypothetical PnL</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getValueColor(report.hypothetical_trades.hypothetical_pnl)}`}>
                    {formatCurrency(report.hypothetical_trades.hypothetical_pnl)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Profit/loss from hypothetical scenarios
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPercentage(report.hypothetical_trades.hypothetical_success_rate)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hypothetical trade success ratio
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
