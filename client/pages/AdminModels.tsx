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
  Rocket,
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
  Activity,
  BarChart3,
  GitBranch,
  Layers,
  Network,
  BookOpen,
  Award,
  ChevronRight,
  ExternalLink,
  Download,
  Upload
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Enhanced Types for AI Training Workflow
interface TrainingJob {
  jobId: string;
  modelType: 'forecast' | 'rl_agent' | 'sentiment' | 'ensemble';
  coins: string[];
  lookbackDays: number;
  algorithm: string;
  architecture: any;
  tuningMode: boolean;
  callbackUrl?: string;
  status: 'pending' | 'data_prep' | 'training' | 'backtesting' | 'validation' | 'completed' | 'failed' | 'cancelled';
  currentStage: string;
  progress: number;
  startTime: string;
  endTime?: string;
  logs: Array<{
    timestamp: string;
    stage: string;
    message: string;
    level: 'info' | 'warning' | 'error';
  }>;
  metrics?: {
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
    totalReward?: number;
    volatility?: number;
  };
  experiment: {
    mlflowRunId?: string;
    dvcHash?: string;
    datasetVersion?: string;
  };
  curriculum?: {
    level: 'simple' | 'volatile' | 'multi_asset';
    stage: number;
    criteria: {
      winRatio: number;
      targetWinRatio: number;
      passed: boolean;
    };
  };
}

interface Model {
  modelId: string;
  name: string;
  version: string;
  type: 'forecast' | 'rl_agent' | 'sentiment' | 'ensemble';
  status: 'training' | 'trained' | 'deployed' | 'shadow' | 'archived';
  accuracy: number;
  performance: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    sortino: number;
    calmar: number;
  };
  algorithmInfo: {
    name: string;
    architecture: any;
    hyperparameters: any;
  };
  deployedAt?: string;
  shadowStart?: string;
  shadowEnd?: string;
  createdAt: string;
  createdBy: string;
  experiment: {
    mlflowRunId: string;
    dvcHash: string;
    datasetVersion: string;
    checksum: string;
  };
  riskProfile?: {
    leverage: number;
    positionLimits: any;
    stopLoss: number;
    takeProfit: number;
  };
}

interface CurriculumStage {
  name: string;
  level: 'simple' | 'volatile' | 'multi_asset';
  description: string;
  criteria: {
    winRatio: number;
    minTrades: number;
    maxDrawdown: number;
  };
  status: 'locked' | 'active' | 'completed';
  progress?: number;
}

interface DatasetInfo {
  version: string;
  dvcHash: string;
  size: string;
  features: string[];
  timeRange: {
    start: string;
    end: string;
  };
  description: string;
  status: 'available' | 'processing' | 'error';
}

