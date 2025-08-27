import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Coins, 
  TrendingUp, 
  Clock,
  DollarSign,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  Calendar,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface StakingPool {
  id: string;
  name: string;
  token: string;
  apy: number;
  totalStaked: number;
  userStaked: number;
  userRewards: number;
  lockPeriod: number; // in days
  minStake: number;
  maxStake?: number;
  status: 'active' | 'paused' | 'ended';
}

interface StakingTransaction {
  id: string;
  type: 'stake' | 'unstake' | 'claim';
  amount: number;
  token: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
}

// Mock data
const mockStakingPools: StakingPool[] = [
  {
    id: 'pool1',
    name: 'AETHER Token Pool',
    token: 'AETHER',
    apy: 15.5,
    totalStaked: 1250000,
    userStaked: 5000,
    userRewards: 125.5,
    lockPeriod: 30,
    minStake: 100,
    maxStake: 50000,
    status: 'active'
  },
  {
    id: 'pool2',
    name: 'BTC Staking Pool',
    token: 'BTC',
    apy: 8.2,
    totalStaked: 450.5,
    userStaked: 0.25,
    userRewards: 0.0045,
    lockPeriod: 90,
    minStake: 0.01,
    maxStake: 10,
    status: 'active'
  },
  {
    id: 'pool3',
    name: 'ETH Liquid Staking',
    token: 'ETH',
    apy: 6.8,
    totalStaked: 15750,
    userStaked: 2.5,
    userRewards: 0.085,
    lockPeriod: 0, // No lock period
    minStake: 0.1,
    status: 'active'
  }
];

const mockTransactions: StakingTransaction[] = [
  {
    id: 'tx1',
    type: 'stake',
    amount: 2500,
    token: 'AETHER',
    timestamp: '2024-01-21T10:30:00Z',
    status: 'completed',
    txHash: '0x1234...5678'
  },
  {
    id: 'tx2',
    type: 'claim',
    amount: 25.5,
    token: 'AETHER',
    timestamp: '2024-01-20T14:15:00Z',
    status: 'completed',
    txHash: '0x2345...6789'
  },
  {
    id: 'tx3',
    type: 'stake',
    amount: 0.25,
    token: 'BTC',
    timestamp: '2024-01-19T09:45:00Z',
    status: 'completed',
    txHash: '0x3456...7890'
  }
];

