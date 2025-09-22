import type { Request, Response } from 'express';

// Enhanced Types for AI Training Workflow
interface TrainingJob {
  jobId: string;
  modelType: 'forecast' | 'rl_agent' | 'sentiment' | 'ensemble';
  coins: string[];
  lookbackDays: number;
  interval: string;
  algorithm: string;
  architecture: any;
  tuneFlag: boolean;
  callbackUrl?: string;
  environmentConfig?: any;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  datasetVersion: string;
  curriculumLevel: 'simple' | 'volatile' | 'multi_asset';
  
  // Status and progress
  status: 'pending' | 'data_prep' | 'forecasting' | 'rl_training' | 'backtesting' | 'validation' | 'completed' | 'failed' | 'cancelled';
  currentStage: string;
  progress: number;
  startTime: string;
  endTime?: string;
  
  // Workflow stages
  stages: {
    dataPrep: { status: string; progress: number; duration?: number; };
    forecasting: { status: string; progress: number; duration?: number; };
    rlTraining: { status: string; progress: number; duration?: number; };
    backtesting: { status: string; progress: number; duration?: number; };
    validation: { status: string; progress: number; duration?: number; };
  };
  
  // Logs and metrics
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
    profitFactor?: number;
    sortino?: number;
    calmar?: number;
  };
  
  // Experiment tracking
  experiment: {
    mlflowRunId?: string;
    dvcHash?: string;
    datasetVersion: string;
    checksum?: string;
    hyperparameters?: any;
  };
  
  // Curriculum learning
  curriculum?: {
    level: 'simple' | 'volatile' | 'multi_asset';
    stage: number;
    criteria: {
      winRatio: number;
      targetWinRatio: number;
      minTrades: number;
      maxDrawdown: number;
      passed: boolean;
    };
    scheduler?: {
      currentDataset: string;
      progressionThreshold: number;
      nextLevel?: string;
    };
  };
  
  // AI-specific settings
  rlConfig?: {
    environment: string;
    algorithm: 'PPO' | 'Recurrent PPO' | 'SAC' | 'TD3' | 'A2C' | 'DDPG';
    rewardWeights: {
      profit: number;
      drawdown: number;
      duration: number;
      winRate: number;
    };
    policyUpdateFreq: number;
    experienceBufferSize: number;
  };
  
  // Created model
  modelId?: string;
}

interface Model {
  modelId: string;
  name: string;
  version: string;
  type: 'forecast' | 'rl_agent' | 'sentiment' | 'ensemble';
  status: 'training' | 'trained' | 'deployed' | 'shadow' | 'archived';
  accuracy: number;
  
  // Enhanced performance metrics
  performance: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    sortino: number;
    calmar: number;
    volatility: number;
    beta: number;
    alpha: number;
    informationRatio: number;
  };
  
  // Algorithm details
  algorithmInfo: {
    name: string;
    architecture: any;
    hyperparameters: any;
    curriculum?: {
      completedLevels: string[];
      finalLevel: string;
    };
  };
  
  // Deployment info
  deployedAt?: string;
  shadowStart?: string;
  shadowEnd?: string;
  createdAt: string;
  createdBy: string;
  
  // Experiment tracking
  experiment: {
    mlflowRunId: string;
    dvcHash: string;
    datasetVersion: string;
    checksum: string;
    reproductionCommand?: string;
  };
  
  // Risk management
  riskProfile?: {
    leverage: number;
    positionLimits: {
      maxPosition: number;
      maxExposure: number;
      maxCorrelation: number;
    };
    stopLoss: number;
    takeProfit: number;
    riskBudget: number;
  };
  
  // Model interpretability
  explainability?: {
    shapValues?: any;
    featureImportance?: Array<{ feature: string; importance: number; }>;
    availableExplanations: string[];
  };
}

interface CurriculumStage {
  name: string;
  level: 'simple' | 'volatile' | 'multi_asset';
  description: string;
  datasetTag: string;
  
  criteria: {
    winRatio: number;
    minTrades: number;
    maxDrawdown: number;
    sharpeRatio?: number;
    consecutiveWins?: number;
  };
  
  status: 'locked' | 'active' | 'completed' | 'failed';
  progress?: number;
  attempts?: number;
  bestPerformance?: {
    winRatio: number;
    sharpeRatio: number;
    totalTrades: number;
  };
}

interface DatasetInfo {
  version: string;
  dvcHash: string;
  size: string;
  description: string;
  status: 'available' | 'processing' | 'error';
  
  features: string[];
  timeRange: {
    start: string;
    end: string;
  };
  
  // Enhanced metadata
  metadata: {
    rows: number;
    columns: number;
    marketConditions: string[];
    assetCoverage: string[];
    samplingRate: string;
    qualityScore: number;
  };
  
  // Version control
  versionInfo: {
    parentVersion?: string;
    changeLog: string;
    creator: string;
    tags: string[];
  };
}

interface SentimentPipeline {
  id: string;
  type: 'twitter' | 'rss';
  status: 'active' | 'paused' | 'error';
  
  config: {
    sources: string[];
    updateFrequency: string;
    processingModel: string;
    filterRules: any;
  };
  
  stats: {
    totalProcessed: number;
    lastUpdated: string;
    avgSentimentScore: number;
    flaggedContent: number;
  };
}

