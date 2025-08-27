import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Zap
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

export default function WalletHedge() {
  const [hedgeRecords, setHedgeRecords] = useState<HedgeRecord[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [withdrawable, setWithdrawable] = useState<WithdrawableCalculation | null>(null);
  const [hedgeSettings, setHedgeSettings] = useState<UserHedgeSettings | null>(null);
  const [hedgeMetadata, setHedgeMetadata] = useState<HedgeMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecutingHedge, setIsExecutingHedge] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [hedgeAmount, setHedgeAmount] = useState('');
  const [isHedgeDialogOpen, setIsHedgeDialogOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Settings form
  const [tempHedgePercent, setTempHedgePercent] = useState(0);
  const [tempAutoAdjust, setTempAutoAdjust] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [hedgesRes, balancesRes, withdrawableRes, settingsRes] = await Promise.all([
        fetch(`/api/wallet/hedges?limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`),
        fetch('/api/wallet/balances'),
        fetch('/api/wallet/withdrawable'),
        fetch('/api/hedge/percent')
      ]);

      const [hedgesData, balancesData, withdrawableData, settingsData] = await Promise.all([
        hedgesRes.json(),
        balancesRes.json(),
        withdrawableRes.json(),
        settingsRes.json()
      ]);

      if (hedgesData.status === 'success') {
        setHedgeRecords(hedgesData.data);
        setHedgeMetadata(hedgesData.metadata);
      }

      if (balancesData.status === 'success') {
        setBalances(balancesData.data.balances);
      }

      if (withdrawableData.status === 'success') {
        setWithdrawable(withdrawableData.data);
      }

      if (settingsData.status === 'success') {
        setHedgeSettings(settingsData.data);
        setTempHedgePercent(settingsData.data.hedgePercent * 100);
        setTempAutoAdjust(settingsData.data.autoAdjust);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wallet data",
        variant: "destructive"
      });
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    loadData();
  }, [fetchData]);

  // Execute hedge
  const handleExecuteHedge = async () => {
    if (!hedgeAmount || parseFloat(hedgeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid hedge amount",
        variant: "destructive"
      });
      return;
    }

    setIsExecutingHedge(true);
    try {
      const response = await fetch('/api/hedge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(hedgeAmount),
          type: 'manual_hedge'
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: "Hedge Executed",
          description: `Successfully hedged ${hedgeAmount} USDT`,
        });
        setIsHedgeDialogOpen(false);
        setHedgeAmount('');
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Hedge Failed",
        description: error instanceof Error ? error.message : "Failed to execute hedge",
        variant: "destructive"
      });
    } finally {
      setIsExecutingHedge(false);
    }
  };

  // Update hedge settings
  const handleUpdateSettings = async () => {
    setIsUpdatingSettings(true);
    try {
      const response = await fetch('/api/hedge/percent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hedgePercent: tempHedgePercent / 100,
          autoAdjust: tempAutoAdjust
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setHedgeSettings(data.data);
        toast({
          title: "Settings Updated",
          description: "Hedge settings updated successfully",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Close hedge position
  const handleCloseHedge = async (hedgeId: string) => {
    try {
      const response = await fetch(`/api/hedge/close/${hedgeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: "Hedge Closed",
          description: `Hedge position closed with P&L: ${data.data.pnl.toFixed(2)} USDT`,
        });
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Close Failed",
        description: error instanceof Error ? error.message : "Failed to close hedge",
        variant: "destructive"
      });
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

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      'closed': { variant: 'secondary' as const, icon: XCircle, color: 'text-gray-600' },
      'expired': { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' }
    };

    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      'profit_hedge': { variant: 'default' as const, label: 'Profit' },
      'manual_hedge': { variant: 'outline' as const, label: 'Manual' },
      'auto_hedge': { variant: 'secondary' as const, label: 'Auto' }
    };

    const config = variants[type as keyof typeof variants] || variants.manual_hedge;

    return (
      <Badge variant={config.variant}>
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

  const totalPages = hedgeMetadata ? Math.ceil(hedgeMetadata.total / itemsPerPage) : 1;

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
          <h1 className="text-3xl font-bold tracking-tight">Hedge & Wallet Control</h1>
          <p className="text-muted-foreground">
            Display and manage hedged funds (USDT only)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hedged</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {hedgeMetadata ? formatUSDT(hedgeMetadata.totals.totalHedged) : formatUSDT(0)}
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
              {withdrawable ? formatCurrency(withdrawable.availableToWithdraw) : formatCurrency(0)}
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
            <div className="text-2xl font-bold text-primary">
              {withdrawable ? formatCurrency(withdrawable.maxSafeWithdrawal) : formatCurrency(0)}
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
            <div className={`text-2xl font-bold ${hedgeMetadata && hedgeMetadata.totals.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {hedgeMetadata ? formatCurrency(hedgeMetadata.totals.totalPnl) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total profit/loss
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hedges" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hedges">Hedge Summary</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="settings">Hedge Control</TabsTrigger>
        </TabsList>

        {/* Hedge Summary Table */}
        <TabsContent value="hedges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hedge Summary Table</CardTitle>
              <CardDescription>
                History of hedge positions and their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hedgeRecords.length > 0 ? (
                      hedgeRecords.map((hedge) => (
                        <TableRow key={hedge.id}>
                          <TableCell className="font-mono text-sm">{hedge.id}</TableCell>
                          <TableCell>{getTypeBadge(hedge.type)}</TableCell>
                          <TableCell className="font-medium">{formatUSDT(hedge.amount)}</TableCell>
                          <TableCell>{formatCurrency(hedge.triggerPrice)}</TableCell>
                          <TableCell>
                            <span className={hedge.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(hedge.pnl)}
                            </span>
                          </TableCell>
                          <TableCell>{formatCurrency(hedge.fees)}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(hedge.timestamp).toLocaleDateString()}
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
                                      Current P&L: {formatCurrency(hedge.pnl)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
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
        </TabsContent>

        {/* Balances */}
        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Balances</CardTitle>
              <CardDescription>
                Current asset balances and availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {balances.map((balance) => (
                  <div key={balance.asset} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-lg">{balance.asset}</div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(balance.valueUsd)}</div>
                        <div className="text-sm text-muted-foreground">
                          {balance.total.toFixed(balance.asset === 'USDT' ? 2 : 6)} {balance.asset}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Available:</span>
                        <div className="font-medium text-accent">
                          {balance.available.toFixed(balance.asset === 'USDT' ? 2 : 6)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Locked:</span>
                        <div className="font-medium text-yellow-600">
                          {balance.locked.toFixed(balance.asset === 'USDT' ? 2 : 6)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <div className="font-medium">
                          {balance.total.toFixed(balance.asset === 'USDT' ? 2 : 6)}
                        </div>
                      </div>
                    </div>

                    {/* Balance visualization */}
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2 flex">
                        <div 
                          className="bg-accent h-2 rounded-l-full" 
                          style={{ width: `${(balance.available / balance.total) * 100}%` }}
                        />
                        <div 
                          className="bg-yellow-500 h-2 rounded-r-full" 
                          style={{ width: `${(balance.locked / balance.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Available: {((balance.available / balance.total) * 100).toFixed(0)}%</span>
                        <span>Locked: {((balance.locked / balance.total) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Withdrawable Summary */}
              {withdrawable && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Withdrawable Funds Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Value:</span>
                        <div className="font-medium text-lg">{formatCurrency(withdrawable.totalValue)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Locked Value:</span>
                        <div className="font-medium text-lg text-yellow-600">{formatCurrency(withdrawable.lockedValue)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hedged Value:</span>
                        <div className="font-medium text-lg text-accent">{formatCurrency(withdrawable.hedgedValue)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Available to Withdraw:</span>
                        <div className="font-medium text-lg">{formatCurrency(withdrawable.availableToWithdraw)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Safe Withdrawal:</span>
                        <div className="font-medium text-lg text-primary">{formatCurrency(withdrawable.maxSafeWithdrawal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Safety Buffer:</span>
                        <div className="font-medium text-lg">{formatCurrency(withdrawable.safetyBuffer)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adaptive Hedge Control */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Adaptive Hedge Control</CardTitle>
              <CardDescription>
                Configure automatic hedge percentage and market adaptation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hedgeSettings && (
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
                            <div>Risk Level: {getRiskBadge(hedgeSettings.marketConditions.riskLevel)}</div>
                            <div>Recommended Hedge: {(hedgeSettings.marketConditions.recommendedHedgePercent * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Auto-Adjust Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">Auto-Adjust Hedge Percent</div>
                      <div className="text-sm text-muted-foreground">
                        When enabled, hedge percent adapts automatically to market conditions
                      </div>
                    </div>
                    <Switch
                      checked={tempAutoAdjust}
                      onCheckedChange={setTempAutoAdjust}
                    />
                  </div>

                  {/* Hedge Percent Control */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">
                        Hedge Percent: {tempHedgePercent.toFixed(1)}%
                        {tempAutoAdjust && hedgeSettings.effectivePercent && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            (Effective: {(hedgeSettings.effectivePercent * 100).toFixed(1)}%)
                          </span>
                        )}
                      </Label>
                      <div className="mt-2">
                        <Slider
                          value={[tempHedgePercent]}
                          onValueChange={(value) => setTempHedgePercent(value[0])}
                          max={100}
                          step={1}
                          disabled={tempAutoAdjust}
                          className="w-full"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {tempAutoAdjust && (
                      <Alert>
                        <Zap className="h-4 w-4" />
                        <AlertDescription>
                          Auto-adjust is enabled. The system will automatically determine the optimal hedge percentage based on market volatility and risk metrics. Your manual setting will be used as a baseline.
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

                  {/* Update Button */}
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
                        Update Hedge Percent
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