export default function Staking() {
  const [stakingPools, setStakingPools] = useState<StakingPool[]>(mockStakingPools);
  const [transactions, setTransactions] = useState<StakingTransaction[]>(mockTransactions);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Calculate totals
  const totalStakedValue = stakingPools.reduce((sum, pool) => 
    sum + (pool.userStaked * (pool.token === 'BTC' ? 43000 : pool.token === 'ETH' ? 2700 : 1)), 0
  );
  
  const totalRewardsValue = stakingPools.reduce((sum, pool) => 
    sum + (pool.userRewards * (pool.token === 'BTC' ? 43000 : pool.token === 'ETH' ? 2700 : 1)), 0
  );

  const avgAPY = stakingPools.reduce((sum, pool) => sum + pool.apy, 0) / stakingPools.length;

  useEffect(() => {
    if (stakingPools.length > 0 && !selectedPool) {
      setSelectedPool(stakingPools[0]);
    }
  }, [stakingPools, selectedPool]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTokenAmount = (amount: number, token: string) => {
    const decimals = token === 'BTC' || token === 'ETH' ? 6 : 2;
    return `${amount.toFixed(decimals)} ${token}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-accent text-accent-foreground">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'ended':
        return <Badge variant="destructive">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stake':
        return <ArrowUpRight className="h-4 w-4 text-accent" />;
      case 'unstake':
        return <ArrowDownLeft className="h-4 w-4 text-warning" />;
      case 'claim':
        return <Trophy className="h-4 w-4 text-primary" />;
      default:
        return <Coins className="h-4 w-4" />;
    }
  };

  const handleStake = async () => {
    if (!selectedPool || !stakeAmount || parseFloat(stakeAmount) < selectedPool.minStake) {
      toast({
        title: "Invalid Amount",
        description: `Minimum stake amount is ${selectedPool?.minStake} ${selectedPool?.token}`,
        variant: "destructive"
      });
      return;
    }

    setIsStaking(true);
    try {
      // Mock API call - replace with POST /staking/stake
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newTransaction: StakingTransaction = {
        id: `tx_${Date.now()}`,
        type: 'stake',
        amount: parseFloat(stakeAmount),
        token: selectedPool.token,
        timestamp: new Date().toISOString(),
        status: 'completed',
        txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`
      };

      setTransactions(prev => [newTransaction, ...prev]);
      
      // Update pool balance
      setStakingPools(prev => prev.map(pool => 
        pool.id === selectedPool.id 
          ? { ...pool, userStaked: pool.userStaked + parseFloat(stakeAmount) }
          : pool
      ));

      setStakeAmount('');
      
      toast({
        title: "Staking Successful",
        description: `Successfully staked ${stakeAmount} ${selectedPool.token}`,
      });
    } catch (error) {
      toast({
        title: "Staking Failed",
        description: "Failed to stake tokens. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStaking(false);
    }
  };

  const handleRedeem = async () => {
    if (!selectedPool || !redeemAmount || parseFloat(redeemAmount) > selectedPool.userStaked) {
      toast({
        title: "Invalid Amount",
        description: "Amount exceeds your staked balance",
        variant: "destructive"
      });
      return;
    }

    setIsRedeeming(true);
    try {
      // Mock API call - replace with POST /staking/redeem
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newTransaction: StakingTransaction = {
        id: `tx_${Date.now()}`,
        type: 'unstake',
        amount: parseFloat(redeemAmount),
        token: selectedPool.token,
        timestamp: new Date().toISOString(),
        status: 'completed',
        txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`
      };

      setTransactions(prev => [newTransaction, ...prev]);
      
      // Update pool balance
      setStakingPools(prev => prev.map(pool => 
        pool.id === selectedPool.id 
          ? { ...pool, userStaked: pool.userStaked - parseFloat(redeemAmount) }
          : pool
      ));

      setRedeemAmount('');
      
      toast({
        title: "Redemption Successful",
        description: `Successfully redeemed ${redeemAmount} ${selectedPool.token}`,
      });
    } catch (error) {
      toast({
        title: "Redemption Failed",
        description: "Failed to redeem tokens. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClaimRewards = async (poolId: string) => {
    setIsClaiming(true);
    try {
      const pool = stakingPools.find(p => p.id === poolId);
      if (!pool || pool.userRewards === 0) return;

      // Mock API call - replace with POST /staking/claim
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newTransaction: StakingTransaction = {
        id: `tx_${Date.now()}`,
        type: 'claim',
        amount: pool.userRewards,
        token: pool.token,
        timestamp: new Date().toISOString(),
        status: 'completed',
        txHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`
      };

      setTransactions(prev => [newTransaction, ...prev]);
      
      // Reset rewards
      setStakingPools(prev => prev.map(p => 
        p.id === poolId ? { ...p, userRewards: 0 } : p
      ));
      
      toast({
        title: "Rewards Claimed",
        description: `Successfully claimed ${pool.userRewards.toFixed(6)} ${pool.token}`,
      });
    } catch (error) {
      toast({
        title: "Claim Failed",
        description: "Failed to claim rewards. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staking</h1>
          <p className="text-muted-foreground">
            Earn rewards by staking your tokens in various pools
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
            <Coins className="h-3 w-3 mr-1" />
            Total Staked: {formatCurrency(totalStakedValue)}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staked Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStakedValue)}</div>
            <p className="text-xs text-muted-foreground">
              Across all pools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(totalRewardsValue)}</div>
            <p className="text-xs text-muted-foreground">
              Ready to claim
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatPercentage(avgAPY)}</div>
            <p className="text-xs text-muted-foreground">
              Weighted average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pools</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stakingPools.filter(p => p.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              Available for staking
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Staking Pools */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Staking Pools</h2>
          {stakingPools.map((pool) => (
            <Card 
              key={pool.id} 
              className={`cursor-pointer transition-colors ${
                selectedPool?.id === pool.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedPool(pool)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{pool.name}</span>
                      {getStatusBadge(pool.status)}
                    </CardTitle>
                    <CardDescription>
                      {pool.token} • {formatPercentage(pool.apy)} APY
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">
                      {formatTokenAmount(pool.userRewards, pool.token)}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending rewards</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Your Stake:</span>
                    <div className="font-medium">
                      {formatTokenAmount(pool.userStaked, pool.token)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Staked:</span>
                    <div className="font-medium">
                      {formatTokenAmount(pool.totalStaked, pool.token)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lock Period:</span>
                    <div className="font-medium">
                      {pool.lockPeriod === 0 ? 'No lock' : `${pool.lockPeriod} days`}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Min Stake:</span>
                    <div className="font-medium">
                      {formatTokenAmount(pool.minStake, pool.token)}
                    </div>
                  </div>
                </div>
                
                {pool.userRewards > 0 && (
                  <Button
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaimRewards(pool.id);
                    }}
                    disabled={isClaiming}
                  >
                    {isClaiming ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Trophy className="h-4 w-4 mr-2" />
                        Claim Rewards
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stake/Redeem Panel */}
        <div className="space-y-6">
          {selectedPool && (
            <Card>
              <CardHeader>
                <CardTitle>Stake & Redeem</CardTitle>
                <CardDescription>
                  Manage your stake in {selectedPool.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stake Section */}
                <div className="space-y-3">
                  <Label htmlFor="stakeAmount">Stake Amount</Label>
                  <Input
                    id="stakeAmount"
                    type="number"
                    placeholder={`Min: ${selectedPool.minStake} ${selectedPool.token}`}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    min={selectedPool.minStake}
                    max={selectedPool.maxStake}
                    step={selectedPool.token === 'BTC' || selectedPool.token === 'ETH' ? '0.001' : '1'}
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleStake}
                    disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < selectedPool.minStake}
                  >
                    {isStaking ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Staking...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Stake {selectedPool.token}
                      </>
                    )}
                  </Button>
                </div>

                {/* Redeem Section */}
                {selectedPool.userStaked > 0 && (
                  <div className="space-y-3">
                    <Label htmlFor="redeemAmount">Redeem Amount</Label>
                    <Input
                      id="redeemAmount"
                      type="number"
                      placeholder={`Max: ${selectedPool.userStaked} ${selectedPool.token}`}
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      max={selectedPool.userStaked}
                      step={selectedPool.token === 'BTC' || selectedPool.token === 'ETH' ? '0.001' : '1'}
                    />
                    <Button 
                      variant="outline"
                      className="w-full" 
                      onClick={handleRedeem}
                      disabled={isRedeeming || !redeemAmount || parseFloat(redeemAmount) > selectedPool.userStaked}
                    >
                      {isRedeeming ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Redeeming...
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft className="h-4 w-4 mr-2" />
                          Redeem {selectedPool.token}
                        </>
                      )}
                    </Button>
                    
                    {selectedPool.lockPeriod > 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          This pool has a {selectedPool.lockPeriod}-day lock period. Early withdrawal may incur penalties.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest staking activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(tx.type)}
                      <div>
                        <div className="font-medium capitalize">{tx.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTokenAmount(tx.amount, tx.token)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                        {tx.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {transactions.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>No transactions yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