// In-memory storage (replace with actual persistence in production)
let trainingJobs: TrainingJob[] = [
  {
    jobId: 'job_001',
    modelType: 'rl_agent',
    coins: ['BTC', 'ETH'],
    lookbackDays: 30,
    interval: '1h',
    algorithm: 'PPO',
    architecture: { 
      layers: [256, 128, 64], 
      learning_rate: 0.0003,
      attention: true,
      dropout: 0.3 
    },
    tuneFlag: true,
    callbackUrl: 'https://webhook.example.com/training',
    environmentConfig: {
      reward_weights: { profit: 0.7, drawdown: 0.2, duration: 0.1 },
      action_space: 'continuous',
      observation_window: 24
    },
    riskProfile: 'moderate',
    datasetVersion: 'v2.1.0',
    curriculumLevel: 'volatile',
    
    status: 'rl_training',
    currentStage: 'RL Policy Search - Epoch 45/100',
    progress: 65,
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    
    stages: {
      dataPrep: { status: 'completed', progress: 100, duration: 15 },
      forecasting: { status: 'completed', progress: 100, duration: 30 },
      rlTraining: { status: 'running', progress: 65, duration: 85 },
      backtesting: { status: 'pending', progress: 0 },
      validation: { status: 'pending', progress: 0 }
    },
    
    logs: [
      { timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), stage: 'Data Prep', message: 'Market data preprocessing completed with sentiment signals', level: 'info' },
      { timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(), stage: 'Forecasting', message: 'LSTM price prediction model achieved 74% accuracy', level: 'info' },
      { timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), stage: 'RL Training', message: 'PPO agent started learning from TradingEnv', level: 'info' },
      { timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), stage: 'RL Training', message: 'Episode 1000: Avg reward 1.85, Win rate 68%', level: 'info' },
      { timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), stage: 'RL Training', message: 'Curriculum criteria met - advancing to volatile level', level: 'info' }
    ],
    
    metrics: {
      sharpeRatio: 1.85,
      maxDrawdown: -0.12,
      winRate: 0.68,
      totalReward: 1250.5,
      volatility: 0.15,
      profitFactor: 2.1,
      sortino: 2.3
    },
    
    experiment: {
      mlflowRunId: 'run_abc123def456',
      dvcHash: 'a1b2c3d4e5f6',
      datasetVersion: 'v2.1.0',
      checksum: 'sha256:def789...',
      hyperparameters: {
        learning_rate: 0.0003,
        batch_size: 256,
        gamma: 0.99,
        lambda: 0.95
      }
    },
    
    curriculum: {
      level: 'volatile',
      stage: 2,
      criteria: {
        winRatio: 0.68,
        targetWinRatio: 0.65,
        minTrades: 100,
        maxDrawdown: 0.15,
        passed: true
      },
      scheduler: {
        currentDataset: 'volatile_market_2023',
        progressionThreshold: 0.65,
        nextLevel: 'multi_asset'
      }
    },
    
    rlConfig: {
      environment: 'TradingEnv-v2',
      algorithm: 'PPO',
      rewardWeights: {
        profit: 0.7,
        drawdown: 0.2,
        duration: 0.1,
        winRate: 0.0
      },
      policyUpdateFreq: 2048,
      experienceBufferSize: 1000000
    }
  },
  
  {
    jobId: 'job_002',
    modelType: 'sentiment',
    coins: ['BTC', 'ETH', 'ADA'],
    lookbackDays: 14,
    interval: '4h',
    algorithm: 'FinBERT',
    architecture: { 
      model_name: 'ProsusAI/finbert',
      fine_tune_layers: 3,
      max_length: 512 
    },
    tuneFlag: false,
    riskProfile: 'conservative',
    datasetVersion: 'v1.5.2',
    curriculumLevel: 'simple',
    
    status: 'completed',
    currentStage: 'Validation Complete',
    progress: 100,
    startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    
    stages: {
      dataPrep: { status: 'completed', progress: 100, duration: 20 },
      forecasting: { status: 'skipped', progress: 0 },
      rlTraining: { status: 'completed', progress: 100, duration: 120 },
      backtesting: { status: 'completed', progress: 100, duration: 15 },
      validation: { status: 'completed', progress: 100, duration: 10 }
    },
    
    logs: [
      { timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(), stage: 'Data Prep', message: 'Financial PhraseBank dataset loaded and preprocessed', level: 'info' },
      { timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString(), stage: 'Training', message: 'FinBERT fine-tuning started with 3 layers', level: 'info' },
      { timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(), stage: 'Training', message: 'Validation accuracy: 91.2%', level: 'info' },
      { timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), stage: 'Validation', message: 'Model checksum verified and MLflow logged', level: 'info' }
    ],
    
    metrics: {
      sharpeRatio: 2.1,
      maxDrawdown: -0.08,
      winRate: 0.72,
      volatility: 0.12
    },
    
    experiment: {
      mlflowRunId: 'run_def456ghi789',
      dvcHash: 'e5f6g7h8i9j0',
      datasetVersion: 'v1.5.2',
      checksum: 'sha256:abc123...'
    },
    
    modelId: 'model_sent_001'
  }
];

