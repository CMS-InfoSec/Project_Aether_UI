import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { 
  Wallet, 
  Shield, 
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Settings,
  Target,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  BarChart3,
  Clock,
  Zap,
  Eye,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  Copy
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface HedgeRecord {
  id: string;
  userId: string;
  amount: number; // USDT amount
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

interface UserHedgeSettings {
  userId: string;
  hedgePercent: number; // 0-1
  autoAdjust: boolean;
  lastUpdated: string;
  updatedBy: string;
  effectivePercent?: number;
  marketConditions?: MarketConditions;
}

interface MarketConditions {
  volatility: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedHedgePercent: number;
  lastUpdated: string;
}

interface HedgeMetadata {
  total: number;
  limit: number;
  offset: number;
  totals: {
    totalHedged: number;
    totalPnl: number;
    totalFees: number;
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

interface HedgeResponse {
  total: number;
  items: HedgeRecord[];
  next: string | null;
  total_hedged: number;
  available_to_withdraw: number;
  max_safe_withdrawal: number;
}

export default function WalletHedge() {
  // Data state
  const [hedgeRecords, setHedgeRecords] = useState<HedgeRecord[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [withdrawable, setWithdrawable] = useState<WithdrawableCalculation | null>(null);
  const [hedgeSettings, setHedgeSettings] = useState<UserHedgeSettings | null>(null);
  const [hedgeMetadata, setHedgeMetadata] = useState<HedgeMetadata | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState({
    hedges: true,
    balances: true,
    withdrawable: true,
    settings: true,
    snapshot: false
  });
  
  // Action states
  const [isExecutingHedge, setIsExecutingHedge] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
  // UI state
  const [hedgeAmount, setHedgeAmount] = useState('');
  const [isHedgeDialogOpen, setIsHedgeDialogOpen] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [retryActions, setRetryActions] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Settings form
  const [tempHedgePercent, setTempHedgePercent] = useState(0);
  const [tempAutoAdjust, setTempAutoAdjust] = useState(true);

  // API request wrapper with error handling
  const apiRequest = useCallback(async (url: string, options?: RequestInit) => {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw new Error('Network error');
    }
  }, []);

  // Error handling helper
  const handleApiError = useCallback((section: string, error: any, retryFn?: () => void) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setApiErrors(prev => ({ ...prev, [section]: errorMessage }));
    
    if (retryFn) {
      setRetryActions(prev => new Set(prev).add(section));
    }
    
    console.error(`${section} error:`, error);
  }, []);

  const clearError = useCallback((section: string) => {
    setApiErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[section];
      return newErrors;
    });
    setRetryActions(prev => {
      const newSet = new Set(prev);
      newSet.delete(section);
      return newSet;
    });
  }, []);

  // Fetch hedge history with proper response handling
  const fetchHedges = useCallback(async (page = 1) => {
    clearError('hedges');
    setIsLoading(prev => ({ ...prev, hedges: true }));
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await apiRequest(`/api/wallet/hedges?limit=${itemsPerPage}&offset=${offset}`);
      
      if (response.status === 502) {
        throw new Error('Service temporarily unavailable. Please try again.');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setHedgeRecords(data.data);
        setHedgeMetadata(data.metadata);
      } else {
        throw new Error(data.message || 'Failed to fetch hedge history');
      }
    } catch (error) {
      handleApiError('hedges', error, () => fetchHedges(page));
    } finally {
      setIsLoading(prev => ({ ...prev, hedges: false }));
    }
  }, [currentPage, itemsPerPage, apiRequest, handleApiError, clearError]);

  // Fetch wallet balances
  const fetchBalances = useCallback(async () => {
    clearError('balances');
    setIsLoading(prev => ({ ...prev, balances: true }));
    
    try {
      const response = await apiRequest('/api/wallet/balances');
      
      if (response.status === 502) {
        throw new Error('Service temporarily unavailable. Please try again.');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setBalances(data.data.balances);
      } else {
        throw new Error(data.message || 'Failed to fetch balances');
      }
    } catch (error) {
      handleApiError('balances', error, fetchBalances);
    } finally {
      setIsLoading(prev => ({ ...prev, balances: false }));
    }
  }, [apiRequest, handleApiError, clearError]);

  // Fetch withdrawable funds
  const fetchWithdrawable = useCallback(async () => {
    clearError('withdrawable');
    setIsLoading(prev => ({ ...prev, withdrawable: true }));
    
    try {
      const response = await apiRequest('/api/wallet/withdrawable');
      
      if (response.status === 502) {
        throw new Error('Service temporarily unavailable. Please try again.');
      }
      
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
      handleApiError('withdrawable', error, fetchWithdrawable);
    } finally {
      setIsLoading(prev => ({ ...prev, withdrawable: false }));
    }
  }, [apiRequest, handleApiError, clearError]);

  // Fetch hedge settings
  const fetchSettings = useCallback(async () => {
    clearError('settings');
    setIsLoading(prev => ({ ...prev, settings: true }));
    
    try {
      const response = await apiRequest('/api/hedge/percent');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setHedgeSettings(data.data);
        setTempHedgePercent(data.data.hedgePercent * 100);
        setTempAutoAdjust(data.data.autoAdjust);
      } else {
        throw new Error(data.message || 'Failed to fetch settings');
      }
    } catch (error) {
      handleApiError('settings', error, fetchSettings);
    } finally {
      setIsLoading(prev => ({ ...prev, settings: false }));
    }
  }, [apiRequest, handleApiError, clearError]);

  // Fetch live snapshot
  const fetchSnapshot = useCallback(async () => {
    clearError('snapshot');
    setIsLoading(prev => ({ ...prev, snapshot: true }));
    
    try {
      const response = await apiRequest('/api/wallet/snapshot');
      
      if (response.status === 502) {
        throw new Error('Service temporarily unavailable. Please try again.');
      }
      
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
      handleApiError('snapshot', error, fetchSnapshot);
    } finally {
      setIsLoading(prev => ({ ...prev, snapshot: false }));
    }
  }, [apiRequest, handleApiError, clearError]);

  // Load all data on mount
  useEffect(() => {
    fetchHedges(1);
    fetchBalances();
    fetchWithdrawable();
    fetchSettings();
  }, [fetchHedges, fetchBalances, fetchWithdrawable, fetchSettings]);

  // Refresh current page of hedges when page changes
  useEffect(() => {
    fetchHedges(currentPage);
  }, [currentPage, fetchHedges]);

  // Execute hedge
  const handleExecuteHedge = async () => {
    const amount = parseFloat(hedgeAmount);
    
    if (!hedgeAmount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid hedge amount",
        variant: "destructive"
      });
      return;
    }

    setIsExecutingHedge(true);
    try {
      const response = await apiRequest('/api/hedge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          type: 'manual_hedge'
        }),
      });

      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid hedge request');
      }

      if (response.status >= 500) {
        throw new Error('Server error. Please try again.');
      }

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: "Hedge Executed",
          description: `Successfully hedged ${hedgeAmount} USDT`,
        });
        setIsHedgeDialogOpen(false);
        setHedgeAmount('');
        
        // Refresh data after execution
        await Promise.all([
          fetchHedges(currentPage),
          fetchBalances(),
          fetchWithdrawable()
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
      setIsExecutingHedge(false);
    }
  };

  // Update hedge settings
  const handleUpdateSettings = async () => {
    if (tempHedgePercent < 0 || tempHedgePercent > 100) {
      toast({
        title: "Invalid Input",
        description: "Hedge percent must be between 0 and 100",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingSettings(true);
    try {
      const response = await apiRequest('/api/hedge/percent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hedgePercent: tempHedgePercent / 100,
          autoAdjust: tempAutoAdjust
        }),
      });

      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid settings');
      }

      if (response.status >= 500) {
        throw new Error('Server error. Please try again.');
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
      setIsUpdatingSettings(false);
    }
  };

  // Close hedge position
  const handleCloseHedge = async (hedgeId: string) => {
    try {
      const response = await apiRequest(`/api/hedge/close/${hedgeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: "Hedge Closed",
          description: `Hedge position closed with P&L: ${data.data.pnl.toFixed(2)} USDT`,
        });
        await fetchHedges(currentPage);
      } else {
        throw new Error(data.message || 'Failed to close hedge');
      }
    } catch (error) {
      toast({
        title: "Close Failed",
        description: error instanceof Error ? error.message : "Failed to close hedge",
        variant: "destructive"
      });
    }
  };

  // Retry function
  const handleRetry = (section: string) => {
    switch (section) {
      case 'hedges':
        fetchHedges(currentPage);
        break;
      case 'balances':
        fetchBalances();
        break;
      case 'withdrawable':
        fetchWithdrawable();
        break;
      case 'settings':
        fetchSettings();
        break;
      case 'snapshot':
        fetchSnapshot();
        break;
    }
  };

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
      'active': { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 border-green-200' },
      'closed': { variant: 'secondary' as const, icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100 border-gray-200' },
      'expired': { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 border-red-200' }
    };

    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center space-x-1 ${config.bg} ${config.color}`}>
        <Icon className="h-3 w-3" />
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      'profit_hedge': { variant: 'default' as const, label: 'Profit', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'manual_hedge': { variant: 'outline' as const, label: 'Manual', color: 'bg-gray-100 text-gray-800 border-gray-200' },
      'auto_hedge': { variant: 'secondary' as const, label: 'Auto', color: 'bg-purple-100 text-purple-800 border-purple-200' }
    };

    const config = variants[type as keyof typeof variants] || variants.manual_hedge;

    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    const variants = {
      'low': { color: 'bg-green-100 text-green-800 border-green-200' },
      'medium': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'high': { color: 'bg-red-100 text-red-800 border-red-200' }
    };

    const config = variants[risk as keyof typeof variants] || variants.medium;

    return (
      <Badge className={config.color}>
        {risk.toUpperCase()}
      </Badge>
    );
  };

  // Calculate pagination
  const totalPages = hedgeMetadata ? Math.ceil(hedgeMetadata.total / itemsPerPage) : 1;
  const hasNext = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  // Get USDT balance for display
  const usdtBalance = balances.find(b => b.asset === 'USDT');
  
  // Get non-USDT holdings for holdings table
  const holdings = balances.filter(b => b.asset !== 'USDT');

  // Prepare pie chart data
  const pieChartData = holdings.map(balance => ({
    name: balance.asset,
    value: balance.valueUsd,
    total: balance.total
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Wallet & Hedge Control</h1>
            <p className="text-muted-foreground">
              Manage hedged funds and wallet balances (USDT exposure management)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => {
              fetchHedges(currentPage);
              fetchBalances();
              fetchWithdrawable();
              fetchSettings();
            }}>
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
                    Trigger hedging of profits into USDT
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hedgeAmount">Amount (USDT)</Label>
                    <Input
                      id="hedgeAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount to hedge"
                      value={hedgeAmount}
                      onChange={(e) => setHedgeAmount(e.target.value)}
                    />
                  </div>
                  {withdrawable && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Max safe hedge amount: {formatCurrency(withdrawable.maxSafeWithdrawal)}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsHedgeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleExecuteHedge} disabled={isExecutingHedge}>
                    {isExecutingHedge ? (
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

        {/* Offline indicator */}
        {!navigator.onLine && (
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You're currently offline. Some features may not be available.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Bar - displays total_hedged, available_to_withdraw, max_safe_withdrawal */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hedged</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isLoading.hedges ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  formatUSDT(hedgeMetadata?.totals.totalHedged || 0)
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
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading.withdrawable ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  formatCurrency(withdrawable?.availableToWithdraw || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                After safety buffer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Safe Withdrawal</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoading.withdrawable ? (
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hedge P&L</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                hedgeMetadata && hedgeMetadata.totals.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {isLoading.hedges ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  formatCurrency(hedgeMetadata?.totals.totalPnl || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Total profit/loss
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="hedges" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hedges">Hedge History</TabsTrigger>
            <TabsTrigger value="balances">Wallet Balances</TabsTrigger>
            <TabsTrigger value="snapshot">Live Snapshot</TabsTrigger>
            <TabsTrigger value="controls">Hedge Controls</TabsTrigger>
          </TabsList>

          {/* 1. Hedge History & Summary */}
          <TabsContent value="hedges" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Hedge History & Summary</CardTitle>
                  <CardDescription>
                    Track hedge positions and their performance
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchHedges(currentPage)}
                  disabled={isLoading.hedges}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading.hedges ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {/* Error handling for 502 errors */}
                {apiErrors.hedges && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      {apiErrors.hedges}
                      {retryActions.has('hedges') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRetry('hedges')}
                        >
                          Retry
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {isLoading.hedges ? (
                  <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Trigger Price</TableHead>
                            <TableHead>P&L</TableHead>
                            <TableHead>Fees</TableHead>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hedgeRecords.length > 0 ? (
                            hedgeRecords.map((hedge) => (
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
                                <TableCell>{formatCurrency(hedge.triggerPrice)}</TableCell>
                                <TableCell>
                                  <span className={hedge.pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    {formatCurrency(hedge.pnl)}
                                  </span>
                                </TableCell>
                                <TableCell>{formatCurrency(hedge.fees)}</TableCell>
                                <TableCell className="text-sm">
                                  {new Date(hedge.timestamp).toLocaleString()}
                                </TableCell>
                                <TableCell>{getStatusBadge(hedge.status)}</TableCell>
                                <TableCell>
                                  {hedge.status === 'active' && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          Close
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Close Hedge Position</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to close this hedge position?
                                            <br />Current P&L: {formatCurrency(hedge.pnl)}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleCloseHedge(hedge.id)}>
                                            Close Position
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8">
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, hedgeMetadata?.total || 0)} of {hedgeMetadata?.total || 0} hedges
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            disabled={!hasPrevious || isLoading.hedges}
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
                            disabled={!hasNext || isLoading.hedges}
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
          </TabsContent>

          {/* 2. Wallet Balances */}
          <TabsContent value="balances" className="space-y-4">
            {/* Error handling */}
            {apiErrors.balances && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  {apiErrors.balances}
                  {retryActions.has('balances') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRetry('balances')}
                    >
                      Retry
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* USDT Balance Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>USDT Balance</CardTitle>
                  <CardDescription>Stable coin exposure</CardDescription>
                </div>
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading.balances ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : usdtBalance ? (
                  <div className="space-y-4">
                    <div className="text-3xl font-bold text-green-600">
                      {formatUSDT(usdtBalance.total)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Available:</span>
                        <div className="font-medium text-green-600">{formatUSDT(usdtBalance.available)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Locked:</span>
                        <div className="font-medium text-yellow-600">{formatUSDT(usdtBalance.locked)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">USD Value:</span>
                        <div className="font-medium">{formatCurrency(usdtBalance.valueUsd)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No USDT balance found</div>
                )}
              </CardContent>
            </Card>

            {/* Holdings Table/Chart - USDT excluded from holdings */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Holdings</CardTitle>
                  <CardDescription>Non-USDT asset balances</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading.balances ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : holdings.length > 0 ? (
                    <div className="space-y-4">
                      {holdings.map((balance) => (
                        <div key={balance.asset} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{balance.asset}</div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(balance.valueUsd)}</div>
                              <div className="text-sm text-muted-foreground">
                                {balance.total.toFixed(6)} {balance.asset}
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Available:</span>
                              <div className={`font-medium ${balance.available === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {balance.available.toFixed(6)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Locked:</span>
                              <div className="font-medium text-yellow-600">
                                {balance.locked.toFixed(6)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total:</span>
                              <div className="font-medium">
                                {balance.total.toFixed(6)}
                              </div>
                            </div>
                          </div>

                          {/* Balance visualization */}
                          <div className="mt-2">
                            <div className="w-full bg-muted rounded-full h-2 flex">
                              <div 
                                className="bg-green-500 h-2 rounded-l-full" 
                                style={{ width: `${(balance.available / balance.total) * 100}%` }}
                              />
                              <div 
                                className="bg-yellow-500 h-2 rounded-r-full" 
                                style={{ width: `${(balance.locked / balance.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-8 w-8 mx-auto mb-2" />
                      <p>No non-USDT holdings found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Optional pie chart of asset distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Distribution</CardTitle>
                  <CardDescription>Portfolio allocation by value</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading.balances ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : pieChartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value) => [formatCurrency(value as number), 'Value']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                      <p>No data for chart</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Withdrawable Funds */}
            <Card>
              <CardHeader>
                <CardTitle>Withdrawable Funds</CardTitle>
                <CardDescription>Safe USDT amount available for withdrawal</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Error handling for 502 errors */}
                {apiErrors.withdrawable && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      {apiErrors.withdrawable}
                      {retryActions.has('withdrawable') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRetry('withdrawable')}
                        >
                          Retry
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {isLoading.withdrawable ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : withdrawable ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Value</div>
                      <div className="text-lg font-bold">{formatCurrency(withdrawable.totalValue)}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Locked Value</div>
                      <div className="text-lg font-bold text-yellow-600">{formatCurrency(withdrawable.lockedValue)}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Hedged Value</div>
                      <div className="text-lg font-bold text-blue-600">{formatCurrency(withdrawable.hedgedValue)}</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-green-50">
                      <div className="text-sm text-muted-foreground">Available to Withdraw</div>
                      <div className="text-lg font-bold text-green-600">{formatCurrency(withdrawable.availableToWithdraw)}</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-blue-50">
                      <div className="text-sm text-muted-foreground">Max Safe Withdrawal</div>
                      <div className="text-lg font-bold text-blue-600">{formatCurrency(withdrawable.maxSafeWithdrawal)}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Safety Buffer</div>
                      <div className="text-lg font-bold">{formatCurrency(withdrawable.safetyBuffer)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Unable to load withdrawable funds</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Live Snapshot (optional) */}
          <TabsContent value="snapshot" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Live Snapshot</CardTitle>
                  <CardDescription>Real-time balances vs stored portfolio</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchSnapshot}
                  disabled={isLoading.snapshot}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading.snapshot ? 'animate-spin' : ''}`} />
                  Refresh Snapshot
                </Button>
              </CardHeader>
              <CardContent>
                {/* Error handling for 502 failures */}
                {apiErrors.snapshot && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      {apiErrors.snapshot}
                      {retryActions.has('snapshot') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRetry('snapshot')}
                        >
                          Retry
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {isLoading.snapshot ? (
                  <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : snapshot ? (
                  <div className="space-y-6">
                    {/* Drift Indicator */}
                    {snapshot.drift.exceeded && (
                      <Alert variant={snapshot.drift.percent > 0 ? "default" : "destructive"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Drift Alert:</strong> Portfolio has drifted {snapshot.drift.percent.toFixed(2)}% 
                          from stored values (tolerance: ±{snapshot.drift.tolerance}%)
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Snapshot Panel */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Live Portfolio</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(snapshot.live.total)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {snapshot.live.balances.length} assets
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Stored Portfolio</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(snapshot.stored.total)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {snapshot.stored.balances.length} assets
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Drift</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${
                            snapshot.drift.percent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {snapshot.drift.percent >= 0 ? '+' : ''}{snapshot.drift.percent.toFixed(2)}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(snapshot.drift.absolute)} difference
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Hedged Amount */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Hedge Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-blue-600">
                          {formatUSDT(snapshot.hedged)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Currently hedged amount
                        </div>
                      </CardContent>
                    </Card>

                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(snapshot.lastUpdated).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2" />
                    <p>Click "Refresh Snapshot" to load live data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Hedge Controls */}
          <TabsContent value="controls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hedge Controls</CardTitle>
                <CardDescription>
                  Configure hedge percentage and auto-adjustment settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Error handling */}
                {apiErrors.settings && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      {apiErrors.settings}
                      {retryActions.has('settings') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRetry('settings')}
                        >
                          Retry
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {isLoading.settings ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : hedgeSettings ? (
                  <>
                    {/* Market Conditions Display */}
                    {hedgeSettings.marketConditions && (
                      <Alert>
                        <Activity className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div className="font-medium">Current Market Conditions</div>
                            <div className="text-sm space-y-1">
                              <div>Volatility: {(hedgeSettings.marketConditions.volatility * 100).toFixed(1)}%</div>
                              <div className="flex items-center space-x-2">
                                <span>Risk Level:</span>
                                {getRiskBadge(hedgeSettings.marketConditions.riskLevel)}
                              </div>
                              <div>Recommended Hedge: {(hedgeSettings.marketConditions.recommendedHedgePercent * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Auto-Adjust Hedge Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">Auto-Adjust Hedge</div>
                        <div className="text-sm text-muted-foreground">
                          Enable to automatically adjust hedge percentage based on market conditions
                        </div>
                      </div>
                      <Switch
                        checked={tempAutoAdjust}
                        onCheckedChange={setTempAutoAdjust}
                      />
                    </div>

                    {/* Hedge Percent Input (0-1 range) */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="hedgePercent" className="text-sm font-medium">
                          Hedge Percent: {tempHedgePercent.toFixed(1)}%
                          {tempAutoAdjust && hedgeSettings.effectivePercent && (
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
                          value={tempHedgePercent}
                          onChange={(e) => setTempHedgePercent(parseFloat(e.target.value) || 0)}
                          disabled={tempAutoAdjust}
                          className="mt-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Range: 0% - 100% (percentage of profits to hedge into USDT)
                        </div>
                      </div>

                      {tempAutoAdjust && (
                        <Alert>
                          <Zap className="h-4 w-4" />
                          <AlertDescription>
                            Auto-adjust is enabled. The system will automatically optimize hedge percentage based on market volatility and risk metrics.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Current Settings Display */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Current Settings</div>
                      <div className="space-y-1 text-sm">
                        <div>Hedge Percent: {(hedgeSettings.hedgePercent * 100).toFixed(1)}%</div>
                        <div>Auto-Adjust: {hedgeSettings.autoAdjust ? 'Enabled' : 'Disabled'}</div>
                        {hedgeSettings.effectivePercent && (
                          <div>Effective Percent: {(hedgeSettings.effectivePercent * 100).toFixed(1)}%</div>
                        )}
                        <div>Last Updated: {new Date(hedgeSettings.lastUpdated).toLocaleString()}</div>
                        <div>Updated By: {hedgeSettings.updatedBy}</div>
                      </div>
                    </div>

                    {/* Save Hedge Settings Button */}
                    <Button 
                      onClick={handleUpdateSettings} 
                      disabled={isUpdatingSettings}
                      className="w-full"
                    >
                      {isUpdatingSettings ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Save Hedge Settings
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-8 w-8 mx-auto mb-2" />
                    <p>Unable to load hedge settings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
