import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface HedgeRecord {
  id: string;
  type: 'hedge' | 'unhedge';
  asset: string;
  amount: number;
  hedgePrice: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  pnl?: number;
}

interface Balance {
  asset: string;
  total: number;
  available: number;
  locked: number;
  usdValue: number;
  change24h: number;
}

interface WithdrawableAsset {
  asset: string;
  available: number;
  safeAmount: number;
  riskLevel: 'low' | 'medium' | 'high';
  usdValue: number;
}

// Mock data
const mockHedgeRecords: HedgeRecord[] = [
  {
    id: 'hedge1',
    type: 'hedge',
    asset: 'BTC',
    amount: 0.5,
    hedgePrice: 42500,
    timestamp: '2024-01-21T10:30:00Z',
    status: 'completed',
    pnl: 150
  },
  {
    id: 'hedge2',
    type: 'unhedge',
    asset: 'ETH',
    amount: 2.0,
    hedgePrice: 2750,
    timestamp: '2024-01-21T09:15:00Z',
    status: 'completed',
    pnl: -75
  },
  {
    id: 'hedge3',
    type: 'hedge',
    asset: 'SOL',
    amount: 100,
    hedgePrice: 85,
    timestamp: '2024-01-21T11:45:00Z',
    status: 'pending'
  }
];

const mockBalances: Balance[] = [
  {
    asset: 'BTC',
    total: 1.25,
    available: 0.75,
    locked: 0.5,
    usdValue: 53750,
    change24h: 2.5
  },
  {
    asset: 'ETH',
    total: 5.8,
    available: 3.8,
    locked: 2.0,
    usdValue: 15640,
    change24h: -1.2
  },
  {
    asset: 'SOL',
    total: 250,
    available: 150,
    locked: 100,
    usdValue: 21250,
    change24h: 4.8
  },
  {
    asset: 'USDT',
    total: 12500,
    available: 8500,
    locked: 4000,
    usdValue: 12500,
    change24h: 0
  }
];

const mockWithdrawable: WithdrawableAsset[] = [
  {
    asset: 'BTC',
    available: 0.75,
    safeAmount: 0.5,
    riskLevel: 'low',
    usdValue: 21500
  },
  {
    asset: 'ETH',
    available: 3.8,
    safeAmount: 2.5,
    riskLevel: 'medium',
    usdValue: 6750
  },
  {
    asset: 'USDT',
    available: 8500,
    safeAmount: 7000,
    riskLevel: 'low',
    usdValue: 7000
  }
];