let models: Model[] = [
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
      calmar: 2.8,
      volatility: 0.14,
      beta: 0.65,
      alpha: 0.08,
      informationRatio: 1.45
    },
    
    algorithmInfo: {
      name: 'PPO',
      architecture: { layers: [256, 128, 64], learning_rate: 0.0003 },
      hyperparameters: { batch_size: 256, gamma: 0.99, lambda: 0.95 },
      curriculum: {
        completedLevels: ['simple', 'volatile'],
        finalLevel: 'volatile'
      }
    },
    
    deployedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin@example.com',
    
    experiment: {
      mlflowRunId: 'run_xyz789abc123',
      dvcHash: 'i9j0k1l2m3n4',
      datasetVersion: 'v2.0.0',
      checksum: 'sha256:xyz789...',
      reproductionCommand: 'python scripts/cli.py train --model models/rl_agent_v2.1 --data datasets/btc_eth_v2.0.csv'
    },
    
    riskProfile: {
      leverage: 2.0,
      positionLimits: {
        maxPosition: 0.3,
        maxExposure: 0.8,
        maxCorrelation: 0.7
      },
      stopLoss: 0.05,
      takeProfit: 0.15,
      riskBudget: 0.02
    },
    
    explainability: {
      availableExplanations: ['SHAP', 'Feature Importance', 'Action Attribution'],
      featureImportance: [
        { feature: 'price_momentum', importance: 0.23 },
        { feature: 'volume_profile', importance: 0.18 },
        { feature: 'sentiment_score', importance: 0.15 },
        { feature: 'rsi', importance: 0.12 }
      ]
    }
  },
  
  {
    modelId: 'model_002',
    name: 'Multi-Asset Sentiment v1.3',
    version: '1.3.0',
    type: 'sentiment',
    status: 'shadow',
    accuracy: 0.91,
    
    performance: {
      sharpeRatio: 1.85,
      maxDrawdown: -0.06,
      winRate: 0.78,
      profitFactor: 2.45,
      sortino: 2.8,
      calmar: 3.2,
      volatility: 0.09,
      beta: 0.32,
      alpha: 0.12,
      informationRatio: 1.88
    },
    
    algorithmInfo: {
      name: 'FinBERT',
      architecture: { model_name: 'ProsusAI/finbert', fine_tune_layers: 3 },
      hyperparameters: { learning_rate: 2e-5, batch_size: 16, epochs: 5 }
    },
    
    shadowStart: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    createdBy: 'researcher@example.com',
    
    experiment: {
      mlflowRunId: 'run_sentiment_456',
      dvcHash: 'o5p6q7r8s9t0',
      datasetVersion: 'v1.5.2',
      checksum: 'sha256:sentiment789...'
    },
    
    explainability: {
      availableExplanations: ['Attention Weights', 'Token Importance', 'Sentiment Attribution']
    }
  }
];

let curriculumStages: CurriculumStage[] = [
  {
    name: 'Basic Market Patterns',
    level: 'simple',
    description: 'Learn fundamental buy/sell patterns in stable market conditions',
    datasetTag: 'stable_markets',
    criteria: { 
      winRatio: 0.6, 
      minTrades: 100, 
      maxDrawdown: 0.1,
      sharpeRatio: 1.0 
    },
    status: 'completed',
    progress: 100,
    attempts: 2,
    bestPerformance: {
      winRatio: 0.68,
      sharpeRatio: 1.45,
      totalTrades: 150
    }
  },
  {
    name: 'Volatile Market Handling',
    level: 'volatile',
    description: 'Navigate high volatility periods and market stress',
    datasetTag: 'volatile_markets',
    criteria: { 
      winRatio: 0.65, 
      minTrades: 150, 
      maxDrawdown: 0.15,
      sharpeRatio: 1.2,
      consecutiveWins: 5
    },
    status: 'active',
    progress: 75,
    attempts: 1,
    bestPerformance: {
      winRatio: 0.63,
      sharpeRatio: 1.15,
      totalTrades: 120
    }
  },
  {
    name: 'Multi-Asset Correlation',
    level: 'multi_asset',
    description: 'Trade across multiple assets considering correlations',
    datasetTag: 'multi_asset_portfolio',
    criteria: { 
      winRatio: 0.7, 
      minTrades: 200, 
      maxDrawdown: 0.12,
      sharpeRatio: 1.5 
    },
    status: 'locked'
  }
];

let datasets: DatasetInfo[] = [
  {
    version: 'v2.1.0',
    dvcHash: 'a1b2c3d4e5f6g7h8',
    size: '2.3 GB',
    description: 'Enhanced dataset with sentiment and social signals',
    status: 'available',
    
    features: ['price', 'volume', 'sentiment', 'orderbook', 'social_signals', 'news_events', 'market_regime'],
    timeRange: {
      start: '2023-01-01',
      end: '2024-01-01'
    },
    
    metadata: {
      rows: 8760000,
      columns: 147,
      marketConditions: ['bull', 'bear', 'sideways', 'volatile'],
      assetCoverage: ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'LINK'],
      samplingRate: '1 minute',
      qualityScore: 0.94
    },
    
    versionInfo: {
      parentVersion: 'v2.0.0',
      changeLog: 'Added social sentiment signals and news event classification',
      creator: 'data-engineering@example.com',
      tags: ['production', 'sentiment', 'events']
    }
  },
  {
    version: 'v2.0.0',
    dvcHash: 'g7h8i9j0k1l2m3n4',
    size: '1.8 GB',
    description: 'Baseline dataset with core market features',
    status: 'available',
    
    features: ['price', 'volume', 'orderbook', 'technical_indicators'],
    timeRange: {
      start: '2022-06-01',
      end: '2023-12-31'
    },
    
    metadata: {
      rows: 6570000,
      columns: 89,
      marketConditions: ['bull', 'bear', 'sideways'],
      assetCoverage: ['BTC', 'ETH', 'ADA', 'SOL'],
      samplingRate: '1 minute',
      qualityScore: 0.89
    },
    
    versionInfo: {
      changeLog: 'Initial production dataset with technical indicators',
      creator: 'data-engineering@example.com',
      tags: ['baseline', 'production']
    }
  }
];