export default function AdminModels() {
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [curriculumStages, setCurriculumStages] = useState<CurriculumStage[]>([]);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('training');
  
  // Enhanced training form state
  const [trainingForm, setTrainingForm] = useState({
    modelType: 'forecast' as 'forecast' | 'rl_agent' | 'sentiment' | 'ensemble',
    coins: [] as string[],
    lookbackDays: 30,
    algorithm: 'LSTM',
    architecture: '{"layers": [128, 64, 32], "dropout": 0.3, "attention": true}',
    tuningMode: false,
    callbackUrl: '',
    curriculumLevel: 'simple' as 'simple' | 'volatile' | 'multi_asset',
    rlAlgorithm: 'PPO',
    environmentConfig: '{"reward_weights": {"profit": 0.7, "drawdown": 0.2, "duration": 0.1}}',
    riskProfile: 'conservative' as 'conservative' | 'moderate' | 'aggressive',
    datasetVersion: 'latest'
  });

  // Model management state
  const [selectedModelId, setSelectedModelId] = useState('');
  const [founderApproval, setFounderApproval] = useState(false);
  const [rollbackToModelId, setRollbackToModelId] = useState('');

  // Enhanced options
  const forecastAlgorithms = ['LSTM', 'Transformer', 'CNN-LSTM', 'GRU', 'Prophet', 'XGBoost'];
  const rlAlgorithms = ['PPO', 'Recurrent PPO', 'SAC', 'TD3', 'A2C', 'DDPG'];
  const sentimentModels = ['FinBERT', 'RoBERTa-Financial', 'BERT-Base', 'Custom-Financial'];
  const availableCoins = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'SOL', 'MATIC', 'AVAX', 'ATOM'];
  const curriculumLevels = ['simple', 'volatile', 'multi_asset'];
  const riskProfiles = ['conservative', 'moderate', 'aggressive'];

  // Mock data initialization
  useEffect(() => {
    const initializeMockData = () => {
      // Mock Training Jobs
      const mockJobs: TrainingJob[] = [
        {
          jobId: 'job_001',
          modelType: 'rl_agent',
          coins: ['BTC', 'ETH'],
          lookbackDays: 30,
          algorithm: 'PPO',
          architecture: { layers: [256, 128, 64], learning_rate: 0.0003 },
          tuningMode: true,
          status: 'training',
          currentStage: 'RL Policy Search',
          progress: 65,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          logs: [
            { timestamp: new Date().toISOString(), stage: 'Data Prep', message: 'Market data preprocessing completed', level: 'info' },
            { timestamp: new Date().toISOString(), stage: 'Forecasting', message: 'Price movement prediction model trained', level: 'info' },
            { timestamp: new Date().toISOString(), stage: 'RL Training', message: 'PPO agent learning from environment', level: 'info' }
          ],
          metrics: {
            sharpeRatio: 1.85,
            maxDrawdown: -0.12,
            winRate: 0.68,
            totalReward: 1250.5
          },
          experiment: {
            mlflowRunId: 'run_abc123',
            dvcHash: 'a1b2c3d4',
            datasetVersion: 'v2.1.0'
          },
          curriculum: {
            level: 'volatile',
            stage: 2,
            criteria: {
              winRatio: 0.68,
              targetWinRatio: 0.65,
              passed: true
            }
          }
        },
        {
          jobId: 'job_002',
          modelType: 'forecast',
          coins: ['SOL', 'MATIC'],
          lookbackDays: 14,
          algorithm: 'Transformer',
          architecture: { attention_heads: 8, layers: 6 },
          tuningMode: false,
          status: 'completed',
          currentStage: 'Validation Complete',
          progress: 100,
          startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          logs: [
            { timestamp: new Date().toISOString(), stage: 'Data Prep', message: 'Feature engineering completed', level: 'info' },
            { timestamp: new Date().toISOString(), stage: 'Training', message: 'Transformer model converged', level: 'info' },
            { timestamp: new Date().toISOString(), stage: 'Backtesting', message: 'Simulation completed successfully', level: 'info' }
          ],
          metrics: {
            sharpeRatio: 2.1,
            maxDrawdown: -0.08,
            winRate: 0.72
          },
          experiment: {
            mlflowRunId: 'run_def456',
            dvcHash: 'e5f6g7h8',
            datasetVersion: 'v2.1.0'
          }
        }
      ];

      // Mock Models
      const mockModels: Model[] = [
        {
          modelId: 'model_001',
          name: 'BTC-ETH RL Agent v2.1',
          version: '2.1.0',
          type: 'rl_agent',
          status: 'deployed',
          accuracy: 0.74,
          performance: {
            sharpeRatio: 2.3,
            maxDrawdown: -0.09,
            winRate: 0.71,
            profitFactor: 1.85,
            sortino: 3.1,
            calmar: 2.8
          },
          algorithmInfo: {
            name: 'PPO',
            architecture: { layers: [256, 128, 64], learning_rate: 0.0003 },
            hyperparameters: { batch_size: 256, gamma: 0.99, lambda: 0.95 }
          },
          deployedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          createdBy: 'admin@example.com',
          experiment: {
            mlflowRunId: 'run_xyz789',
            dvcHash: 'i9j0k1l2',
            datasetVersion: 'v2.0.0',
            checksum: 'sha256:abc123...'
          },
          riskProfile: {
            leverage: 2.0,
            positionLimits: { max_position: 0.3, max_exposure: 0.8 },
            stopLoss: 0.05,
            takeProfit: 0.15
          }
        }
      ];

      // Mock Curriculum Stages
      const mockCurriculum: CurriculumStage[] = [
        {
          name: 'Basic Market Patterns',
          level: 'simple',
          description: 'Learn fundamental buy/sell patterns in stable market conditions',
          criteria: { winRatio: 0.6, minTrades: 100, maxDrawdown: 0.1 },
          status: 'completed',
          progress: 100
        },
        {
          name: 'Volatile Market Handling',
          level: 'volatile',
          description: 'Navigate high volatility periods and market stress',
          criteria: { winRatio: 0.65, minTrades: 150, maxDrawdown: 0.15 },
          status: 'active',
          progress: 75
        },
        {
          name: 'Multi-Asset Correlation',
          level: 'multi_asset',
          description: 'Trade across multiple assets considering correlations',
          criteria: { winRatio: 0.7, minTrades: 200, maxDrawdown: 0.12 },
          status: 'locked'
        }
      ];

      // Mock Datasets
      const mockDatasets: DatasetInfo[] = [
        {
          version: 'v2.1.0',
          dvcHash: 'a1b2c3d4e5f6',
          size: '2.3 GB',
          features: ['price', 'volume', 'sentiment', 'orderbook', 'social_signals'],
          timeRange: {
            start: '2023-01-01',
            end: '2024-01-01'
          },
          description: 'Enhanced dataset with sentiment and social signals',
          status: 'available'
        },
        {
          version: 'v2.0.0',
          dvcHash: 'g7h8i9j0k1l2',
          size: '1.8 GB',
          features: ['price', 'volume', 'orderbook'],
          timeRange: {
            start: '2022-06-01',
            end: '2023-12-31'
          },
          description: 'Baseline dataset with core market features',
          status: 'available'
        }
      ];

      setTrainingJobs(mockJobs);
      setModels(mockModels);
      setCurriculumStages(mockCurriculum);
      setDatasets(mockDatasets);
      setIsLoading(false);
    };

    setTimeout(initializeMockData, 500);
  }, []);

  // Start training job
  const startTraining = async () => {
    if (trainingForm.coins.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one coin to train on",
        variant: "destructive"
      });
      return;
    }

    try {
      const architecture = JSON.parse(trainingForm.architecture);
    } catch {
      toast({
        title: "Invalid Architecture",
        description: "Please provide valid JSON for architecture configuration",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newJob: TrainingJob = {
        jobId: `job_${Date.now()}`,
        modelType: trainingForm.modelType,
        coins: trainingForm.coins,
        lookbackDays: trainingForm.lookbackDays,
        algorithm: trainingForm.algorithm,
        architecture: JSON.parse(trainingForm.architecture),
        tuningMode: trainingForm.tuningMode,
        callbackUrl: trainingForm.callbackUrl,
        status: 'pending',
        currentStage: 'Initializing',
        progress: 0,
        startTime: new Date().toISOString(),
        logs: [
          {
            timestamp: new Date().toISOString(),
            stage: 'Init',
            message: 'Training job queued successfully',
            level: 'info'
          }
        ],
        experiment: {
          mlflowRunId: `run_${Date.now()}`,
          dvcHash: 'pending',
          datasetVersion: trainingForm.datasetVersion
        }
      };

      setTrainingJobs(prev => [newJob, ...prev]);
      setIsTrainingDialogOpen(false);
      
      toast({
        title: "Training Started",
        description: `${trainingForm.modelType} model training initiated for ${trainingForm.coins.join(', ')}`,
      });
    } catch (error) {
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Failed to start training",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel training job
  const cancelTraining = async (jobId: string) => {
    setTrainingJobs(prev => prev.map(job => 
      job.jobId === jobId 
        ? { ...job, status: 'cancelled' as const, currentStage: 'Cancelled' }
        : job
    ));
    
    toast({
      title: "Training Cancelled",
      description: "Training job has been cancelled successfully"
    });
  };

  // Deploy model
  const deployModel = async (modelId: string) => {
    if (!founderApproval) {
      toast({
        title: "Approval Required",
        description: "Founder approval is required for model deployment",
        variant: "destructive"
      });
      return;
    }

    setModels(prev => prev.map(model => 
      model.modelId === modelId 
        ? { ...model, status: 'deployed' as const, deployedAt: new Date().toISOString() }
        : model
    ));
    
    toast({
      title: "Model Deployed",
      description: "Model has been deployed to production successfully"
    });
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-800',
      'data_prep': 'bg-blue-100 text-blue-800',
      'training': 'bg-yellow-100 text-yellow-800', 
      'backtesting': 'bg-purple-100 text-purple-800',
      'validation': 'bg-indigo-100 text-indigo-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800',
      'deployed': 'bg-green-100 text-green-800',
      'shadow': 'bg-blue-100 text-blue-800',
      'archived': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getAlgorithmOptions = () => {
    switch (trainingForm.modelType) {
      case 'forecast': return forecastAlgorithms;
      case 'rl_agent': return rlAlgorithms;
      case 'sentiment': return sentimentModels;
      default: return forecastAlgorithms;
    }
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
          <h1 className="text-3xl font-bold tracking-tight">AI Model Management</h1>
          <p className="text-muted-foreground">
            Train, deploy and manage AI models for algorithmic trading
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
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
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Start AI Model Training</DialogTitle>
                <DialogDescription>
                  Configure and launch a new training job for forecast models, RL agents, or sentiment analysis
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {/* Model Type Selection */}
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right self-center">Model Type</Label>
                  <div className="col-span-3">
                    <Select 
                      value={trainingForm.modelType} 
                      onValueChange={(value: any) => setTrainingForm(prev => ({ ...prev, modelType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forecast">Price Forecasting Model</SelectItem>
                        <SelectItem value="rl_agent">Reinforcement Learning Agent</SelectItem>
                        <SelectItem value="sentiment">Sentiment Analysis Model</SelectItem>
                        <SelectItem value="ensemble">Ensemble Model</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Algorithm Selection */}
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right self-center">Algorithm</Label>
                  <div className="col-span-3">
                    <Select 
                      value={trainingForm.algorithm} 
                      onValueChange={(value) => setTrainingForm(prev => ({ ...prev, algorithm: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAlgorithmOptions().map(algo => (
                          <SelectItem key={algo} value={algo}>{algo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Asset Selection */}
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right self-start pt-2">Assets</Label>
                  <div className="col-span-3 grid grid-cols-3 gap-2">
                    {availableCoins.map(coin => (
                      <div key={coin} className="flex items-center space-x-2">
                        <Checkbox
                          id={coin}
                          checked={trainingForm.coins.includes(coin)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTrainingForm(prev => ({
                                ...prev,
                                coins: [...prev.coins, coin]
                              }));
                            } else {
                              setTrainingForm(prev => ({
                                ...prev,
                                coins: prev.coins.filter(c => c !== coin)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={coin} className="text-sm">{coin}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Training Parameters */}
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right self-center">Lookback Days</Label>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={trainingForm.lookbackDays}
                      onChange={(e) => setTrainingForm(prev => ({
                        ...prev,
                        lookbackDays: parseInt(e.target.value) || 30
                      }))}
                      min="1"
                      max="365"
                    />
                  </div>
                  <Label className="text-right self-center">Dataset Version</Label>
                  <div className="col-span-1">
                    <Select 
                      value={trainingForm.datasetVersion} 
                      onValueChange={(value) => setTrainingForm(prev => ({ ...prev, datasetVersion: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {datasets.map(dataset => (
                          <SelectItem key={dataset.version} value={dataset.version}>
                            {dataset.version} ({dataset.size})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* RL Specific Options */}
                {trainingForm.modelType === 'rl_agent' && (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <Label className="text-right self-center">Curriculum Level</Label>
                      <div className="col-span-3">
                        <Select 
                          value={trainingForm.curriculumLevel} 
                          onValueChange={(value: any) => setTrainingForm(prev => ({ ...prev, curriculumLevel: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Simple Market Patterns</SelectItem>
                            <SelectItem value="volatile">Volatile Market Conditions</SelectItem>
                            <SelectItem value="multi_asset">Multi-Asset Trading</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <Label className="text-right self-start pt-2">Environment Config</Label>
                      <div className="col-span-3">
                        <Textarea
                          value={trainingForm.environmentConfig}
                          onChange={(e) => setTrainingForm(prev => ({ ...prev, environmentConfig: e.target.value }))}
                          placeholder="Environment and reward configuration JSON"
                          rows={3}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Architecture Configuration */}
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right self-start pt-2">Architecture</Label>
                  <div className="col-span-3">
                    <Textarea
                      value={trainingForm.architecture}
                      onChange={(e) => setTrainingForm(prev => ({ ...prev, architecture: e.target.value }))}
                      placeholder="Model architecture configuration JSON"
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right self-center">Risk Profile</Label>
                  <div className="col-span-1">
                    <Select 
                      value={trainingForm.riskProfile} 
                      onValueChange={(value: any) => setTrainingForm(prev => ({ ...prev, riskProfile: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tuning"
                        checked={trainingForm.tuningMode}
                        onCheckedChange={(checked) => setTrainingForm(prev => ({ ...prev, tuningMode: !!checked }))}
                      />
                      <Label htmlFor="tuning">Hyperparameter Tuning</Label>
                    </div>
                  </div>
                </div>

                {/* Callback URL */}
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right self-center">Callback URL</Label>
                  <div className="col-span-3">
                    <Input
                      value={trainingForm.callbackUrl}
                      onChange={(e) => setTrainingForm(prev => ({ ...prev, callbackUrl: e.target.value }))}
                      placeholder="Optional webhook URL for completion notification"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTrainingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={startTraining} disabled={isProcessing}>
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

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="training">Training Jobs</TabsTrigger>
          <TabsTrigger value="models">Model Registry</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
        </TabsList>

        {/* Training Jobs Tab */}
        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Training Jobs</CardTitle>
              <CardDescription>
                Monitor progress of AI model training workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingJobs.length > 0 ? (
                  trainingJobs.map((job) => (
                    <div key={job.jobId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Brain className="h-5 w-5 text-primary" />
                          <div>
                            <h3 className="font-medium">{job.algorithm} {job.modelType}</h3>
                            <p className="text-sm text-muted-foreground">
                              {job.coins.join(', ')} • {job.lookbackDays} days • {job.jobId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.replace('_', ' ')}
                          </Badge>
                          {['pending', 'data_prep', 'training', 'backtesting', 'validation'].includes(job.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelTraining(job.jobId)}
                            >
                              <Square className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Stage</p>
                          <p className="text-sm font-medium">{job.currentStage}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <div className="flex items-center space-x-2">
                            <Progress value={job.progress} className="flex-1" />
                            <span className="text-sm">{job.progress}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Runtime</p>
                          <p className="text-sm font-medium">
                            {job.endTime 
                              ? `${Math.round((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 60000)}m`
                              : `${Math.round((Date.now() - new Date(job.startTime).getTime()) / 60000)}m`
                            }
                          </p>
                        </div>
                        {job.experiment.mlflowRunId && (
                          <div>
                            <p className="text-xs text-muted-foreground">MLflow Run</p>
                            <Button variant="link" className="h-auto p-0 text-sm">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {job.experiment.mlflowRunId.slice(0, 8)}...
                            </Button>
                          </div>
                        )}
                      </div>

                      {job.metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted rounded-lg">
                          {job.metrics.sharpeRatio && (
                            <div>
                              <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                              <p className="text-sm font-medium">{job.metrics.sharpeRatio.toFixed(2)}</p>
                            </div>
                          )}
                          {job.metrics.winRate && (
                            <div>
                              <p className="text-xs text-muted-foreground">Win Rate</p>
                              <p className="text-sm font-medium">{(job.metrics.winRate * 100).toFixed(1)}%</p>
                            </div>
                          )}
                          {job.metrics.maxDrawdown && (
                            <div>
                              <p className="text-xs text-muted-foreground">Max Drawdown</p>
                              <p className="text-sm font-medium text-red-600">{(job.metrics.maxDrawdown * 100).toFixed(1)}%</p>
                            </div>
                          )}
                          {job.metrics.totalReward && (
                            <div>
                              <p className="text-xs text-muted-foreground">Total Reward</p>
                              <p className="text-sm font-medium text-green-600">{job.metrics.totalReward.toFixed(1)}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {job.curriculum && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Curriculum: {job.curriculum.level} (Stage {job.curriculum.stage})</p>
                              <p className="text-xs text-muted-foreground">
                                Win Ratio: {(job.curriculum.criteria.winRatio * 100).toFixed(1)}% / {(job.curriculum.criteria.targetWinRatio * 100).toFixed(1)}%
                              </p>
                            </div>
                            {job.curriculum.criteria.passed ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-600" />
                            )}
                          </div>
                        </div>
                      )}

                      {job.logs.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium mb-2">Recent Logs</p>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {job.logs.slice(-3).map((log, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="text-muted-foreground">[{log.stage}]</span> {log.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No training jobs running</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Registry Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Registry</CardTitle>
              <CardDescription>
                Manage trained models, deployments, and shadow testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.length > 0 ? (
                  models.map((model) => (
                    <div key={model.modelId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Rocket className="h-5 w-5 text-primary" />
                          <div>
                            <h3 className="font-medium">{model.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {model.algorithmInfo.name} • v{model.version} • {model.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(model.status)}>
                            {model.status}
                          </Badge>
                          {model.status === 'trained' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Rocket className="h-3 w-3 mr-1" />
                                  Deploy
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Deploy Model to Production</DialogTitle>
                                  <DialogDescription>
                                    Deploy {model.name} to live trading environment
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="approval"
                                      checked={founderApproval}
                                      onCheckedChange={setFounderApproval}
                                    />
                                    <Label htmlFor="approval">
                                      I have founder approval for this deployment
                                    </Label>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button 
                                    onClick={() => deployModel(model.modelId)}
                                    disabled={!founderApproval}
                                  >
                                    Deploy Model
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Accuracy</p>
                          <p className="text-sm font-medium">{(model.accuracy * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                          <p className="text-sm font-medium">{model.performance.sharpeRatio.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="text-sm font-medium">{(model.performance.winRate * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Max Drawdown</p>
                          <p className="text-sm font-medium text-red-600">{(model.performance.maxDrawdown * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Sortino Ratio</p>
                          <p className="text-sm font-medium">{model.performance.sortino.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">MLflow Run</p>
                          <Button variant="link" className="h-auto p-0 text-sm">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {model.experiment.mlflowRunId.slice(0, 12)}...
                          </Button>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">DVC Hash</p>
                          <p className="text-sm font-mono">{model.experiment.dvcHash}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dataset Version</p>
                          <p className="text-sm font-medium">{model.experiment.datasetVersion}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No trained models available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Curriculum Learning</CardTitle>
              <CardDescription>
                Progressive training stages for reinforcement learning agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {curriculumStages.map((stage, index) => (
                  <div key={stage.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          stage.status === 'completed' ? 'bg-green-100 text-green-600' :
                          stage.status === 'active' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {stage.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : stage.status === 'active' ? (
                            <Activity className="h-4 w-4" />
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{stage.name}</h3>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        stage.level === 'simple' ? 'bg-green-50 text-green-700 border-green-200' :
                        stage.level === 'volatile' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }>
                        {stage.level}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Win Ratio Target</p>
                        <p className="text-sm font-medium">{(stage.criteria.winRatio * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Min Trades</p>
                        <p className="text-sm font-medium">{stage.criteria.minTrades}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Max Drawdown</p>
                        <p className="text-sm font-medium">{(stage.criteria.maxDrawdown * 100).toFixed(0)}%</p>
                      </div>
                    </div>

                    {stage.progress !== undefined && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Progress</span>
                          <span className="text-sm">{stage.progress}%</span>
                        </div>
                        <Progress value={stage.progress} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Datasets Tab */}
        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dataset Management</CardTitle>
              <CardDescription>
                Version control and management for training datasets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {datasets.map((dataset) => (
                  <div key={dataset.version} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Database className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium">Dataset {dataset.version}</h3>
                          <p className="text-sm text-muted-foreground">{dataset.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(dataset.status)}>
                          {dataset.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Pull
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Size</p>
                        <p className="text-sm font-medium">{dataset.size}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">DVC Hash</p>
                        <p className="text-sm font-mono">{dataset.dvcHash}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Start Date</p>
                        <p className="text-sm font-medium">{new Date(dataset.timeRange.start).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">End Date</p>
                        <p className="text-sm font-medium">{new Date(dataset.timeRange.end).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Features</p>
                      <div className="flex flex-wrap gap-1">
                        {dataset.features.map(feature => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiments Tab */}
        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Tracking</CardTitle>
              <CardDescription>
                MLflow experiments and reproducibility tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">MLflow integration coming soon</p>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open MLflow UI
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
