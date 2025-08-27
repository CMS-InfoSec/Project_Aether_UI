import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain,
  Play,
  Square,
  Deploy,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Target,
  Shield,
  ArrowUp,
  ArrowDown,
  Eye,
  Settings,
  Cpu,
  Database,
  Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface TrainingJob {
  jobId: string;
  modelType: string;
  coins: string[];
  lookbackDays: number;
  interval: string;
  algorithm: string;
  callbackUrl?: string;
  architectureJson: any;
  tuneFlag: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: string;
  endTime?: string;
  logs: string[];
  modelId?: string;
}

interface Model {
  modelId: string;
  name: string;
  version: string;
  type: string;
  status: 'training' | 'trained' | 'deployed' | 'shadow' | 'archived';
  accuracy: number;
  performance: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  deployedAt?: string;
  shadowStart?: string;
  shadowEnd?: string;
  createdAt: string;
  createdBy: string;
}

interface ShadowTest {
  id: string;
  modelId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'stopped';
  results?: {
    performance: number;
    trades: number;
    pnl: number;
  };
}

export default function AdminModels() {
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [shadowTests, setShadowTests] = useState<ShadowTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  
  // Training form state
  const [trainingForm, setTrainingForm] = useState({
    modelType: 'LSTM',
    coins: [] as string[],
    lookbackDays: 30,
    interval: '1h',
    algorithm: 'adam',
    callbackUrl: '',
    architectureJson: '{"layers": [64, 32, 16], "dropout": 0.2}',
    tuneFlag: false
  });

  // Model management state
  const [selectedModelId, setSelectedModelId] = useState('');
  const [founderApproval, setFounderApproval] = useState(false);
  const [rollbackToModelId, setRollbackToModelId] = useState('');

  // Available options
  const modelTypes = ['LSTM', 'Transformer', 'CNN', 'GRU', 'Prophet'];
  const availableCoins = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'SOL', 'MATIC'];
  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const algorithms = ['adam', 'gradient_descent', 'rmsprop', 'adagrad'];

  // Fetch all data
  const fetchData = async () => {
    try {
      const [jobsRes, modelsRes, shadowRes] = await Promise.all([
        fetch('/api/models/jobs'),
        fetch('/api/models'),
        fetch('/api/models/shadow')
      ]);

      const [jobsData, modelsData, shadowData] = await Promise.all([
        jobsRes.json(),
        modelsRes.json(),
        shadowRes.json()
      ]);

      if (jobsData.status === 'success') {
        setTrainingJobs(jobsData.data);
      }
      
      if (modelsData.status === 'success') {
        setModels(modelsData.data);
      }
      
      if (shadowData.status === 'success') {
        setShadowTests(shadowData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch model data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle training form submission
  const handleStartTraining = async () => {
    // Validation
    if (trainingForm.coins.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one coin",
        variant: "destructive"
      });
      return;
    }

    if (trainingForm.lookbackDays < 1 || trainingForm.lookbackDays > 365) {
      toast({
        title: "Validation Error",
        description: "Lookback days must be between 1 and 365",
        variant: "destructive"
      });
      return;
    }

    let architectureJson;
    try {
      architectureJson = JSON.parse(trainingForm.architectureJson);
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Architecture JSON is invalid",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/models/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...trainingForm,
          architectureJson,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        toast({
          title: "Training Started",
          description: `Training job ${data.data.jobId} started successfully`,
        });
        setIsTrainingDialogOpen(false);
        setTrainingForm({
          modelType: 'LSTM',
          coins: [],
          lookbackDays: 30,
          interval: '1h',
          algorithm: 'adam',
          callbackUrl: '',
          architectureJson: '{"layers": [64, 32, 16], "dropout": 0.2}',
          tuneFlag: false
        });
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start training",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle job cancellation
  const handleCancelJob = async (jobId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/models/train/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actor: 'admin@example.com' }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        toast({
          title: "Job Cancelled",
          description: `Training job ${jobId} cancelled successfully`,
        });
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel job",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle model deployment
  const handleDeployModel = async (modelId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/models/deploy/${modelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actor: 'admin@example.com' }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        toast({
          title: "Model Deployed",
          description: `Model ${modelId} deployed successfully`,
        });
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deploy model",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle model promotion
  const handlePromoteModel = async () => {
    if (!founderApproval) {
      toast({
        title: "Approval Required",
        description: "Founder approval is required for model promotion",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/models/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: selectedModelId,
          founderApproval: true,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        toast({
          title: "Model Promoted",
          description: "Model promoted to production successfully",
        });
        setSelectedModelId('');
        setFounderApproval(false);
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to promote model",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle shadow testing
  const handleStartShadow = async (modelId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/models/shadow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        toast({
          title: "Shadow Testing Started",
          description: `Shadow testing started for model ${modelId}`,
        });
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start shadow testing",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopShadow = async (modelId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/models/shadow/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        toast({
          title: "Shadow Testing Stopped",
          description: `Shadow testing stopped for model ${modelId}`,
        });
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to stop shadow testing",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle model rollback
  const handleRollback = async () => {
    if (!founderApproval) {
      toast({
        title: "Approval Required",
        description: "Founder approval is required for model rollback",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/models/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromModelId: selectedModelId,
          toModelId: rollbackToModelId,
          founderApproval: true,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        toast({
          title: "Rollback Complete",
          description: "Model rollback completed successfully",
        });
        setSelectedModelId('');
        setRollbackToModelId('');
        setFounderApproval(false);
        await fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rollback model",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Utility functions
  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': { variant: 'outline' as const, icon: Clock, color: 'text-yellow-600' },
      'running': { variant: 'default' as const, icon: Activity, color: 'text-blue-600' },
      'completed': { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      'failed': { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      'cancelled': { variant: 'secondary' as const, icon: XCircle, color: 'text-gray-600' },
      'training': { variant: 'outline' as const, icon: Brain, color: 'text-blue-600' },
      'trained': { variant: 'secondary' as const, icon: CheckCircle, color: 'text-green-600' },
      'deployed': { variant: 'default' as const, icon: Deploy, color: 'text-accent' },
      'shadow': { variant: 'outline' as const, icon: Eye, color: 'text-purple-600' },
      'archived': { variant: 'secondary' as const, icon: Database, color: 'text-gray-600' }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span className="capitalize">{status}</span>
      </Badge>
    );
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
          <h1 className="text-3xl font-bold tracking-tight">Model Management</h1>
          <p className="text-muted-foreground">
            Train, deploy, and manage ML models for trading strategies
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Brain className="h-4 w-4 mr-2" />
                Start Training
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Start Training Job</DialogTitle>
                <DialogDescription>
                  Configure and start a new model training job
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="modelType">Model Type</Label>
                    <Select value={trainingForm.modelType} onValueChange={(value) => 
                      setTrainingForm(prev => ({ ...prev, modelType: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="algorithm">Algorithm</Label>
                    <Select value={trainingForm.algorithm} onValueChange={(value) => 
                      setTrainingForm(prev => ({ ...prev, algorithm: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {algorithms.map(algo => (
                          <SelectItem key={algo} value={algo}>{algo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Coins (Select multiple)</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {availableCoins.map(coin => (
                      <div key={coin} className="flex items-center space-x-2">
                        <Checkbox
                          id={coin}
                          checked={trainingForm.coins.includes(coin)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTrainingForm(prev => ({ ...prev, coins: [...prev.coins, coin] }));
                            } else {
                              setTrainingForm(prev => ({ ...prev, coins: prev.coins.filter(c => c !== coin) }));
                            }
                          }}
                        />
                        <Label htmlFor={coin} className="text-sm">{coin}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lookbackDays">Lookback Days</Label>
                    <Input
                      id="lookbackDays"
                      type="number"
                      min="1"
                      max="365"
                      value={trainingForm.lookbackDays}
                      onChange={(e) => setTrainingForm(prev => ({ ...prev, lookbackDays: parseInt(e.target.value) || 30 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="interval">Interval</Label>
                    <Select value={trainingForm.interval} onValueChange={(value) => 
                      setTrainingForm(prev => ({ ...prev, interval: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {intervals.map(interval => (
                          <SelectItem key={interval} value={interval}>{interval}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="callbackUrl">Callback URL (Optional)</Label>
                  <Input
                    id="callbackUrl"
                    placeholder="https://webhook.example.com/training"
                    value={trainingForm.callbackUrl}
                    onChange={(e) => setTrainingForm(prev => ({ ...prev, callbackUrl: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="architectureJson">Architecture JSON</Label>
                  <Textarea
                    id="architectureJson"
                    placeholder='{"layers": [64, 32, 16], "dropout": 0.2}'
                    value={trainingForm.architectureJson}
                    onChange={(e) => setTrainingForm(prev => ({ ...prev, architectureJson: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tuneFlag"
                    checked={trainingForm.tuneFlag}
                    onCheckedChange={(checked) => setTrainingForm(prev => ({ ...prev, tuneFlag: !!checked }))}
                  />
                  <Label htmlFor="tuneFlag">Enable hyperparameter tuning</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTrainingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStartTraining} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Training
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jobs">Training Jobs</TabsTrigger>
          <TabsTrigger value="registry">Model Registry</TabsTrigger>
        </TabsList>

        {/* Training Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="grid gap-4">
            {trainingJobs.length > 0 ? (
              trainingJobs.map((job) => (
                <Card key={job.jobId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Cpu className="h-5 w-5" />
                          <span>{job.modelType} - {job.coins.join(', ')}</span>
                          {getStatusBadge(job.status)}
                        </CardTitle>
                        <CardDescription>
                          Job ID: {job.jobId} • Started: {new Date(job.startTime).toLocaleString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(job.status === 'pending' || job.status === 'running') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Square className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Training Job</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel this training job? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelJob(job.jobId)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirm Cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {job.status === 'completed' && job.modelId && (
                          <Button size="sm" onClick={() => handleDeployModel(job.modelId!)}>
                            <Deploy className="h-4 w-4 mr-1" />
                            Deploy
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(job.status === 'running' || job.status === 'pending') && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="w-full" />
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Algorithm:</span>
                          <div className="font-medium">{job.algorithm}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lookback:</span>
                          <div className="font-medium">{job.lookbackDays} days</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Interval:</span>
                          <div className="font-medium">{job.interval}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tuning:</span>
                          <div className="font-medium">{job.tuneFlag ? 'Enabled' : 'Disabled'}</div>
                        </div>
                      </div>

                      {job.logs.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Recent Logs:</div>
                          <div className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                            {job.logs.slice(-3).map((log, index) => (
                              <div key={index}>{log}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <div className="text-lg font-medium">No Training Jobs</div>
                    <div className="text-muted-foreground">Start a new training job to begin</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Model Registry Tab */}
        <TabsContent value="registry" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Model List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold">Model Registry</h2>
              {models.length > 0 ? (
                models.map((model) => (
                  <Card key={model.modelId}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <Brain className="h-5 w-5" />
                            <span>{model.name}</span>
                            {getStatusBadge(model.status)}
                          </CardTitle>
                          <CardDescription>
                            {model.type} • v{model.version} • Accuracy: {(model.accuracy * 100).toFixed(1)}%
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          {model.status === 'trained' && (
                            <>
                              <Button size="sm" onClick={() => handleStartShadow(model.modelId)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Shadow Test
                              </Button>
                              <Button size="sm" onClick={() => handleDeployModel(model.modelId)}>
                                <Deploy className="h-4 w-4 mr-1" />
                                Deploy
                              </Button>
                            </>
                          )}
                          {model.status === 'shadow' && (
                            <Button size="sm" variant="destructive" onClick={() => handleStopShadow(model.modelId)}>
                              <Square className="h-4 w-4 mr-1" />
                              Stop Shadow
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sharpe Ratio:</span>
                          <div className="font-medium">{model.performance.sharpeRatio.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max Drawdown:</span>
                          <div className="font-medium">{(model.performance.maxDrawdown * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Win Rate:</span>
                          <div className="font-medium">{(model.performance.winRate * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      {model.status === 'deployed' && model.deployedAt && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          Deployed: {new Date(model.deployedAt).toLocaleString()}
                        </div>
                      )}
                      
                      {model.status === 'shadow' && model.shadowStart && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          Shadow testing since: {new Date(model.shadowStart).toLocaleString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <div className="text-lg font-medium">No Models</div>
                      <div className="text-muted-foreground">Train models to see them here</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Model Management Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Model Management</span>
                  </CardTitle>
                  <CardDescription>
                    Promote, rollback, and manage models
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Promote Model */}
                  <div className="space-y-3">
                    <Label>Promote Model to Production</Label>
                    <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model to promote" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.filter(m => m.status === 'trained' || m.status === 'shadow').map(model => (
                          <SelectItem key={model.modelId} value={model.modelId}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="founderApproval"
                        checked={founderApproval}
                        onCheckedChange={(checked) => setFounderApproval(!!checked)}
                      />
                      <Label htmlFor="founderApproval" className="text-sm">
                        Founder approval obtained
                      </Label>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handlePromoteModel}
                      disabled={!selectedModelId || !founderApproval || isProcessing}
                    >
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Promote Model
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-3">
                      <Label>Rollback Model</Label>
                      <Select value={rollbackToModelId} onValueChange={setRollbackToModelId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model to rollback to" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.filter(m => m.status === 'archived').map(model => (
                            <SelectItem key={model.modelId} value={model.modelId}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        variant="destructive"
                        className="w-full" 
                        onClick={handleRollback}
                        disabled={!selectedModelId || !rollbackToModelId || !founderApproval || isProcessing}
                      >
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Rollback Model
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shadow Test Results */}
              {shadowTests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Shadow Test Results</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {shadowTests.slice(0, 3).map((test) => (
                        <div key={test.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm">
                              Model: {models.find(m => m.modelId === test.modelId)?.name}
                            </div>
                            {getStatusBadge(test.status)}
                          </div>
                          {test.results && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Performance:</span>
                                <div className="font-medium">{test.results.performance.toFixed(1)}%</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">P&L:</span>
                                <div className="font-medium">${test.results.pnl.toFixed(2)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