// Simple in-memory audit log for admin visibility
export const auditLog: any[] = [];

let sentimentPipelines: SentimentPipeline[] = [
  {
    id: 'twitter_pipeline',
    type: 'twitter',
    status: 'active',
    config: {
      sources: ['#bitcoin', '#ethereum', '#crypto'],
      updateFrequency: '5 minutes',
      processingModel: 'FinBERT',
      filterRules: { min_followers: 100, language: 'en' }
    },
    stats: {
      totalProcessed: 15420,
      lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      avgSentimentScore: 0.15,
      flaggedContent: 23
    }
  },
  {
    id: 'rss_pipeline',
    type: 'rss',
    status: 'active',
    config: {
      sources: ['CoinDesk', 'CryptoSlate', 'Decrypt', 'Binance Blog'],
      updateFrequency: '15 minutes',
      processingModel: 'FinBERT',
      filterRules: { exclude_promotional: true }
    },
    stats: {
      totalProcessed: 1247,
      lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      avgSentimentScore: 0.08,
      flaggedContent: 5
    }
  }
];

// API Handlers

// Models history for catalog view
export function handleGetModelsHistory(req: Request, res: Response) {
  const { status, type, limit = 50, offset = 0, search } = req.query as any;
  let list = [...models];
  if (status) list = list.filter(m => m.status === status);
  if (type) list = list.filter(m => m.type === type);
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(m => m.name.toLowerCase().includes(q) || m.modelId.toLowerCase().includes(q));
  }
  const lim = Math.max(1, Math.min(200, parseInt(String(limit)) || 50));
  const off = Math.max(0, parseInt(String(offset)) || 0);
  const items = list
    .sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(off, off + lim)
    .map(m => ({
      modelId: m.modelId,
      name: m.name,
      version: m.version,
      type: m.type,
      status: m.status,
      checksum: m.experiment.checksum,
      metrics: {
        sharpeRatio: m.performance.sharpeRatio,
        winRate: m.performance.winRate,
        maxDrawdown: m.performance.maxDrawdown,
        profitFactor: m.performance.profitFactor,
        sortino: m.performance.sortino
      },
      createdAt: m.createdAt,
      deployedAt: m.deployedAt || null
    }));
  res.json({ status: 'success', data: items, metadata: { total: list.length, limit: lim, offset: off } });
}

// Start training job with enhanced workflow
export function handleStartTraining(req: Request, res: Response) {
  const {
    modelType,
    coins,
    lookbackDays,
    interval = '1h',
    algorithm,
    architecture,
    tuneFlag = false,
    callbackUrl,
    environmentConfig,
    riskProfile = 'moderate',
    datasetVersion = 'latest',
    curriculumLevel = 'simple'
  } = req.body;

  // Enhanced validation with field-specific errors
  const fieldErrors: Record<string, string> = {};
  if (!modelType) fieldErrors.modelType = 'Required';
  if (!coins) fieldErrors.coins = 'Required';
  if (!lookbackDays && lookbackDays !== 0) fieldErrors.lookbackDays = 'Required';
  if (!algorithm) fieldErrors.algorithm = 'Required';
  if (coins && !Array.isArray(coins)) fieldErrors.coins = 'Must be an array';
  if (Array.isArray(coins) && coins.length === 0) fieldErrors.coins = 'Must include at least one symbol';
  if (typeof lookbackDays === 'number' && (lookbackDays < 1 || lookbackDays > 365)) fieldErrors.lookbackDays = 'Must be between 1 and 365';
  if (Object.keys(fieldErrors).length > 0) {
    return res.status(422).json({ status: 'error', message: 'Validation failed', fields: fieldErrors });
  }

  // Check if a training job is already running (sequential gating)
  const runningJobs = trainingJobs.filter(job => 
    ['pending', 'data_prep', 'forecasting', 'rl_training', 'backtesting', 'validation'].includes(job.status)
  );

  if (runningJobs.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Another training job is already running. Please wait for completion.',
      runningJob: runningJobs[0].jobId
    });
  }

  try {
    const parsedArchitecture = typeof architecture === 'string' ? JSON.parse(architecture) : architecture;
    const parsedEnvironmentConfig = typeof environmentConfig === 'string' ? JSON.parse(environmentConfig) : environmentConfig;

    const jobId = `job_${Date.now()}`;
    auditLog.unshift({ type: 'train:start', jobId, modelType, coins, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });
    const newJob: TrainingJob = {
      jobId,
      modelType,
      coins,
      lookbackDays,
      interval,
      algorithm,
      architecture: parsedArchitecture || {},
      tuneFlag,
      callbackUrl,
      environmentConfig: parsedEnvironmentConfig,
      riskProfile,
      datasetVersion,
      curriculumLevel,
      
      status: 'pending',
      currentStage: 'Initializing training pipeline',
      progress: 0,
      startTime: new Date().toISOString(),
      
      stages: {
        dataPrep: { status: 'pending', progress: 0 },
        forecasting: { status: 'pending', progress: 0 },
        rlTraining: { status: 'pending', progress: 0 },
        backtesting: { status: 'pending', progress: 0 },
        validation: { status: 'pending', progress: 0 }
      },
      
      logs: [{
        timestamp: new Date().toISOString(),
        stage: 'Init',
        message: `${modelType} training job queued successfully for ${coins.join(', ')}`,
        level: 'info'
      }],
      
      experiment: {
        mlflowRunId: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dvcHash: 'pending',
        datasetVersion
      }
    };

    // Add RL-specific configuration
    if (modelType === 'rl_agent') {
      newJob.rlConfig = {
        environment: 'TradingEnv-v2',
        algorithm: algorithm as any,
        rewardWeights: parsedEnvironmentConfig?.reward_weights || {
          profit: 0.7,
          drawdown: 0.2,
          duration: 0.1,
          winRate: 0.0
        },
        policyUpdateFreq: 2048,
        experienceBufferSize: 1000000
      };
      
      // Set up curriculum if specified
      const curriculumStage = curriculumStages.find(stage => stage.level === curriculumLevel);
      if (curriculumStage) {
        newJob.curriculum = {
          level: curriculumLevel,
          stage: 1,
          criteria: {
            winRatio: 0,
            targetWinRatio: curriculumStage.criteria.winRatio,
            minTrades: curriculumStage.criteria.minTrades,
            maxDrawdown: curriculumStage.criteria.maxDrawdown,
            passed: false
          },
          scheduler: {
            currentDataset: curriculumStage.datasetTag,
            progressionThreshold: curriculumStage.criteria.winRatio
          }
        };
      }
    }

    trainingJobs.unshift(newJob);

    // Simulate training workflow progression
    setTimeout(() => simulateTrainingProgress(jobId), 2000);

    console.log(`Training job started: ${jobId} - ${modelType} for ${coins.join(', ')}`);

    res.json({
      status: 'success',
      message: 'Training job started successfully',
      data: { jobId, ...newJob }
    });

  } catch (error) {
    console.error('Training start error:', error);
    res.status(400).json({
      status: 'error',
      message: 'Invalid JSON in architecture or environment configuration'
    });
  }
}

