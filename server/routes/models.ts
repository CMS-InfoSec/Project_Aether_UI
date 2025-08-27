import { Request, Response } from 'express';

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

// In-memory storage (replace with actual persistence in production)
let trainingJobs: TrainingJob[] = [
  {
    jobId: 'job_1',
    modelType: 'LSTM',
    coins: ['BTC', 'ETH'],
    lookbackDays: 30,
    interval: '1h',
    algorithm: 'gradient_descent',
    callbackUrl: 'https://webhook.example.com/training',
    architectureJson: { layers: [64, 32, 16], dropout: 0.2 },
    tuneFlag: true,
    status: 'completed',
    progress: 100,
    startTime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() - 3600000).toISOString(),
    logs: ['Started training', 'Epoch 1/100 completed', 'Training completed successfully'],
    modelId: 'model_1'
  },
  {
    jobId: 'job_2',
    modelType: 'Transformer',
    coins: ['BTC'],
    lookbackDays: 60,
    interval: '15m',
    algorithm: 'adam',
    architectureJson: { heads: 8, layers: 12, embed_dim: 512 },
    tuneFlag: false,
    status: 'running',
    progress: 45,
    startTime: new Date(Date.now() - 7200000).toISOString(),
    logs: ['Started training', 'Epoch 1/200 completed', 'Epoch 45/200 in progress...']
  }
];

let models: Model[] = [
  {
    modelId: 'model_1',
    name: 'BTC-ETH LSTM v1.2',
    version: '1.2.0',
    type: 'LSTM',
    status: 'deployed',
    accuracy: 0.847,
    performance: {
      sharpeRatio: 1.85,
      maxDrawdown: 0.12,
      winRate: 0.67
    },
    deployedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'admin@example.com'
  },
  {
    modelId: 'model_2',
    name: 'BTC Transformer v2.1',
    version: '2.1.0',
    type: 'Transformer',
    status: 'shadow',
    accuracy: 0.892,
    performance: {
      sharpeRatio: 2.13,
      maxDrawdown: 0.08,
      winRate: 0.74
    },
    shadowStart: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    createdBy: 'admin@example.com'
  },
  {
    modelId: 'model_3',
    name: 'Multi-Asset CNN v1.0',
    version: '1.0.0',
    type: 'CNN',
    status: 'trained',
    accuracy: 0.765,
    performance: {
      sharpeRatio: 1.42,
      maxDrawdown: 0.15,
      winRate: 0.61
    },
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    createdBy: 'researcher@example.com'
  }
];

let shadowTests: ShadowTest[] = [
  {
    id: 'shadow_1',
    modelId: 'model_2',
    startTime: new Date(Date.now() - 1800000).toISOString(),
    status: 'running',
    results: {
      performance: 15.2,
      trades: 48,
      pnl: 2847.50
    }
  }
];

// Start training job
export function handleStartTraining(req: Request, res: Response) {
  const {
    modelType,
    coins,
    lookbackDays,
    interval,
    algorithm,
    callbackUrl,
    architectureJson,
    tuneFlag,
    actor
  } = req.body;

  // Validation
  if (!modelType || !coins || !lookbackDays || !interval || !algorithm) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: modelType, coins, lookbackDays, interval, algorithm'
    });
  }

  if (!Array.isArray(coins) || coins.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Coins must be a non-empty array'
    });
  }

  if (lookbackDays < 1 || lookbackDays > 365) {
    return res.status(400).json({
      status: 'error',
      message: 'Lookback days must be between 1 and 365'
    });
  }

  const jobId = `job_${Date.now()}`;
  const newJob: TrainingJob = {
    jobId,
    modelType,
    coins,
    lookbackDays,
    interval,
    algorithm,
    callbackUrl,
    architectureJson: architectureJson || {},
    tuneFlag: tuneFlag || false,
    status: 'pending',
    progress: 0,
    startTime: new Date().toISOString(),
    logs: ['Job queued for training']
  };

  trainingJobs.push(newJob);

  console.log(`Training job started: ${jobId} by ${actor || 'Unknown'}`);

  // Simulate training progress
  setTimeout(() => {
    const job = trainingJobs.find(j => j.jobId === jobId);
    if (job) {
      job.status = 'running';
      job.logs.push('Training started');
    }
  }, 1000);

  res.json({
    status: 'success',
    message: 'Training job started successfully',
    data: { jobId, ...newJob }
  });
}

