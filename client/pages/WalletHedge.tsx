import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { 
  Wallet, 
  Shield, 
  DollarSign,
  ArrowDownRight,
  RefreshCw,
  Settings,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  TrendingUp,
  TrendingDown,
  HelpCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface HedgeRecord {
  id: string;
  userId: string;
  amount: number;
  timestamp: string;
  type: 'profit_hedge' | 'manual_hedge' | 'auto_hedge';
  triggerPrice: number;
  status: 'active' | 'closed' | 'expired';
  pnl: number;
  fees: number;
}

interface Balance {
  asset: string;
  available: number;
  locked: number;
  total: number;
  valueUsd: number;
}

interface WithdrawableCalculation {
  totalValue: number;
  lockedValue: number;
  hedgedValue: number;
  availableToWithdraw: number;
  maxSafeWithdrawal: number;
  safetyBuffer: number;
}

interface HedgeSettings {
  userId: string;
  hedgePercent: number; // 0-1
  autoAdjust: boolean;
  lastUpdated: string;
  updatedBy: string;
  effectivePercent?: number;
  marketConditions?: {
    volatility: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendedHedgePercent: number;
    lastUpdated: string;
  };
}

interface Snapshot {
  live: {
    total: number;
    balances: Array<{
      asset: string;
      free: number;
      locked: number;
      total: number;
      valueUsd: number;
    }>;
  };
  stored: {
    total: number;
    balances: Array<{
      asset: string;
      free: number;
      locked: number;
      total: number;
      valueUsd: number;
    }>;
  };
  hedged: number;
  drift: {
    absolute: number;
    percent: number;
    tolerance: number;
    exceeded: boolean;
  };
  lastUpdated: string;
}

export default function WalletHedge() {
  // Data state
  const [hedgeData, setHedgeData] = useState<{
    hedges: HedgeRecord[];
    summary: {
      totalHedged: number;
      availableToWithdraw: number;
      maxSafeWithdrawal: number;
      totalPnl: number;
      totalFees: number;
    };
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasNext: boolean;
    };
  } | null>(null);
  
  const [balances, setBalances] = useState<{
    balances: Balance[];
    summary: {
      totalValue: number;
      totalAvailable: number;
      totalLocked: number;
      assetCount: number;
    };
  } | null>(null);
  
  const [withdrawable, setWithdrawable] = useState<WithdrawableCalculation | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [hedgeSettings, setHedgeSettings] = useState<HedgeSettings | null>(null);

  // Wallet credentials state
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiExpiry, setApiExpiry] = useState('');
  const [apiStatus, setApiStatus] = useState<{present:boolean; valid:boolean; expiring_soon:boolean; expires_at:string|null; key_masked:string|null} | null>(null);

  // Risk panel state
  const [runtimeConfig, setRuntimeConfig] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tradeDiagId, setTradeDiagId] = useState('');
  const [tradeDiag, setTradeDiag] = useState<any>(null);

  // Personal overrides state
  const [currentOverrides, setCurrentOverrides] = useState<any>(null);
  const [overrideForm, setOverrideForm] = useState<{ sl_multiplier:number; tp_multiplier:number; trailing_stop:number; use_news_analysis:boolean }>({ sl_multiplier:0.5, tp_multiplier:2.0, trailing_stop:0.1, use_news_analysis:true });
  const [confirmOverridesOpen, setConfirmOverridesOpen] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState({
    hedges: true,
    balances: true,
    withdrawable: true,
    snapshot: false,
    settings: true,
    executeHedge: false,
    saveSettings: false,
    apiKeys: false,
    runtime: true,
    profile: true,
    overrides: false,
    tradeDiag: false
  });
  
  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [hedgePercent, setHedgePercent] = useState(0);
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(true);
  const [isHedgeDialogOpen, setIsHedgeDialogOpen] = useState(false);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatUSDT = (amount: number) => {
    return `${amount.toFixed(2)} USDT`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Transaction ID copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': { variant: 'default' as const, icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
      'closed': { variant: 'secondary' as const, icon: XCircle, className: 'bg-gray-100 text-gray-800 border-gray-200' },
      'expired': { variant: 'destructive' as const, icon: AlertTriangle, className: 'bg-red-100 text-red-800 border-red-200' }
    };

    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center space-x-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      'profit_hedge': { label: 'Profit', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      'manual_hedge': { label: 'Manual', className: 'bg-gray-100 text-gray-800 border-gray-200' },
      'auto_hedge': { label: 'Auto', className: 'bg-purple-100 text-purple-800 border-purple-200' }
    };

    const config = variants[type as keyof typeof variants] || variants.manual_hedge;

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // API Functions

  // 1. Fetch hedge history & summary
  const fetchHedgeHistory = useCallback(async (page = 1) => {
    setLoading(prev => ({ ...prev, hedges: true }));
    setErrors(prev => ({ ...prev, hedges: '' }));
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await fetch(`/api/wallet/hedges?limit=${itemsPerPage}&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setHedgeData(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch hedge history');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch hedge history';
      setErrors(prev => ({ ...prev, hedges: errorMessage }));
    } finally {
      setLoading(prev => ({ ...prev, hedges: false }));
    }
  }, [itemsPerPage]);

  // 2. Fetch wallet balances
  const fetchWalletBalances = useCallback(async () => {
    setLoading(prev => ({ ...prev, balances: true }));
    setErrors(prev => ({ ...prev, balances: '' }));
    
    try {
      const response = await fetch('/api/wallet/balances');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setBalances(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch balances');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch balances';
      setErrors(prev => ({ ...prev, balances: errorMessage }));
    } finally {
      setLoading(prev => ({ ...prev, balances: false }));
    }
  }, []);

  // 3. Fetch withdrawable funds
  const fetchWithdrawableFunds = useCallback(async () => {
    setLoading(prev => ({ ...prev, withdrawable: true }));
    setErrors(prev => ({ ...prev, withdrawable: '' }));
    
    try {
      const response = await fetch('/api/wallet/withdrawable');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setWithdrawable(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch withdrawable funds');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch withdrawable funds';
      setErrors(prev => ({ ...prev, withdrawable: errorMessage }));
    } finally {
      setLoading(prev => ({ ...prev, withdrawable: false }));
    }
  }, []);

  // 4. Fetch live snapshot
  const fetchLiveSnapshot = useCallback(async () => {
    setLoading(prev => ({ ...prev, snapshot: true }));
    setErrors(prev => ({ ...prev, snapshot: '' }));
    
    try {
      const response = await fetch('/api/wallet/snapshot');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setSnapshot(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch snapshot');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch snapshot';
      setErrors(prev => ({ ...prev, snapshot: errorMessage }));
    } finally {
      setLoading(prev => ({ ...prev, snapshot: false }));
    }
  }, []);

  // 5. Fetch hedge settings
  const fetchHedgeSettings = useCallback(async () => {
    setLoading(prev => ({ ...prev, settings: true }));
    setErrors(prev => ({ ...prev, settings: '' }));
    
    try {
      const response = await fetch('/api/hedge/percent');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setHedgeSettings(data.data);
        setHedgePercent(data.data.hedgePercent * 100);
        setAutoAdjustEnabled(data.data.autoAdjust);
      } else {
        throw new Error(data.message || 'Failed to fetch hedge settings');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch hedge settings';
      setErrors(prev => ({ ...prev, settings: errorMessage }));
    } finally {
      setLoading(prev => ({ ...prev, settings: false }));
    }
  }, []);

  // Execute hedge
  const executeHedge = useCallback(async () => {
    setLoading(prev => ({ ...prev, executeHedge: true }));
    
    try {
      const response = await fetch('/api/hedge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual_hedge'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: "Hedge Executed",
          description: `Hedge executed successfully`,
        });
        setIsHedgeDialogOpen(false);
        
        // Refresh data after execution
        await Promise.all([
          fetchHedgeHistory(currentPage),
          fetchWalletBalances(),
          fetchWithdrawableFunds()
        ]);
      } else {
        throw new Error(data.message || 'Failed to execute hedge');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to execute hedge";
      toast({
        title: "Hedge Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, executeHedge: false }));
    }
  }, [currentPage, fetchHedgeHistory, fetchWalletBalances, fetchWithdrawableFunds]);

  // Save hedge settings
  const saveHedgeSettings = useCallback(async () => {
    if (hedgePercent < 0 || hedgePercent > 100) {
      toast({
        title: "Invalid Input",
        description: "Hedge percent must be between 0 and 100",
        variant: "destructive"
      });
      return;
    }

    setLoading(prev => ({ ...prev, saveSettings: true }));
    
    try {
      const response = await fetch('/api/hedge/percent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hedgePercent: hedgePercent / 100,
          autoAdjust: autoAdjustEnabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setHedgeSettings(data.data);
        toast({
          title: "Settings Updated",
          description: "Hedge settings updated successfully",
        });
      } else {
        throw new Error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update settings";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, saveSettings: false }));
    }
  }, [hedgePercent, autoAdjustEnabled]);

  // Initial data loading
  useEffect(() => {
    fetchHedgeHistory(1);
    fetchWalletBalances();
    fetchWithdrawableFunds();
    fetchHedgeSettings();
    fetchLiveSnapshot();
    (async()=>{ try{ const r=await fetch('/api/wallet/api-keys/status'); const j=await r.json(); setApiStatus(j.data);}catch{}})();
    (async()=>{ try{ const r=await fetch('/api/config/runtime'); const j=await r.json(); setRuntimeConfig(j.data);}catch{} finally { setLoading(prev=>({...prev,runtime:false})); }})();
    (async()=>{ try{ const r=await fetch('/api/user/profile'); const j=await r.json(); setUserProfile(j.data);}catch{} finally { setLoading(prev=>({...prev,profile:false})); }})();
    (async()=>{ try{ const r=await fetch('/api/user/trading-settings'); const j=await r.json(); setCurrentOverrides(j.data.settings); setOverrideForm(j.data.settings);}catch{}})();
  }, [fetchHedgeHistory, fetchWalletBalances, fetchWithdrawableFunds, fetchHedgeSettings, fetchLiveSnapshot]);

  // Refresh data when page changes
  useEffect(() => {
    fetchHedgeHistory(currentPage);
  }, [currentPage, fetchHedgeHistory]);

  // Refresh all data
  const refreshAll = () => {
    fetchHedgeHistory(currentPage);
    fetchWalletBalances();
    fetchWithdrawableFunds();
    fetchHedgeSettings();
    (async()=>{ try{ const r=await fetch('/api/wallet/api-keys/status'); const j=await r.json(); setApiStatus(j.data);}catch{}})();
  };

  // Pagination
  const totalPages = hedgeData ? Math.ceil(hedgeData.pagination.total / itemsPerPage) : 1;
  const hasNext = hedgeData?.pagination.hasNext || false;
  const hasPrevious = currentPage > 1;

  // Get USDT balance
  const usdtBalance = balances?.balances.find(b => b.asset === 'USDT');
  
  // Get non-USDT holdings
  const holdings = balances?.balances.filter(b => b.asset !== 'USDT') || [];

  // Prepare pie chart data
  const pieChartData = holdings.map(balance => ({
    name: balance.asset,
    value: balance.valueUsd,
    total: balance.total
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hedge & Wallet Control</h1>
          <p className="text-muted-foreground">
            Manage hedged funds, view balances, and control USDT exposure
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          <Dialog open={isHedgeDialogOpen} onOpenChange={setIsHedgeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Shield className="h-4 w-4 mr-2" />
                Execute Hedge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Execute Hedge</DialogTitle>
                <DialogDescription>
                  Initiate hedging of profits into USDT
                </DialogDescription>
              </DialogHeader>
              {withdrawable && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Max safe hedge amount: {formatCurrency(withdrawable.maxSafeWithdrawal)}
                  </AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsHedgeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={executeHedge} disabled={loading.executeHedge}>
                  {loading.executeHedge ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    'Execute Hedge'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hedged</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading.hedges ? (
                <RefreshCw className="h-6 w-6 animate-spin" />
              ) : (
                formatUSDT(hedgeData?.summary.totalHedged || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Active hedge positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available to Withdraw</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              withdrawable && withdrawable.availableToWithdraw < (hedgeData?.summary.totalHedged || 0) ? 'text-red-600' : 'text-green-600'
            }`}>
              {loading.withdrawable ? (
                <RefreshCw className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(withdrawable?.availableToWithdraw || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {withdrawable && withdrawable.availableToWithdraw < (hedgeData?.summary.totalHedged || 0) 
                ? 'Below required hedge!' 
                : 'After safety buffer'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Safe Withdrawal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading.withdrawable ? (
                <RefreshCw className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(withdrawable?.maxSafeWithdrawal || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Considering hedge positions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Hedge History & Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Hedge Records</CardTitle>
              <CardDescription>
                Hedge positions with pagination and status tracking
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchHedgeHistory(currentPage)}
              disabled={loading.hedges}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading.hedges ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {errors.hedges && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.hedges}</AlertDescription>
              </Alert>
            )}

            {loading.hedges ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hedgeData?.hedges.length ? (
                        hedgeData.hedges.map((hedge) => (
                          <TableRow 
                            key={hedge.id}
                            className={hedge.status === 'active' ? 'bg-green-50/50' : 
                                     hedge.status === 'closed' ? 'bg-gray-50/50' : 'bg-red-50/50'}
                          >
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center space-x-2">
                                <span>{hedge.id}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(hedge.id)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{getTypeBadge(hedge.type)}</TableCell>
                            <TableCell className="font-medium">{formatUSDT(hedge.amount)}</TableCell>
                            <TableCell>{getStatusBadge(hedge.status)}</TableCell>
                            <TableCell>
                              <span className={hedge.pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {formatCurrency(hedge.pnl)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(hedge.timestamp).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="text-muted-foreground">
                              <Shield className="h-8 w-8 mx-auto mb-2" />
                              <p>No hedge positions found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, hedgeData?.pagination.total || 0)} of {hedgeData?.pagination.total || 0} records
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        disabled={!hasPrevious || loading.hedges}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={!hasNext || loading.hedges}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 2. Wallet Balances */}
        <Card>
          <CardHeader>
            <CardTitle>USDT Balance</CardTitle>
            <CardDescription>Stable coin exposure</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.balances && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.balances}</AlertDescription>
              </Alert>
            )}

            {loading.balances ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : usdtBalance ? (
              <div className="space-y-4">
                <div className="text-3xl font-bold text-green-600">
                  {formatUSDT(usdtBalance.total)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Available:</span>
                    <div className="font-medium text-green-600">{formatUSDT(usdtBalance.available)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Locked:</span>
                    <div className="font-medium text-yellow-600">{formatUSDT(usdtBalance.locked)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No USDT balance found</div>
            )}
          </CardContent>
        </Card>

        {/* Holdings Table/Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Non-USDT asset distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {loading.balances ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : holdings.length > 0 ? (
              <div className="space-y-4">
                {/* Asset list */}
                <div className="space-y-2">
                  {holdings.slice(0, 3).map((balance) => (
                    <div key={balance.asset} className="flex items-center justify-between">
                      <div className="font-medium">{balance.asset}</div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(balance.valueUsd)}</div>
                        <div className="text-xs text-muted-foreground">
                          {balance.total.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {holdings.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      +{holdings.length - 3} more assets
                    </div>
                  )}
                </div>

                {/* Pie chart */}
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => [formatCurrency(value as number), 'Value']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2" />
                <p>No holdings found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Withdrawable Funds */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawable Funds</CardTitle>
            <CardDescription>Safe USDT amount not needed for hedges</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.withdrawable && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.withdrawable}</AlertDescription>
              </Alert>
            )}

            {loading.withdrawable ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : withdrawable ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="text-lg font-bold">{formatCurrency(withdrawable.totalValue)}</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Hedged Value</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(withdrawable.hedgedValue)}</div>
                </div>
                <div className="p-3 border rounded-lg bg-green-50">
                  <div className="text-sm text-muted-foreground">Available</div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(withdrawable.availableToWithdraw)}</div>
                </div>
                <div className="p-3 border rounded-lg bg-blue-50">
                  <div className="text-sm text-muted-foreground">Max Safe</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(withdrawable.maxSafeWithdrawal)}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Unable to load withdrawable funds</div>
            )}
          </CardContent>
        </Card>

        {/* 4. Live Snapshot (optional) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live Snapshot</CardTitle>
              <CardDescription>Free, locked, hedged, drift</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchLiveSnapshot}
              disabled={loading.snapshot}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading.snapshot ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {errors.snapshot && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.snapshot}</AlertDescription>
              </Alert>
            )}

            {loading.snapshot ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : snapshot ? (
              <div className="space-y-4">
                {/* Drift warning */}
                {snapshot.drift.exceeded && (
                  <Alert variant={snapshot.drift.percent > 0 ? "default" : "destructive"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Drift Alert:</strong> {snapshot.drift.percent.toFixed(2)}% 
                      (tolerance: ±{snapshot.drift.tolerance}%)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Live Total</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(snapshot.live.total)}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Stored Total</div>
                    <div className="text-lg font-bold text-blue-600">{formatCurrency(snapshot.stored.total)}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Hedged</div>
                    <div className="text-lg font-bold text-purple-600">{formatUSDT(snapshot.hedged)}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Drift</div>
                    <div className={`text-lg font-bold ${
                      snapshot.drift.percent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {snapshot.drift.percent >= 0 ? '+' : ''}{snapshot.drift.percent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(snapshot.lastUpdated).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-2" />
                <p>Click "Refresh" to load live data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Hedge Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Hedge Controls</CardTitle>
          <CardDescription>
            Configure hedge percentage and auto-adjustment settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errors.settings && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.settings}</AlertDescription>
            </Alert>
          )}

          {loading.settings ? (
            <RefreshCw className="h-6 w-6 animate-spin" />
          ) : (
            <>
              {/* Auto-Adjust Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">Auto-Adjust Hedge</div>
                  <div className="text-sm text-muted-foreground">
                    Enable to automatically adjust hedge percentage based on market conditions
                  </div>
                </div>
                <Switch
                  checked={autoAdjustEnabled}
                  onCheckedChange={setAutoAdjustEnabled}
                />
              </div>

              {/* Hedge Percent Input */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hedgePercent" className="text-sm font-medium">
                    Hedge Percent: {hedgePercent.toFixed(1)}%
                    {autoAdjustEnabled && hedgeSettings?.effectivePercent && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        (Effective: {(hedgeSettings.effectivePercent * 100).toFixed(1)}%)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="hedgePercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={hedgePercent}
                    onChange={(e) => setHedgePercent(parseFloat(e.target.value) || 0)}
                    disabled={autoAdjustEnabled}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Range: 0% - 100% (percentage of profits to hedge into USDT)
                  </div>
                </div>

                {/* Market Conditions */}
                {hedgeSettings?.marketConditions && (
                  <Alert>
                    <Activity className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div className="font-medium">Market Conditions</div>
                        <div className="text-sm">
                          Volatility: {(hedgeSettings.marketConditions.volatility * 100).toFixed(1)}% | 
                          Risk: {hedgeSettings.marketConditions.riskLevel.toUpperCase()} | 
                          Recommended: {(hedgeSettings.marketConditions.recommendedHedgePercent * 100).toFixed(1)}%
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Save Button */}
                <Button 
                  onClick={saveHedgeSettings} 
                  disabled={loading.saveSettings}
                  className="w-full"
                >
                  {loading.saveSettings ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Save Hedge Settings
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