// Simulate realistic training workflow progress
export function handleStartTrainingV1(req: Request, res: Response) {
  try {
    const q: any = (req as any).query || {};
    const b: any = (req as any).body || {};

    const modelType = b.model_type === 'rl' ? 'rl_agent'
      : b.model_type === 'forecast' ? 'forecast'
      : b.model_type === 'sentiment' ? 'sentiment'
      : b.modelType;

    const coins = Array.isArray(b.coin) ? b.coin
      : Array.isArray(b.coins) ? b.coins : [];

    const lookbackDays = b.lookback_days ?? b.lookbackDays;
    const interval = b.interval || '1h';

    let algorithm: any = b.algorithm;
    if (!algorithm && (b.architecture === 'lstm' || b.architecture === 'transformer')) {
      algorithm = String(b.architecture).toLowerCase() === 'lstm' ? 'LSTM' : 'Transformer';
    }
    if (typeof algorithm === 'string') {
      const map: Record<string,string> = { ppo:'PPO', recurrent_ppo:'Recurrent PPO', sac:'SAC' };
      algorithm = map[algorithm] || algorithm;
    }

    const tuneFlag = (String(q.tune || b.tune || '').toLowerCase() === 'true') || !!b.tuneFlag;
    const callbackUrl = b.callback_url || b.callbackUrl;
    const architecture = b.architecture;

    (req as any).body = {
      modelType,
      coins,
      lookbackDays,
      interval,
      algorithm,
      architecture,
      tuneFlag,
      callbackUrl,
    };

    return handleStartTraining(req, res);
  } catch (err) {
    console.error('v1 training adapter error:', err);
    return res.status(400).json({ status: 'error', message: 'Invalid request' });
  }
}