// Get training job status
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

// Get all training jobs
export function handleGetAllTrainingJobs(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: trainingJobs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  });
}

// Cancel training job
export function handleCancelTraining(req: Request, res: Response) {
  const { jobId } = req.params;
  const { actor } = req.body;

  const job = trainingJobs.find(j => j.jobId === jobId);
  if (!job) {
    return res.status(404).json({
      status: 'error',
      message: 'Training job not found'
    });
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return res.status(400).json({
      status: 'error',
      message: `Cannot cancel job with status: ${job.status}`
    });
  }

  job.status = 'cancelled';
  job.endTime = new Date().toISOString();
  job.logs.push(`Job cancelled by ${actor || 'Unknown'}`);

  console.log(`Training job cancelled: ${jobId} by ${actor || 'Unknown'}`);

  res.json({
    status: 'success',
    message: 'Training job cancelled successfully',
    data: job
  });
}

// Deploy model
export function handleDeployModel(req: Request, res: Response) {
  const { modelId } = req.params;
  const { actor } = req.body;

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

  // Set previous deployed models to archived
  models.forEach(m => {
    if (m.status === 'deployed') {
      m.status = 'archived';
    }
  });

  model.status = 'deployed';
  model.deployedAt = new Date().toISOString();

  console.log(`Model deployed: ${modelId} by ${actor || 'Unknown'}`);

  res.json({
    status: 'success',
    message: 'Model deployed successfully',
    data: model
  });
}

// Get all models
export function handleGetAllModels(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: models.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });
}

// Promote model
export function handlePromoteModel(req: Request, res: Response) {
  const { modelId, founderApproval, actor } = req.body;

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

  console.log(`Model promoted: ${modelId} by ${actor || 'Unknown'} with founder approval`);

  res.json({
    status: 'success',
    message: 'Model promoted to production successfully',
    data: model
  });
}

// Start shadow testing
export function handleStartShadow(req: Request, res: Response) {
  const { modelId, actor } = req.body;

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

  const shadowId = `shadow_${Date.now()}`;
  const newShadowTest: ShadowTest = {
    id: shadowId,
    modelId,
    startTime: new Date().toISOString(),
    status: 'running'
  };

  shadowTests.push(newShadowTest);
  model.status = 'shadow';
  model.shadowStart = new Date().toISOString();

  console.log(`Shadow testing started: ${modelId} by ${actor || 'Unknown'}`);

  res.json({
    status: 'success',
    message: 'Shadow testing started successfully',
    data: { shadowTest: newShadowTest, model }
  });
}

// Stop shadow testing
export function handleStopShadow(req: Request, res: Response) {
  const { modelId, actor } = req.body;

  const model = models.find(m => m.modelId === modelId);
  if (!model) {
    return res.status(404).json({
      status: 'error',
      message: 'Model not found'
    });
  }

  const shadowTest = shadowTests.find(s => s.modelId === modelId && s.status === 'running');
  if (!shadowTest) {
    return res.status(400).json({
      status: 'error',
      message: 'No active shadow test found for this model'
    });
  }

  shadowTest.status = 'stopped';
  shadowTest.endTime = new Date().toISOString();
  model.status = 'trained';
  model.shadowEnd = new Date().toISOString();

  console.log(`Shadow testing stopped: ${modelId} by ${actor || 'Unknown'}`);

  res.json({
    status: 'success',
    message: 'Shadow testing stopped successfully',
    data: { shadowTest, model }
  });
}

// Rollback model
export function handleRollbackModel(req: Request, res: Response) {
  const { fromModelId, toModelId, founderApproval, actor } = req.body;

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

  console.log(`Model rollback: ${fromModelId} -> ${toModelId} by ${actor || 'Unknown'}`);

  res.json({
    status: 'success',
    message: 'Model rollback completed successfully',
    data: { fromModel, toModel }
  });
}

// Get shadow tests
export function handleGetShadowTests(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: shadowTests.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  });
}