export default function WalletHedge() {
  const [activeTab, setActiveTab] = useState('hedges');
  const [hedgeRecords, setHedgeRecords] = useState<HedgeRecord[]>(mockHedgeRecords);
  const [balances, setBalances] = useState<Balance[]>(mockBalances);
  const [withdrawable, setWithdrawable] = useState<WithdrawableAsset[]>(mockWithdrawable);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isExecutingHedge, setIsExecutingHedge] = useState(false);

  // Calculate totals
  const totalPortfolioValue = balances.reduce((sum, balance) => sum + balance.usdValue, 0);
  const totalAvailableValue = balances.reduce((sum, balance) => sum + (balance.available / balance.total) * balance.usdValue, 0);
  const totalHedgedValue = hedgeRecords
    .filter(h => h.status === 'completed' && h.type === 'hedge')
    .reduce((sum, h) => sum + (h.amount * h.hedgePrice), 0);

  // Filter and paginate hedge records
  const filteredHedgeRecords = hedgeRecords.filter(hedge =>
    hedge.asset.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredHedgeRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHedgeRecords = filteredHedgeRecords.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatAssetAmount = (amount: number, asset: string) => {
    return `${amount.toFixed(asset === 'USDT' ? 2 : 6)} ${asset}`;
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-accent' : 'text-destructive';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-accent text-accent-foreground">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: 'hedge' | 'unhedge') => {
    return (
      <Badge variant={type === 'hedge' ? "default" : "secondary"} 
             className={type === 'hedge' ? "bg-primary text-primary-foreground" : ""}>
        {type === 'hedge' ? 'Hedge' : 'Unhedge'}
      </Badge>
    );
  };

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    const colors = {
      low: 'bg-accent/10 text-accent border-accent/20',
      medium: 'bg-warning/10 text-warning border-warning/20',
      high: 'bg-destructive/10 text-destructive border-destructive/20'
    };
    return <Badge className={colors[risk]}>{risk.toUpperCase()}</Badge>;
  };

  const executeHedge = async () => {
    setIsExecutingHedge(true);
    try {
      // Mock API call - replace with POST /hedge
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Hedge Executed",
        description: "Portfolio hedge operation completed successfully.",
      });

      // Add new hedge record
      const newHedge: HedgeRecord = {
        id: `hedge_${Date.now()}`,
        type: 'hedge',
        asset: 'PORTFOLIO',
        amount: 1,
        hedgePrice: totalPortfolioValue,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
      
      setHedgeRecords(prev => [newHedge, ...prev]);
    } catch (error) {
      toast({
        title: "Hedge Failed",
        description: "Failed to execute hedge operation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExecutingHedge(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet & Hedge Overview</h1>
          <p className="text-muted-foreground">
            Manage your portfolio balances and hedging strategies
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Wallet className="h-3 w-3 mr-1" />
            Portfolio Value: {formatCurrency(totalPortfolioValue)}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</div>
            <p className="text-xs text-muted-foreground">
              Across all assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Value</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(totalAvailableValue)}</div>
            <p className="text-xs text-muted-foreground">
              Ready for trading
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedged Value</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalHedgedValue)}</div>
            <p className="text-xs text-muted-foreground">
              Protected positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedge Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((totalHedgedValue / totalPortfolioValue) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Portfolio coverage
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hedges">Hedge Records</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="withdrawable">Withdrawable</TabsTrigger>
        </TabsList>

        <TabsContent value="hedges" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hedge Records</CardTitle>
                  <CardDescription>History of hedge and unhedge operations</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={executeHedge} disabled={isExecutingHedge}>
                    {isExecutingHedge ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Execute Hedge
                      </>
                    )}
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by asset..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedHedgeRecords.map((hedge) => (
                  <div key={hedge.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="font-medium">{hedge.asset}</div>
                      {getTypeBadge(hedge.type)}
                      <div className="text-sm text-muted-foreground">
                        {formatAssetAmount(hedge.amount, hedge.asset)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @ {formatCurrency(hedge.hedgePrice)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {hedge.pnl !== undefined && (
                        <div className={`font-medium ${getChangeColor(hedge.pnl)}`}>
                          {formatCurrency(hedge.pnl)}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {new Date(hedge.timestamp).toLocaleDateString()}
                      </div>
                      {getStatusBadge(hedge.status)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredHedgeRecords.length)} of {filteredHedgeRecords.length} records
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Balances</CardTitle>
              <CardDescription>Your current holdings across all assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {balances.map((balance) => (
                  <div key={balance.asset} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium text-lg">{balance.asset}</div>
                        <div className={`text-sm ${getChangeColor(balance.change24h)}`}>
                          {formatPercentage(balance.change24h)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(balance.usdValue)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatAssetAmount(balance.total, balance.asset)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Available:</span>
                        <div className="font-medium text-accent">
                          {formatAssetAmount(balance.available, balance.asset)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Locked:</span>
                        <div className="font-medium text-warning">
                          {formatAssetAmount(balance.locked, balance.asset)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <div className="font-medium">
                          {formatAssetAmount(balance.total, balance.asset)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawable" className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Safe withdrawal amounts are calculated based on current trading activity and risk management parameters.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Withdrawable Assets</CardTitle>
              <CardDescription>Safe amounts available for withdrawal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {withdrawable.map((asset) => (
                  <div key={asset.asset} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium text-lg">{asset.asset}</div>
                        {getRiskBadge(asset.riskLevel)}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(asset.usdValue)}</div>
                        <div className="text-sm text-muted-foreground">Safe amount</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Available:</span>
                        <div className="font-medium">
                          {formatAssetAmount(asset.available, asset.asset)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Safe to withdraw:</span>
                        <div className="font-medium text-accent">
                          {formatAssetAmount(asset.safeAmount, asset.asset)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-accent h-2 rounded-full" 
                          style={{ width: `${(asset.safeAmount / asset.available) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {((asset.safeAmount / asset.available) * 100).toFixed(0)}% of available balance
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