function simulateTrainingProgress(jobId: string) {
  const job = trainingJobs.find(j => j.jobId === jobId);
  if (!job) return;

  // Stage 1: Data Preparation
  setTimeout(() => {
    if (job.status === 'cancelled') return;
    job.status = 'data_prep';
    job.currentStage = 'Data gathering & preprocessing';
    job.progress = 15;
    job.stages.dataPrep.status = 'running';
    job.stages.dataPrep.progress = 50;
    job.logs.push({
      timestamp: new Date().toISOString(),
      stage: 'Data Prep',
      message: 'Loading market data, volumes, and sentiment feeds',
      level: 'info'
    });
  }, 2000);

  // Complete data prep
  setTimeout(() => {
    if (job.status === 'cancelled') return;
    job.progress = 25;
    job.stages.dataPrep.status = 'completed';
    job.stages.dataPrep.progress = 100;
    job.stages.dataPrep.duration = 15;
    job.logs.push({
      timestamp: new Date().toISOString(),
      stage: 'Data Prep',
      message: 'Feature engineering and data normalization completed',
      level: 'info'
    });
  }, 8000);

  // Stage 2: Forecasting (if not sentiment model)
  if (job.modelType !== 'sentiment') {
    setTimeout(() => {
      if (job.status === 'cancelled') return;
      job.status = 'forecasting';
      job.currentStage = 'Training price prediction baseline';
      job.progress = 35;
      job.stages.forecasting.status = 'running';
      job.stages.forecasting.progress = 30;
      job.logs.push({
        timestamp: new Date().toISOString(),
        stage: 'Forecasting',
        message: `Training ${job.algorithm} model for price prediction`,
        level: 'info'
      });
    }, 10000);

    setTimeout(() => {
      if (job.status === 'cancelled') return;
      job.progress = 45;
      job.stages.forecasting.status = 'completed';
      job.stages.forecasting.progress = 100;
      job.stages.forecasting.duration = 25;
      job.logs.push({
        timestamp: new Date().toISOString(),
        stage: 'Forecasting',
        message: 'Price prediction model achieved baseline accuracy',
        level: 'info'
      });
    }, 18000);
  }

  // Stage 3: RL Training or Main Training
  setTimeout(() => {
    if (job.status === 'cancelled') return;
    if (job.modelType === 'rl_agent') {
      job.status = 'rl_training';
      job.currentStage = 'RL policy search in TradingEnv';
    } else {
      job.status = 'rl_training';
      job.currentStage = 'Model training';
    }
    job.progress = 55;
    job.stages.rlTraining.status = 'running';
    job.stages.rlTraining.progress = 20;
    
    if (job.modelType === 'rl_agent') {
      job.logs.push({
        timestamp: new Date().toISOString(),
        stage: 'RL Training',
        message: `${job.rlConfig?.algorithm} agent learning from environment`,
        level: 'info'
      });
    } else {
      job.logs.push({
        timestamp: new Date().toISOString(),
        stage: 'Training',
        message: `${job.algorithm} model training started`,
        level: 'info'
      });
    }
  }, job.modelType === 'sentiment' ? 12000 : 20000);

  // Training progress updates
  const trainingUpdates = [
    { delay: 25000, progress: 65, message: 'Training epoch 25/100 completed' },
    { delay: 35000, progress: 75, message: 'Validation metrics improving' },
    { delay: 45000, progress: 85, message: 'Hyperparameter optimization in progress' }
  ];

  trainingUpdates.forEach(update => {
    setTimeout(() => {
      if (job.status === 'cancelled') return;
      job.progress = update.progress;
      job.stages.rlTraining.progress = update.progress;
      job.logs.push({
        timestamp: new Date().toISOString(),
        stage: job.modelType === 'rl_agent' ? 'RL Training' : 'Training',
        message: update.message,
        level: 'info'
      });
      
      // Add some metrics
      if (update.progress >= 75) {
        job.metrics = {
          sharpeRatio: 1.2 + Math.random() * 0.8,
          maxDrawdown: -(0.05 + Math.random() * 0.1),
          winRate: 0.55 + Math.random() * 0.2,
          totalReward: 500 + Math.random() * 1000,
          volatility: 0.1 + Math.random() * 0.1
        };
      }
    }, update.delay);
  });

  // Complete training stage
  setTimeout(() => {
    if (job.status === 'cancelled') return;
    job.progress = 88;
    job.stages.rlTraining.status = 'completed';
    job.stages.rlTraining.progress = 100;
    job.stages.rlTraining.duration = 120;
    job.logs.push({
      timestamp: new Date().toISOString(),
      stage: job.modelType === 'rl_agent' ? 'RL Training' : 'Training',
      message: 'Model training completed successfully',
      level: 'info'
    });
  }, 50000);

  // Stage 4: Backtesting
  setTimeout(() => {
    if (job.status === 'cancelled') return;
    job.status = 'backtesting';
    job.currentStage = 'Simulation backtesting';
    job.progress = 92;
    job.stages.backtesting.status = 'running';
    job.stages.backtesting.progress = 50;
    job.logs.push({
      timestamp: new Date().toISOString(),
      stage: 'Backtesting',
      message: 'Running simulation backtest with risk profiles',
      level: 'info'
    });
  }, 52000);

  setTimeout(() => {
    if (job.status === 'cancelled') return;
    job.progress = 96;
    job.stages.backtesting.status = 'completed';
    job.stages.backtesting.progress = 100;
    job.stages.backtesting.duration = 10;
    job.logs.push({
      timestamp: new Date().toISOString(),
      stage: 'Backtesting',
      message: 'Backtest completed with performance metrics',
      level: 'info'
    });
  }, 58000);

  // Stage 5: Validation
  setTimeout(() => {
    if (job.status === 'cancelled') return;
    job.status = 'validation';
    job.currentStage = 'Model validation and artifact generation';
    job.progress = 98;
    job.stages.validation.status = 'running';
    job.stages.validation.progress = 80;
    job.logs.push({
      timestamp: new Date().toISOString(),
      stage: 'Validation',
      message: 'Generating SHAP explanations and model artifacts',
      level: 'info'
    });
  }, 60000);

  // Complete job
  setTimeout(() => {
    if (job.status === 'cancelled') return;
    job.status = 'completed';
    job.currentStage = 'Training completed successfully';
    job.progress = 100;
    job.endTime = new Date().toISOString();
    job.stages.validation.status = 'completed';
    job.stages.validation.progress = 100;
    job.stages.validation.duration = 5;
    
    // Generate final metrics
    job.metrics = {
      sharpeRatio: 1.5 + Math.random() * 1.0,
      maxDrawdown: -(0.06 + Math.random() * 0.1),
      winRate: 0.6 + Math.random() * 0.2,
      totalReward: 800 + Math.random() * 1500,
      volatility: 0.12 + Math.random() * 0.08,
      profitFactor: 1.8 + Math.random() * 0.8,
      sortino: 2.0 + Math.random() * 1.0
    };

    // Update experiment info
    job.experiment.dvcHash = Math.random().toString(36).substr(2, 16);
    job.experiment.checksum = `sha256:${Math.random().toString(36).substr(2, 64)}`;

    // Create model
    const modelId = `model_${Date.now()}`;
    job.modelId = modelId;

    const newModel: Model = {
      modelId,
      name: `${job.coins.join('-')} ${job.algorithm} v1.0`,
      version: '1.0.0',
      type: job.modelType,
      status: 'trained',
      accuracy: 0.7 + Math.random() * 0.2,
      performance: {
        sharpeRatio: job.metrics.sharpeRatio!,
        maxDrawdown: job.metrics.maxDrawdown!,
        winRate: job.metrics.winRate!,
        profitFactor: job.metrics.profitFactor || 1.8,
        sortino: job.metrics.sortino || 2.2,
        calmar: 2.5 + Math.random() * 1.0,
        volatility: job.metrics.volatility!,
        beta: 0.5 + Math.random() * 0.4,
        alpha: 0.05 + Math.random() * 0.1,
        informationRatio: 1.2 + Math.random() * 0.6
      },
      algorithmInfo: {
        name: job.algorithm,
        architecture: job.architecture,
        hyperparameters: job.experiment.hyperparameters || {}
      },
      createdAt: new Date().toISOString(),
      createdBy: 'training-system',
      experiment: {
        mlflowRunId: job.experiment.mlflowRunId!,
        dvcHash: job.experiment.dvcHash!,
        datasetVersion: job.experiment.datasetVersion,
        checksum: job.experiment.checksum!,
        reproductionCommand: `python scripts/cli.py train --model ${job.modelType} --data ${job.datasetVersion} --algorithm ${job.algorithm}`
      },
      explainability: {
        availableExplanations: ['SHAP', 'Feature Importance'],
        featureImportance: [
          { feature: 'price_momentum', importance: 0.25 },
          { feature: 'volume_profile', importance: 0.20 },
          { feature: 'sentiment_score', importance: 0.15 }
        ]
      }
    };

    models.unshift(newModel);

    job.logs.push({
      timestamp: new Date().toISOString(),
      stage: 'Completion',
      message: `Training completed successfully. Model ${modelId} created.`,
      level: 'info'
    });

    console.log(`Training job completed: ${job.jobId} -> Model: ${modelId}`);

    // Call webhook if provided
    if (job.callbackUrl) {
      // In production, make actual HTTP request to callback URL
      console.log(`Callback notification sent to: ${job.callbackUrl}`);
    }
  }, 65000);
}

// Get training job status with enhanced details
export function handleGetTrainingStatus(req: Request, res: Response) {
  const { jobId } = req.params;

  const job = trainingJobs.find(j => j.jobId === jobId);
  if (!job) {
    return res.status(404).json({
      status: 'error',
      message: 'Training job not found'
    });
  }

  res.json({
    status: 'success',
    data: job
  });
}

// Get all training jobs with filtering
export function handleGetAllTrainingJobs(req: Request, res: Response) {
  const { status, modelType, limit = 50, offset = 0 } = req.query;
  
  let filteredJobs = [...trainingJobs];
  
  if (status) {
    filteredJobs = filteredJobs.filter(job => job.status === status);
  }
  
  if (modelType) {
    filteredJobs = filteredJobs.filter(job => job.modelType === modelType);
  }
  
  const limitNum = parseInt(limit as string);
  const offsetNum = parseInt(offset as string);
  
  const paginatedJobs = filteredJobs
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(offsetNum, offsetNum + limitNum);

  res.json({
    status: 'success',
    data: paginatedJobs,
    metadata: {
      total: filteredJobs.length,
      limit: limitNum,
      offset: offsetNum
    }
  });
}

// Server-Sent Events stream for training jobs (lightweight real-time updates)
export function handleStreamTrainingJobs(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  (res as any).flushHeaders?.();

  const send = () => {
    const payload = JSON.stringify({ type: 'jobs_snapshot', jobs: trainingJobs, ts: Date.now() });
    res.write(`data: ${payload}\n\n`);
  };

  const interval = setInterval(send, 5000);
  send();

  const onClose = () => {
    clearInterval(interval);
    try { res.end(); } catch {}
  };
  (req as any).on('close', onClose);
}

// Cancel training job
export function handleCancelTraining(req: Request, res: Response) {
  auditLog.unshift({ type: 'train:cancel:attempt', jobId: req.params.jobId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });
  const { jobId } = req.params;

  const job = trainingJobs.find(j => j.jobId === jobId);
  if (!job) {
    return res.status(404).json({
      status: 'error',
      message: 'Training job not found'
    });
  }

  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    return res.status(400).json({
      status: 'error',
      message: `Cannot cancel job with status: ${job.status}`
    });
  }

  job.status = 'cancelled';
  job.currentStage = 'Training cancelled by user';
  job.endTime = new Date().toISOString();
  job.logs.push({
    timestamp: new Date().toISOString(),
    stage: 'Cancellation',
    message: 'Training job cancelled by user request',
    level: 'info'
  });

  console.log(`Training job cancelled: ${jobId}`);

  res.json({
    status: 'success',
    message: 'Training job cancelled successfully',
    data: job
  });
}

// Deploy model with enhanced checks
export function handleDeployModel(req: Request, res: Response) {
  auditLog.unshift({ type: 'model:deploy:attempt', modelId: req.params.modelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });
  const { modelId } = req.params;
  const { founderApproval = false } = req.body;

  const model = models.find(m => m.modelId === modelId);
  if (!model) {
    return res.status(404).json({
      status: 'error',
      message: 'Model not found'
    });
  }

  if (model.status === 'deployed') {
    return res.status(400).json({
      status: 'error',
      message: 'Model is already deployed'
    });
  }

  if (!founderApproval) {
    return res.status(400).json({
      status: 'error',
      message: 'Founder approval is required for model deployment'
    });
  }

  // Archive previous deployed models
  models.forEach(m => {
    if (m.status === 'deployed') {
      m.status = 'archived';
    }
  });

  model.status = 'deployed';
  model.deployedAt = new Date().toISOString();

  console.log(`Model deployed: ${modelId} with founder approval`);
  auditLog.unshift({ type: 'model:deployed', modelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });

  res.json({
    status: 'success',
    message: 'Model deployed successfully',
    data: model
  });
}

// Get all models with enhanced filtering
export function handleGetAllModels(req: Request, res: Response) {
  const { status, type, limit = 50, offset = 0 } = req.query;
  
  let filteredModels = [...models];
  
  if (status) {
    filteredModels = filteredModels.filter(model => model.status === status);
  }
  
  if (type) {
    filteredModels = filteredModels.filter(model => model.type === type);
  }
  
  const limitNum = parseInt(limit as string);
  const offsetNum = parseInt(offset as string);
  
  const paginatedModels = filteredModels
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(offsetNum, offsetNum + limitNum);

  res.json({
    status: 'success',
    data: paginatedModels,
    metadata: {
      total: filteredModels.length,
      limit: limitNum,
      offset: offsetNum
    }
  });
}

// Additional API handlers for sentiment ingestion, curriculum management, etc.

// Get curriculum stages
export function handleGetCurriculumStages(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: curriculumStages
  });
}

// Get datasets
export function handleGetDatasets(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: datasets
  });
}

// Get sentiment pipelines
export function handleGetSentimentPipelines(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: sentimentPipelines
  });
}

// Model registry actions

// Promote model with founder approval
export function handlePromoteModel(req: Request, res: Response) {
  auditLog.unshift({ type: 'model:promote:attempt', modelId: req.body?.modelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });
  const { modelId, founderApproval } = req.body;

  if (!founderApproval) {
    return res.status(400).json({
      status: 'error',
      message: 'Founder approval is required for model promotion'
    });
  }

  const model = models.find(m => m.modelId === modelId);
  if (!model) {
    return res.status(404).json({
      status: 'error',
      message: 'Model not found'
    });
  }

  // Archive current deployed model
  models.forEach(m => {
    if (m.status === 'deployed') {
      m.status = 'archived';
    }
  });

  model.status = 'deployed';
  model.deployedAt = new Date().toISOString();

  console.log(`Model promoted: ${modelId} with founder approval`);
  auditLog.unshift({ type: 'model:promoted', modelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });

  res.json({
    status: 'success',
    message: 'Model promoted to production successfully',
    data: model
  });
}

// Start shadow testing
export function handleStartShadow(req: Request, res: Response) {
  auditLog.unshift({ type: 'model:shadow:start:attempt', modelId: req.body?.modelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });
  const { modelId } = req.body;

  const model = models.find(m => m.modelId === modelId);
  if (!model) {
    return res.status(404).json({
      status: 'error',
      message: 'Model not found'
    });
  }

  if (model.status === 'shadow') {
    return res.status(400).json({
      status: 'error',
      message: 'Model is already in shadow testing'
    });
  }

  model.status = 'shadow';
  model.shadowStart = new Date().toISOString();

  console.log(`Shadow testing started: ${modelId}`);
  auditLog.unshift({ type: 'model:shadow:started', modelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });

  res.json({
    status: 'success',
    message: 'Shadow testing started successfully',
    data: model
  });
}

// Stop shadow testing
export function handleStopShadow(req: Request, res: Response) {
  auditLog.unshift({ type: 'model:shadow:stop:attempt', modelId: req.body?.modelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });
  const { modelId } = req.body;

  const model = models.find(m => m.modelId === modelId);
  if (!model) {
    return res.status(404).json({
      status: 'error',
      message: 'Model not found'
    });
  }

  if (model.status !== 'shadow') {
    return res.status(400).json({
      status: 'error',
      message: 'Model is not in shadow testing'
    });
  }

  model.status = 'trained';
  model.shadowEnd = new Date().toISOString();

  console.log(`Shadow testing stopped: ${modelId}`);
  auditLog.unshift({ type: 'model:shadow:stopped', modelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });

  res.json({
    status: 'success',
    message: 'Shadow testing stopped successfully',
    data: model
  });
}

// Rollback model
export function handleRollbackModel(req: Request, res: Response) {
  auditLog.unshift({ type: 'model:rollback:attempt', from: req.body?.fromModelId, to: req.body?.toModelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });
  const { fromModelId, toModelId, founderApproval } = req.body;

  if (!founderApproval) {
    return res.status(400).json({
      status: 'error',
      message: 'Founder approval is required for model rollback'
    });
  }

  const fromModel = models.find(m => m.modelId === fromModelId);
  const toModel = models.find(m => m.modelId === toModelId);

  if (!fromModel || !toModel) {
    return res.status(404).json({
      status: 'error',
      message: 'Model not found'
    });
  }

  // Perform rollback
  fromModel.status = 'archived';
  toModel.status = 'deployed';
  toModel.deployedAt = new Date().toISOString();

  console.log(`Model rollback: ${fromModelId} -> ${toModelId}`);
  auditLog.unshift({ type: 'model:rolled_back', from: fromModelId, to: toModelId, at: new Date().toISOString(), actor: (req as any).user?.id || 'admin' });

  res.json({
    status: 'success',
    message: 'Model rollback completed successfully',
    data: { fromModel, toModel }
  });
}

// Get shadow tests (mock implementation)
export function handleGetShadowTests(_req: Request, res: Response) {
  const shadowTests = models
    .filter(m => m.status === 'shadow' || m.shadowStart)
    .map(m => ({
      id: `shadow_${m.modelId}`,
      modelId: m.modelId,
      startTime: m.shadowStart,
      endTime: m.shadowEnd,
      status: m.status === 'shadow' ? 'running' : 'completed',
      results: {
        performance: Math.random() * 20,
        trades: Math.floor(Math.random() * 100),
        pnl: (Math.random() - 0.5) * 5000
      }
    }));

  res.json({
    status: 'success',
    data: shadowTests
  });
}
