import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import apiFetch from "@/lib/apiClient";
import copy from "@/lib/clipboard";
import HelpTip from "@/components/ui/help-tip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Upload,
  Pause,
  Info,
  Users,
  MessageSquare,
  Rss,
  Twitter,
  Beaker,
  Archive,
  RotateCcw,
  Copy,
  FileText,
  TrendingDown,
  LineChart,
  PieChart,
  Calendar,
  User,
  Bot,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Enhanced Types for AI Training Workflow
interface TrainingJob {
  jobId: string;
  modelType: "forecast" | "rl_agent" | "sentiment" | "ensemble";
  coins: string[];
  lookbackDays: number;
  interval: string;
  algorithm: string;
  architecture: any;
  tuneFlag: boolean;
  callbackUrl?: string;
  environmentConfig?: any;
  riskProfile: "conservative" | "moderate" | "aggressive";
  datasetVersion: string;
  curriculumLevel: "simple" | "volatile" | "multi_asset";

  status:
    | "pending"
    | "data_prep"
    | "forecasting"
    | "rl_training"
    | "backtesting"
    | "validation"
    | "completed"
    | "failed"
    | "cancelled";
  currentStage: string;
  progress: number;
  startTime: string;
  endTime?: string;

  stages: {
    dataPrep: { status: string; progress: number; duration?: number };
    forecasting: { status: string; progress: number; duration?: number };
    rlTraining: { status: string; progress: number; duration?: number };
    backtesting: { status: string; progress: number; duration?: number };
    validation: { status: string; progress: number; duration?: number };
  };

  logs: Array<{
    timestamp: string;
    stage: string;
    message: string;
    level: "info" | "warning" | "error";
  }>;

  metrics?: {
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
    totalReward?: number;
    volatility?: number;
    profitFactor?: number;
    sortino?: number;
  };

  experiment: {
    mlflowRunId?: string;
    dvcHash?: string;
    datasetVersion: string;
    checksum?: string;
    hyperparameters?: any;
  };

  curriculum?: {
    level: "simple" | "volatile" | "multi_asset";
    stage: number;
    criteria: {
      winRatio: number;
      targetWinRatio: number;
      minTrades: number;
      maxDrawdown: number;
      passed: boolean;
    };
  };

  rlConfig?: {
    environment: string;
    algorithm: string;
    rewardWeights: any;
  };

  modelId?: string;
}

interface Model {
  modelId: string;
  name: string;
  version: string;
  type: "forecast" | "rl_agent" | "sentiment" | "ensemble";
  status: "training" | "trained" | "deployed" | "shadow" | "archived";
  accuracy: number;

  performance: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    sortino: number;
    calmar: number;
    volatility: number;
    beta?: number;
    alpha?: number;
    informationRatio?: number;
  };

  algorithmInfo: {
    name: string;
    architecture: any;
    hyperparameters: any;
    curriculum?: {
      completedLevels: string[];
      finalLevel: string;
    };
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
    reproductionCommand?: string;
  };

  riskProfile?: {
    leverage: number;
    positionLimits: any;
    stopLoss: number;
    takeProfit: number;
  };

  explainability?: {
    availableExplanations: string[];
    featureImportance?: Array<{ feature: string; importance: number }>;
  };
}

interface CurriculumStage {
  name: string;
  level: "simple" | "volatile" | "multi_asset";
  description: string;
  datasetTag: string;
  criteria: {
    winRatio: number;
    minTrades: number;
    maxDrawdown: number;
    sharpeRatio?: number;
    consecutiveWins?: number;
  };
  status: "locked" | "active" | "completed" | "failed";
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
  status: "available" | "processing" | "error";
  features: string[];
  timeRange: {
    start: string;
    end: string;
  };
  metadata: {
    rows: number;
    columns: number;
    marketConditions: string[];
    assetCoverage: string[];
    samplingRate: string;
    qualityScore: number;
  };
  versionInfo: {
    parentVersion?: string;
    changeLog: string;
    creator: string;
    tags: string[];
  };
}

interface SentimentPipeline {
  id: string;
  type: "twitter" | "rss";
  status: "active" | "paused" | "error";
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

export default function AdminModels() {
  // State management
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [curriculumStages, setCurriculumStages] = useState<CurriculumStage[]>(
    [],
  );
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [sentimentPipelines, setSentimentPipelines] = useState<
    SentimentPipeline[]
  >([]);

  const [isLoading, setIsLoading] = useState({
    jobs: true,
    models: true,
    curriculum: true,
    datasets: true,
    sentiment: true,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("training");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Ask Aether assistant
  type AetherMsg = { role: "user" | "assistant"; text: string; ts: number };
  const [aetherOpen, setAetherOpen] = useState(false);
  const [aetherMsgs, setAetherMsgs] = useState<AetherMsg[]>([]);
  const [includeSignals, setIncludeSignals] = useState(true);
  const [includeTrades, setIncludeTrades] = useState(true);
  const [includeSentiment, setIncludeSentiment] = useState(false);
  const [includeRegime, setIncludeRegime] = useState(false);
  const [aetherInput, setAetherInput] = useState("");
  const [aetherLoading, setAetherLoading] = useState(false);
  const [aetherError, setAetherError] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("aether_convo");
      if (raw) setAetherMsgs(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem("aether_convo", JSON.stringify(aetherMsgs.slice(-20)));
    } catch {}
  }, [aetherMsgs]);

  // Enhanced training form state
  const [trainingForm, setTrainingForm] = useState({
    modelType: "forecast" as "forecast" | "rl_agent" | "sentiment" | "ensemble",
    coins: [] as string[],
    lookbackDays: 30,
    interval: "1h",
    algorithm: "LSTM",
    architecture:
      '{"layers": [128, 64, 32], "dropout": 0.3, "attention": true}',
    tuneFlag: false,
    callbackUrl: "",
    curriculumLevel: "simple" as "simple" | "volatile" | "multi_asset",
    environmentConfig:
      '{"reward_weights": {"profit": 0.7, "drawdown": 0.2, "duration": 0.1}}',
    riskProfile: "moderate" as "conservative" | "moderate" | "aggressive",
    datasetVersion: "latest",
  });

  // Model management state
  const [selectedModelId, setSelectedModelId] = useState("");
  const [founderApproval, setFounderApproval] = useState(false);
  const [rollbackToModelId, setRollbackToModelId] = useState("");

  // Enhanced algorithm options based on model type and AI training specification
  const algorithmOptions = {
    forecast: [
      "LSTM",
      "Transformer"
    ],
    rl_agent: [
      "PPO",
      "Recurrent PPO",
      "SAC"
    ],
    sentiment: [
      "FinBERT",
      "RoBERTa-Financial",
      "BERT-Base",
      "DistilBERT",
      "Custom-Financial",
    ],
    ensemble: [
      "Voting",
      "Stacking",
      "Bagging",
      "AdaBoost",
      "Gradient Boosting",
    ],
  };

  const availableCoins = [
    "BTC",
    "ETH",
    "ADA",
    "DOT",
    "LINK",
    "SOL",
    "MATIC",
    "AVAX",
    "ATOM",
    "UNI",
    "AAVE",
    "COMP",
  ];
  const intervalOptions = ["1m", "5m", "15m", "1h", "4h", "1d"];
  const riskProfiles = ["conservative", "moderate", "aggressive"];

  // API integration functions
  const fetchTrainingJobs = useCallback(async () => {
    try {
      const response = await apiFetch("/api/models/jobs");
      const data = await response.json();
      if (data.status === "success") {
        setTrainingJobs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch training jobs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch training jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, jobs: false }));
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const response = await apiFetch("/api/models/history");
      const data = await response.json();
      if (data.status === "success") {
        // history items contain reduced fields; we will refetch full models for rich cards if needed
        const fullResp = await apiFetch("/api/models");
        const full = await fullResp
          .json()
          .catch(() => ({ status: "", data: [] }));
        const map: Record<string, any> = {};
        if (full.status === "success") {
          for (const m of full.data) map[m.modelId] = m;
        }
        const merged = data.data.map((h: any) =>
          map[h.modelId]
            ? map[h.modelId]
            : {
                modelId: h.modelId,
                name: h.name,
                version: h.version,
                type: h.type,
                status: h.status,
                accuracy: 0,
                performance: {
                  sharpeRatio: h.metrics?.sharpeRatio || 0,
                  maxDrawdown: h.metrics?.maxDrawdown || 0,
                  winRate: h.metrics?.winRate || 0,
                  profitFactor: h.metrics?.profitFactor || 0,
                  sortino: h.metrics?.sortino || 0,
                  calmar: 0,
                  volatility: 0,
                  beta: 0,
                  alpha: 0,
                  informationRatio: 0,
                },
                algorithmInfo: {
                  name: "unknown",
                  architecture: {},
                  hyperparameters: {},
                },
                createdAt: h.createdAt,
                createdBy: "system",
                experiment: {
                  mlflowRunId: "",
                  dvcHash: "",
                  datasetVersion: "",
                  checksum: h.checksum,
                },
              },
        );
        setModels(merged);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      toast({
        title: "Error",
        description: "Failed to fetch models",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, models: false }));
    }
  }, []);

  const fetchCurriculum = useCallback(async () => {
    try {
      const response = await apiFetch("/api/models/curriculum");
      const data = await response.json();
      if (data.status === "success") {
        setCurriculumStages(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch curriculum:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, curriculum: false }));
    }
  }, []);

  const fetchDatasets = useCallback(async () => {
    try {
      const response = await apiFetch("/api/models/datasets");
      const data = await response.json();
      if (data.status === "success") {
        setDatasets(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch datasets:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, datasets: false }));
    }
  }, []);

  const fetchSentimentPipelines = useCallback(async () => {
    try {
      const response = await apiFetch("/api/models/sentiment-pipelines");
      const data = await response.json();
      if (data.status === "success") {
        setSentimentPipelines(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sentiment pipelines:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, sentiment: false }));
    }
  }, []);

  const [audit, setAudit] = useState<any[]>([]);
  const fetchAudit = useCallback(async () => {
    try {
      const r = await apiFetch('/api/models/audit');
      const j = await r.json();
      if (j.status === 'success') setAudit(j.data || []);
    } catch {}
  }, []);

  // Load all data on mount
  useEffect(() => {
    fetchTrainingJobs();
    fetchModels();
    fetchCurriculum();
    fetchDatasets();
    fetchSentimentPipelines();
    fetchAudit();
  }, [
    fetchTrainingJobs,
    fetchModels,
    fetchCurriculum,
    fetchDatasets,
    fetchSentimentPipelines,
    fetchAudit,
  ]);

  // Auto-refresh training jobs every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedTab === "training") {
        fetchTrainingJobs();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTab, fetchTrainingJobs]);

  // Start training job with comprehensive validation
  const startTraining = async () => {
    // Validation
    if (trainingForm.coins.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one coin to train on",
        variant: "destructive",
      });
      return;
    }

    if (trainingForm.lookbackDays < 1 || trainingForm.lookbackDays > 365) {
      toast({
        title: "Validation Error",
        description: "Lookback days must be between 1 and 365",
        variant: "destructive",
      });
      return;
    }

    try {
      JSON.parse(trainingForm.architecture);
    } catch {
      toast({
        title: "Invalid Architecture",
        description: "Please provide valid JSON for architecture configuration",
        variant: "destructive",
      });
      return;
    }

    if (trainingForm.modelType === "rl_agent") {
      try {
        JSON.parse(trainingForm.environmentConfig);
      } catch {
        toast({
          title: "Invalid Environment Config",
          description:
            "Please provide valid JSON for environment configuration",
          variant: "destructive",
        });
        return;
      }
    }

    if (trainingForm.callbackUrl && !isValidUrl(trainingForm.callbackUrl)) {
      toast({
        title: "Invalid Callback URL",
        description: "Please provide a valid HTTP/HTTPS URL",
        variant: "destructive",
      });
      return;
    }

    // Map to Project_Aether API schema
    const model_type = trainingForm.modelType === 'rl_agent' ? 'rl' : trainingForm.modelType === 'forecast' ? 'forecast' : trainingForm.modelType;

    // Guard unsupported types for backend training
    if (model_type !== 'forecast' && model_type !== 'rl') {
      toast({
        title: "Unsupported",
        description: "Backend training supports Forecast or RL models.",
        variant: "destructive",
      });
      return;
    }

    // Algorithm/architecture mapping
    const rlAlgoMap: Record<string, string> = {
      'PPO': 'ppo',
      'Recurrent PPO': 'recurrent_ppo',
      'SAC': 'sac',
    };
    const archMap: Record<string, 'lstm' | 'transformer'> = {
      'LSTM': 'lstm',
      'Transformer': 'transformer',
    } as const;

    const payload: any = {
      model_type,
      coin: trainingForm.coins.slice(0, 10),
      lookback_days: trainingForm.lookbackDays,
      interval: trainingForm.interval,
    };

    if (model_type === 'rl') {
      payload.algorithm = rlAlgoMap[trainingForm.algorithm] || 'ppo';
    } else {
      payload.architecture = archMap[trainingForm.algorithm] || 'lstm';
    }

    if (trainingForm.callbackUrl) payload.callback_url = trainingForm.callbackUrl;

    setIsProcessing(true);

    try {
      const response = await apiFetch(`/api/v1/models/train${trainingForm.tuneFlag ? '?tune=true' : ''}` as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        admin: true,
      });

      if (response.status === 422) {
        const err = await response.json();
        const fields = err.fields || {};
        const msgs = Object.entries(fields).map(([k,v])=> `${k}: ${v}`).join(', ');
        toast({ title: 'Validation Error', description: msgs || err.message || 'Invalid inputs', variant:'destructive' });
        setIsProcessing(false);
        return;
      }

      const data = await response.json();

      if (data.status === "success") {
        setIsTrainingDialogOpen(false);
        setTrainingForm({
          modelType: "forecast",
          coins: [],
          lookbackDays: 30,
          interval: "1h",
          algorithm: "LSTM",
          architecture: '{"layers": [128, 64, 32], "dropout": 0.3}',
          tuneFlag: false,
          callbackUrl: "",
          curriculumLevel: "simple",
          environmentConfig:
            '{"reward_weights": {"profit": 0.7, "drawdown": 0.2, "duration": 0.1}}',
          riskProfile: "moderate",
          datasetVersion: "latest",
        });

        toast({
          title: "Training Started",
          description: `${model_type.toUpperCase()} training initiated for ${trainingForm.coins.join(", ")}`,
        });

        // Refresh training jobs
        fetchTrainingJobs();
      } else {
        throw new Error(data.message || "Failed to start training");
      }
    } catch (error) {
      toast({
        title: "Training Failed",
        description:
          error instanceof Error ? error.message : "Failed to start training",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel training job
  const cancelTraining = async (jobId: string) => {
    if (!window.confirm(`Cancel training job ${jobId}?`)) return;
    try {
      const response = await apiFetch(`/api/models/train/${jobId}`, {
        method: "DELETE",
        admin: true,
      });

      const data = await response.json();

      if (data.status === "success") {
        toast({
          title: "Training Cancelled",
          description: "Training job has been cancelled successfully",
        });
        fetchTrainingJobs();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Cancel Failed",
        description:
          error instanceof Error ? error.message : "Failed to cancel training",
        variant: "destructive",
      });
    }
  };

  // Deploy model
  const deployModel = async (modelId: string) => {
    if (!founderApproval) {
      toast({
        title: "Approval Required",
        description: "Founder approval is required for model deployment",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await apiFetch(`/api/models/deploy/${modelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ founderApproval }),
        admin: true,
      });
      const data = await response.json();
      if (data.status === "success") {
        toast({ title: "Model Deployed", description: "Model deployed" });
        fetchModels();
        setFounderApproval(false);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Deployment Failed",
        description:
          error instanceof Error ? error.message : "Failed to deploy model",
        variant: "destructive",
      });
    }
  };

  const promoteModel = async (modelId: string) => {
    if (!window.confirm(`Promote model ${modelId} to production?`)) return;
    if (!founderApproval) {
      toast({
        title: "Approval Required",
        description: "Founder approval required for promotion",
        variant: "destructive",
      });
      return;
    }
    try {
      const r = await apiFetch("/api/models/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, founderApproval: true }),
        admin: true,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Failed");
      toast({ title: "Promoted", description: `Model ${modelId} promoted` });
      setFounderApproval(false);
      fetchModels();
      fetchAudit();
    } catch (e: any) {
      toast({
        title: "Promotion Failed",
        description: e.message || "Failed",
        variant: "destructive",
      });
    }
  };

  const startShadow = async (modelId: string) => {
    if (!window.confirm(`Start shadow for ${modelId}?`)) return;
    try {
      const r = await apiFetch("/api/models/shadow/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
        admin: true,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Failed");
      toast({ title: "Shadow Started", description: modelId });
      fetchModels();
      fetchAudit();
    } catch (e: any) {
      toast({
        title: "Shadow Failed",
        description: e.message || "Failed",
        variant: "destructive",
      });
    }
  };

  const stopShadow = async (modelId: string) => {
    if (!window.confirm(`Stop shadow for ${modelId}?`)) return;
    try {
      const r = await apiFetch("/api/models/shadow/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
        admin: true,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Failed");
      toast({ title: "Shadow Stopped", description: modelId });
      fetchModels();
      fetchAudit();
    } catch (e: any) {
      toast({
        title: "Shadow Stop Failed",
        description: e.message || "Failed",
        variant: "destructive",
      });
    }
  };

  const rollbackModel = async (fromModelId: string, toModelId: string) => {
    if (!toModelId) return;
    if (!window.confirm(`Rollback from ${fromModelId} to ${toModelId}?`)) return;
    if (!founderApproval) {
      toast({
        title: "Approval Required",
        description: "Founder approval required for rollback",
        variant: "destructive",
      });
      return;
    }
    try {
      const r = await apiFetch("/api/models/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromModelId, toModelId, founderApproval: true }),
        admin: true,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Failed");
      toast({
        title: "Rollback Complete",
        description: `${fromModelId} → ${toModelId}`,
      });
      setFounderApproval(false);
      fetchModels();
      fetchAudit();
    } catch (e: any) {
      toast({
        title: "Rollback Failed",
        description: e.message || "Failed",
        variant: "destructive",
      });
    }
  };

  // External tooling links
  const [mlflowUrl, setMlflowUrl] = useState<string>("");
  const [dvcUrl, setDvcUrl] = useState<string>("");
  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch('/api/config/runtime');
        const j = await r.json();
        const data = j?.data || {};
        setMlflowUrl(String(data['mlflow.ui_url'] || ''));
        setDvcUrl(String(data['dvc.registry_url'] || ''));
      } catch {}
    })();
  }, []);

  // Explainability panels state
  const [diagModelId, setDiagModelId] = useState<string>("");
  const [explainLoading, setExplainLoading] = useState(false);
  const [explain, setExplain] = useState<any | null>(null);
  const [shapInput, setShapInput] = useState<string>("");
  const [shapResult, setShapResult] = useState<any | null>(null);
  const [rationales, setRationales] = useState<any[]>([]);
  const [rationalesLoading, setRationalesLoading] = useState(false);

  const runExplain = async () => {
    if (!diagModelId) {
      toast({
        title: "Model ID required",
        description: "Enter a model id",
        variant: "destructive",
      });
      return;
    }
    setExplainLoading(true);
    try {
      const r = await apiFetch(
        `/api/models/explain/${encodeURIComponent(diagModelId)}`,
      );
      const j = await r.json();
      setExplain(j);
    } catch {
      toast({
        title: "Explain failed",
        description: "Request failed",
        variant: "destructive",
      });
    } finally {
      setExplainLoading(false);
    }
  };

  const runShap = async () => {
    if (!diagModelId) {
      toast({
        title: "Model ID required",
        description: "Enter a model id",
        variant: "destructive",
      });
      return;
    }
    try {
      const parsed = JSON.parse(shapInput || "[]");
      if (!Array.isArray(parsed) && typeof parsed !== "object")
        throw new Error("Input must be array or object");
      const r = await apiFetch(`/api/shap/${encodeURIComponent(diagModelId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsed }),
      });
      const text = await r.text();
      let j: any = {};
      if (text && text.trim().length) {
        try {
          j = JSON.parse(text);
        } catch {
          /* ignore parse error */
        }
      }
      if (!r.ok) throw new Error(j.detail || `HTTP ${r.status}`);
      const data = j.data || j;
      setShapResult(data);
      toast({
        title: "SHAP ready",
        description: `Request ${data?.request_id || ""}`,
      });
    } catch (e: any) {
      toast({
        title: "SHAP failed",
        description: e.message || "Failed",
        variant: "destructive",
      });
    }
  };

  // Utility functions
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-gray-100 text-gray-800",
      data_prep: "bg-blue-100 text-blue-800",
      forecasting: "bg-indigo-100 text-indigo-800",
      rl_training: "bg-yellow-100 text-yellow-800",
      backtesting: "bg-purple-100 text-purple-800",
      validation: "bg-cyan-100 text-cyan-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      deployed: "bg-green-100 text-green-800",
      shadow: "bg-blue-100 text-blue-800",
      archived: "bg-gray-100 text-gray-800",
      training: "bg-yellow-100 text-yellow-800",
      trained: "bg-green-100 text-green-800",
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      error: "bg-red-100 text-red-800",
      available: "bg-green-100 text-green-800",
      processing: "bg-yellow-100 text-yellow-800",
      locked: "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getAlgorithmOptions = () => {
    return (
      algorithmOptions[trainingForm.modelType] || algorithmOptions.forecast
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const copyToClipboard = async (text: string) => {
    const ok = await copy(text);
    toast({
      title: ok ? "Copied" : "Copy Failed",
      description: ok
        ? "Text copied to clipboard"
        : "Failed to copy to clipboard",
      variant: ok ? "default" : "destructive",
    });
  };

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case "forecast":
        return <TrendingUp className="h-4 w-4" />;
      case "rl_agent":
        return <Bot className="h-4 w-4" />;
      case "sentiment":
        return <MessageSquare className="h-4 w-4" />;
      case "ensemble":
        return <Layers className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "data_prep":
        return <Database className="h-4 w-4" />;
      case "forecasting":
        return <TrendingUp className="h-4 w-4" />;
      case "rl_training":
        return <Bot className="h-4 w-4" />;
      case "backtesting":
        return <BarChart3 className="h-4 w-4" />;
      case "validation":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (Object.values(isLoading).some((loading) => loading)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight inline-flex items-center gap-2">
              AI Model Management <HelpTip content="End-to-end workflows to train, evaluate, and deploy trading models with governance controls." />
            </h1>
            <p className="text-muted-foreground">
              Train, deploy and manage AI models for algorithmic trading with
              comprehensive workflow support
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchTrainingJobs();
                fetchModels();
                fetchCurriculum();
                fetchDatasets();
                fetchSentimentPipelines();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
            <Button className="rounded-full" variant="outline" onClick={() => setAetherOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Ask Aether
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" /> How to Train
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>How to Train the AI</DialogTitle>
                  <DialogDescription>
                    Step-by-step guide to configure, launch, and monitor training jobs.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-medium">Prerequisites</h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Ensure at least one dataset version is available under the Datasets tab.</li>
                      <li>Decide the model type: Forecast, Reinforcement Learning, Sentiment, or Ensemble.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium">Quick Start</h3>
                    <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                      <li>Click Start Training.</li>
                      <li>Choose Model Type and Algorithm.</li>
                      <li>Select Trading Pairs to learn on.</li>
                      <li>Set Lookback Days and Interval.</li>
                      <li>Pick Dataset Version and Risk Profile.</li>
                      <li>Paste/adjust Architecture JSON.</li>
                      <li>(RL only) Pick Curriculum Level and fill Environment Config JSON.</li>
                      <li>(Optional) Enable Hyperparameter Tuning and set a Callback URL.</li>
                      <li>Click Start Training and monitor progress in Training Jobs.</li>
                    </ol>
                  </div>
                  <div>
                    <h3 className="font-medium">Example Architecture JSON</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto"><code>{`{
  "layers": [128, 64, 32],
  "dropout": 0.3,
  "attention": true,
  "learning_rate": 0.0005
}`}</code></pre>
                  </div>
                  <div>
                    <h3 className="font-medium">Example RL Environment Config</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto"><code>{`{
  "reward_weights": { "profit": 0.7, "drawdown": 0.2, "duration": 0.1 },
  "max_position": 1.0,
  "transaction_cost": 0.0005
}`}</code></pre>
                  </div>
                  <div>
                    <h3 className="font-medium">Monitoring & Next Steps</h3>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Watch stage progress (Data Prep → Forecasting/RL → Backtesting → Validation).</li>
                      <li>Review metrics like Sharpe, Win Rate, Drawdown, and Total Reward.</li>
                      <li>Use Model Registry to inspect artifacts and experiment tracking details.</li>
                      <li>Before production, try Shadow mode to validate live behavior without impact.</li>
                      <li>Deploy/Promote requires founder approval; changes affect live trading.</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" data-radix-dialog-close>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isTrainingDialogOpen}
              onOpenChange={setIsTrainingDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Brain className="h-4 w-4 mr-2" />
                  Start Training
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="inline-flex items-center gap-2">Start AI Model Training <HelpTip content="Configure training parameters, datasets, and optional RL curriculum before launching the job." /></DialogTitle>
                  <DialogDescription>
                    Configure and launch a comprehensive training job with data
                    preprocessing, forecasting, RL policy search, and
                    backtesting
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                  {/* Model Type Selection with tooltips */}
                  <div className="grid grid-cols-4 gap-4">
                    <Label className="text-right self-center inline-flex items-center gap-2">Model Type <HelpTip content="Choose forecasting, reinforcement learning, sentiment, or an ensemble approach." /></Label>
                    <div className="col-span-3">
                      <Select
                        value={trainingForm.modelType}
                        onValueChange={(value: any) => {
                          setTrainingForm((prev) => ({
                            ...prev,
                            modelType: value,
                            algorithm: algorithmOptions[value][0],
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="forecast">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="h-4 w-4" />
                              <span>Price Forecasting Model</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="rl_agent">
                            <div className="flex items-center space-x-2">
                              <Bot className="h-4 w-4" />
                              <span>Reinforcement Learning Agent</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="sentiment">
                            <div className="flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4" />
                              <span>Sentiment Analysis Model</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ensemble">
                            <div className="flex items-center space-x-2">
                              <Layers className="h-4 w-4" />
                              <span>Ensemble Model</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Algorithm Selection */}
                  <div className="grid grid-cols-4 gap-4">
                    <Label className="text-right self-center inline-flex items-center gap-2">Algorithm <HelpTip content="Specific learning algorithm used by the model type (e.g., LSTM, PPO, FinBERT)." /></Label>
                    <div className="col-span-3">
                      <Select
                        value={trainingForm.algorithm}
                        onValueChange={(value) =>
                          setTrainingForm((prev) => ({
                            ...prev,
                            algorithm: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAlgorithmOptions().map((algo) => (
                            <SelectItem key={algo} value={algo}>
                              {algo}
                              {algo === "FinBERT" && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Financial)
                                </span>
                              )}
                              {algo === "PPO" && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Proximal Policy)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Asset Selection (multi-select with universe rotation) */}
                  <div className="grid grid-cols-4 gap-4">
                    <Label className="text-right self-start pt-2 inline-flex items-center gap-2">
                      Trading Pairs <HelpTip content="Assets to train on. Multi-asset RL agents can learn cross-market behavior." />
                    </Label>
                    <div className="col-span-3">
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {availableCoins.map((coin) => (
                          <div
                            key={coin}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={coin}
                              checked={trainingForm.coins.includes(coin)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setTrainingForm((prev) => ({
                                    ...prev,
                                    coins: [...prev.coins, coin],
                                  }));
                                } else {
                                  setTrainingForm((prev) => ({
                                    ...prev,
                                    coins: prev.coins.filter((c) => c !== coin),
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={coin} className="text-sm">
                              {coin}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select trading pairs for training. Multi-asset RL agents
                        can learn cross-asset correlations.
                      </p>
                    </div>
                  </div>

                  {/* Training Parameters */}
                  <div className="grid grid-cols-4 gap-4">
                    <Label className="text-right self-center inline-flex items-center gap-2">
                      Lookback Days <HelpTip content="History window used as input features for training (1–365)." />
                    </Label>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={trainingForm.lookbackDays}
                        onChange={(e) =>
                          setTrainingForm((prev) => ({
                            ...prev,
                            lookbackDays: parseInt(e.target.value) || 30,
                          }))
                        }
                        min="1"
                        max="365"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        1-365 days
                      </p>
                    </div>
                    <Label className="text-right self-center inline-flex items-center gap-2">Interval <HelpTip content="Sampling period for candles/features (e.g., 1h)." /></Label>
                    <div className="col-span-1">
                      <Select
                        value={trainingForm.interval}
                        onValueChange={(value) =>
                          setTrainingForm((prev) => ({
                            ...prev,
                            interval: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {intervalOptions.map((interval) => (
                            <SelectItem key={interval} value={interval}>
                              {interval}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Dataset and Curriculum */}
                  <div className="grid grid-cols-4 gap-4">
                    <Label className="text-right self-center inline-flex items-center gap-2">
                      Dataset Version <HelpTip content="Choose the DVC-versioned dataset used for training and evaluation." />
                    </Label>
                    <div className="col-span-1">
                      <Select
                        value={trainingForm.datasetVersion}
                        onValueChange={(value) =>
                          setTrainingForm((prev) => ({
                            ...prev,
                            datasetVersion: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {datasets.map((dataset) => (
                            <SelectItem
                              key={dataset.version}
                              value={dataset.version}
                            >
                              {dataset.version} ({dataset.size})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Label className="text-right self-center inline-flex items-center gap-2">
                      Risk Profile <HelpTip content="Controls aggressiveness of strategies (conservative, moderate, aggressive)." />
                    </Label>
                    <div className="col-span-1">
                      <Select
                        value={trainingForm.riskProfile}
                        onValueChange={(value: any) =>
                          setTrainingForm((prev) => ({
                            ...prev,
                            riskProfile: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conservative">
                            Conservative
                          </SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* RL Specific Options */}
                  {trainingForm.modelType === "rl_agent" && (
                    <>
                      <Separator />
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Reinforcement Learning Configuration
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <Label className="text-right self-center inline-flex items-center gap-2">
                          Curriculum Level <HelpTip content="Progressively harder environments for RL: simple → volatile → multi-asset." />
                        </Label>
                        <div className="col-span-3">
                          <Select
                            value={trainingForm.curriculumLevel}
                            onValueChange={(value: any) =>
                              setTrainingForm((prev) => ({
                                ...prev,
                                curriculumLevel: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">
                                Simple Market Patterns
                              </SelectItem>
                              <SelectItem value="volatile">
                                Volatile Market Conditions
                              </SelectItem>
                              <SelectItem value="multi_asset">
                                Multi-Asset Trading
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <Label className="text-right self-start pt-2 inline-flex items-center gap-2">
                          Environment Config <HelpTip content="JSON for RL environment and reward weights (profit, drawdown, duration, win rate)." />
                        </Label>
                        <div className="col-span-3">
                          <Textarea
                            value={trainingForm.environmentConfig}
                            onChange={(e) =>
                              setTrainingForm((prev) => ({
                                ...prev,
                                environmentConfig: e.target.value,
                              }))
                            }
                            placeholder="Environment and reward configuration JSON"
                            rows={3}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure reward weights: profit, drawdown,
                            duration, winRate
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Architecture Configuration */}
                  <div className="grid grid-cols-4 gap-4">
                    <Label className="text-right self-start pt-2 inline-flex items-center gap-2">
                      Architecture <HelpTip content="Model architecture JSON (layers, dropout, attention, learning rate, etc.)." />
                    </Label>
                    <div className="col-span-3">
                      <Textarea
                        value={trainingForm.architecture}
                        onChange={(e) =>
                          setTrainingForm((prev) => ({
                            ...prev,
                            architecture: e.target.value,
                          }))
                        }
                        placeholder="Model architecture configuration JSON"
                        rows={4}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Define layers, dropout, learning rate, and other
                        architecture parameters
                      </p>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="grid grid-cols-4 gap-4">
                    <Label className="text-right self-center inline-flex items-center gap-2">
                      Callback URL <HelpTip content="Optional webhook to be notified when training completes or fails." />
                    </Label>
                    <div className="col-span-2">
                      <Input
                        value={trainingForm.callbackUrl}
                        onChange={(e) =>
                          setTrainingForm((prev) => ({
                            ...prev,
                            callbackUrl: e.target.value,
                          }))
                        }
                        placeholder="Optional webhook URL for completion notification"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="tuning"
                          checked={trainingForm.tuneFlag}
                          onCheckedChange={(checked) =>
                            setTrainingForm((prev) => ({
                              ...prev,
                              tuneFlag: !!checked,
                            }))
                          }
                        />
                        <Label htmlFor="tuning" className="inline-flex items-center gap-2">Hyperparameter Tuning <HelpTip content="Run Optuna to search over hyperparameters; increases training time but can improve performance." /></Label>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsTrainingDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={startTraining} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Starting Training Pipeline...
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

        <Sheet open={aetherOpen} onOpenChange={setAetherOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[420px] p-0 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div className="font-medium">Ask Aether</div>
              </div>
              <div className="text-xs text-muted-foreground">Assistant can recommend training and deployment steps</div>
            </div>
            {aetherError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs border-b">{aetherError}</div>
            )}
            <div className="p-3 border-b grid grid-cols-2 gap-2 text-xs">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeSignals} onChange={e=>setIncludeSignals(e.target.checked)} /> Latest signals</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeTrades} onChange={e=>setIncludeTrades(e.target.checked)} /> Recent trades</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeSentiment} onChange={e=>setIncludeSentiment(e.target.checked)} /> Sentiment snapshot</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeRegime} onChange={e=>setIncludeRegime(e.target.checked)} /> Market regime</label>
            </div>
            <div className="p-2 border-b flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={()=>{ const blob = new Blob([JSON.stringify(aetherMsgs, null, 2)], { type:'application/json' }); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='aether_transcript.json'; a.click(); }}>Download JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={()=>{ const rows=["ts,role,text", ...aetherMsgs.map(m=>`${new Date(m.ts).toISOString()},${m.role},"${m.text.replace(/\"/g,'\"\"')}"`)]; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})); a.download='aether_transcript.csv'; a.click(); }}>Download CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {aetherMsgs.length===0 && (<div className="text-xs text-muted-foreground">Ask for training guidance, tuning suggestions, or deployment next steps.</div>)}
                {aetherMsgs.map((m, i)=> (
                  <div key={i} className={`flex ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role==='user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <div className="opacity-70 text-[10px] mb-1">{new Date(m.ts).toLocaleString()}</div>
                      <div>{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-3 border-t sticky bottom-0 bg-background">
              <div className="space-y-2">
                <textarea rows={3} className="w-full border rounded-md p-2 text-sm resize-y min-h-[72px]" placeholder="Type your question for Aether" value={aetherInput} onChange={e=>setAetherInput(e.target.value)} />
                <div className="flex justify-end">
                  <Button onClick={async()=>{
                    if (!aetherInput.trim()) return;
                    setAetherError(null);
                    const userMsg = { role: 'user' as const, text: aetherInput.trim(), ts: Date.now() };
                    setAetherMsgs(prev=> [...prev, userMsg].slice(-20));
                    setAetherInput('');
                    setAetherLoading(true);
                    try {
                      const r = await apiFetch('/api/v1/llm/ask', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ question: userMsg.text, includeSignals, includeTrades, includeSentiment, includeRegime }) });
                      const status = r.status;
                      const txt = await r.text();
                      let answer = '';
                      try { const j = JSON.parse(txt); answer = j.answer || j.output || j.message || j.content || txt; } catch { answer = txt; }
                      if (!r.ok) {
                        if (status===413) setAetherError('Request too large (token limit). Reduce context or shorten your question.');
                        else if (status===500) setAetherError('Server error: missing key or misconfiguration.');
                        else if (status===502) setAetherError('Upstream failure. Please retry.');
                        else setAetherError(`Error ${status}`);
                      } else {
                        const botMsg = { role: 'assistant' as const, text: answer || 'No response', ts: Date.now() };
                        setAetherMsgs(prev=> [...prev, botMsg].slice(-20));
                      }
                    } catch (e:any) {
                      setAetherError(e?.message || 'Network error');
                    } finally { setAetherLoading(false); }
                  }} disabled={aetherLoading}>
                    {aetherLoading ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Send</>) : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="training"><span className="inline-flex items-center gap-1">Training Jobs <HelpTip content="Launch and monitor training pipelines." /></span></TabsTrigger>
            <TabsTrigger value="models"><span className="inline-flex items-center gap-1">Model Registry <HelpTip content="Browse models, metrics, and deployment status." /></span></TabsTrigger>
            <TabsTrigger value="curriculum"><span className="inline-flex items-center gap-1">Curriculum <HelpTip content="RL stage progression and results." /></span></TabsTrigger>
            <TabsTrigger value="datasets"><span className="inline-flex items-center gap-1">Datasets <HelpTip content="Manage dataset versions and metadata." /></span></TabsTrigger>
            <TabsTrigger value="sentiment"><span className="inline-flex items-center gap-1">Sentiment <HelpTip content="Social/news ingestion pipelines and health." /></span></TabsTrigger>
            <TabsTrigger value="experiments"><span className="inline-flex items-center gap-1">Experiments <HelpTip content="MLflow tracking and reproducibility." /></span></TabsTrigger>
          </TabsList>

          {/* Training Jobs Tab - Enhanced with real-time workflow visualization */}
          <TabsContent value="training" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">Active Training Jobs <HelpTip content="Real-time view of training pipelines across data prep, forecasting/RL, backtesting, and validation." /></CardTitle>
                <CardDescription>
                  Monitor comprehensive AI model training workflows with data
                  preprocessing, forecasting, RL policy search, and validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trainingJobs.length > 0 ? (
                    trainingJobs.map((job) => (
                      <div
                        key={job.jobId}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        {/* Job Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getModelTypeIcon(job.modelType)}
                            <div>
                              <h3 className="font-medium flex items-center space-x-2">
                                <span>
                                  {job.algorithm} {job.modelType}
                                </span>
                                {job.tuneFlag && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    Tuning
                                  </Badge>
                                )}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {job.coins.join(", ")} • {job.lookbackDays} days
                                • {job.interval} • {job.jobId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(job.status)}>
                              {job.status.replace("_", " ")}
                            </Badge>
                            {[
                              "pending",
                              "data_prep",
                              "forecasting",
                              "rl_training",
                              "backtesting",
                              "validation",
                            ].includes(job.status) && (
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

                        {/* Training Pipeline Stages */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium inline-flex items-center gap-2">
                              Training Pipeline Progress <HelpTip content="Overall completion of the multi-stage training workflow." />
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {job.progress}% complete
                            </span>
                          </div>

                          <Progress value={job.progress} className="h-2" />

                          <div className="grid grid-cols-5 gap-2 text-xs">
                            {Object.entries(job.stages).map(
                              ([stageName, stage]) => (
                                <div key={stageName} className="text-center">
                                  <div
                                    className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${
                                      stage.status === "completed"
                                        ? "bg-green-100 text-green-600"
                                        : stage.status === "running"
                                          ? "bg-blue-100 text-blue-600"
                                          : stage.status === "pending"
                                            ? "bg-gray-100 text-gray-400"
                                            : "bg-gray-100 text-gray-400"
                                    }`}
                                  >
                                    {stage.status === "completed" ? (
                                      <CheckCircle className="h-4 w-4" />
                                    ) : stage.status === "running" ? (
                                      getStageIcon(stageName)
                                    ) : (
                                      <div className="w-2 h-2 rounded-full bg-current" />
                                    )}
                                  </div>
                                  <div className="capitalize font-medium">
                                    {stageName
                                      .replace(/([A-Z])/g, " $1")
                                      .trim()}
                                  </div>
                                  {stage.duration && (
                                    <div className="text-gray-500">
                                      {stage.duration}m
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        {/* Current Stage and Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Current Stage
                            </p>
                            <p className="text-sm font-medium">
                              {job.currentStage}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Runtime
                            </p>
                            <p className="text-sm font-medium">
                              {job.endTime
                                ? `${Math.round((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 60000)}m`
                                : `${Math.round((Date.now() - new Date(job.startTime).getTime()) / 60000)}m`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Dataset
                            </p>
                            <p className="text-sm font-medium">
                              {job.experiment.datasetVersion}
                            </p>
                          </div>
                          {job.experiment.mlflowRunId && (
                            <div>
                              <p className="text-xs text-muted-foreground">
                                MLflow Run
                              </p>
                              <Button
                                variant="link"
                                className="h-auto p-0 text-sm"
                                size="sm"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {job.experiment.mlflowRunId.slice(0, 8)}...
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Performance Metrics */}
                        {job.metrics && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted rounded-lg">
                            {job.metrics.sharpeRatio && (
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Sharpe Ratio
                                </p>
                                <p className="text-sm font-medium">
                                  {job.metrics.sharpeRatio.toFixed(2)}
                                </p>
                              </div>
                            )}
                            {job.metrics.winRate && (
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Win Rate
                                </p>
                                <p className="text-sm font-medium">
                                  {formatPercentage(job.metrics.winRate)}
                                </p>
                              </div>
                            )}
                            {job.metrics.maxDrawdown && (
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Max Drawdown
                                </p>
                                <p className="text-sm font-medium text-red-600">
                                  {formatPercentage(
                                    Math.abs(job.metrics.maxDrawdown),
                                  )}
                                </p>
                              </div>
                            )}
                            {job.metrics.totalReward && (
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Total Reward
                                </p>
                                <p className="text-sm font-medium text-green-600">
                                  {job.metrics.totalReward.toFixed(1)}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Curriculum Learning Progress */}
                        {job.curriculum && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium">
                                  Curriculum: {job.curriculum.level} (Stage{" "}
                                  {job.curriculum.stage})
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Win Ratio:{" "}
                                  {formatPercentage(
                                    job.curriculum.criteria.winRatio,
                                  )}{" "}
                                  /{" "}
                                  {formatPercentage(
                                    job.curriculum.criteria.targetWinRatio,
                                  )}{" "}
                                  target
                                </p>
                              </div>
                              {job.curriculum.criteria.passed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-600" />
                              )}
                            </div>
                            <Progress
                              value={
                                (job.curriculum.criteria.winRatio /
                                  job.curriculum.criteria.targetWinRatio) *
                                100
                              }
                              className="h-2"
                            />
                          </div>
                        )}

                        {/* Recent Logs */}
                        {job.logs.length > 0 && (
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium">
                                Recent Activity
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setSelectedJobId(
                                    selectedJobId === job.jobId
                                      ? null
                                      : job.jobId,
                                  )
                                }
                              >
                                {selectedJobId === job.jobId ? "Hide" : "Show"}{" "}
                                Logs
                              </Button>
                            </div>

                            {selectedJobId === job.jobId ? (
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {job.logs.slice(-10).map((log, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs p-2 bg-gray-50 rounded flex items-start space-x-2"
                                  >
                                    <span className="text-muted-foreground font-mono">
                                      {new Date(
                                        log.timestamp,
                                      ).toLocaleTimeString()}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {log.stage}
                                    </Badge>
                                    <span
                                      className={
                                        log.level === "error"
                                          ? "text-red-600"
                                          : log.level === "warning"
                                            ? "text-yellow-600"
                                            : ""
                                      }
                                    >
                                      {log.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {job.logs.slice(-3).map((log, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="text-muted-foreground">
                                      [{log.stage}]
                                    </span>{" "}
                                    {log.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Generated Model Link */}
                        {job.modelId && job.status === "completed" && (
                          <div className="border-t pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTab("models")}
                            >
                              <Rocket className="h-3 w-3 mr-1" />
                              View Generated Model: {job.modelId}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No training jobs running
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Start a new training job to begin
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Model Registry Tab - Enhanced with explainability and performance metrics */}
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">Model Registry <HelpTip content="Catalog of trained models with metrics, explainability, and deployment controls." /></CardTitle>
                <CardDescription>
                  Manage trained models with comprehensive performance metrics,
                  explainability, and deployment controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-4">
                    {models.length > 0 ? (
                      models.map((model) => (
                        <div
                          key={model.modelId}
                          className="border rounded-lg p-4 space-y-4"
                        >
                          {/* Model Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getModelTypeIcon(model.type)}
                              <div>
                                <h3 className="font-medium">{model.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {model.algorithmInfo.name} • v{model.version}{" "}
                                  • {model.type} •{" "}
                                  {formatPercentage(model.accuracy)} accuracy
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(model.status)}>
                                {model.status}
                              </Badge>
                              {model.status === "trained" && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Rocket className="h-3 w-3 mr-1" />
                                      Deploy
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Deploy Model to Production
                                      </DialogTitle>
                                      <DialogDescription>
                                        Deploy {model.name} to live trading
                                        environment with founder approval
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                      <Alert>
                                        <Shield className="h-4 w-4" />
                                        <AlertDescription>
                                          Deploying a model will replace the
                                          current production model and affect
                                          live trading.
                                        </AlertDescription>
                                      </Alert>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id="approval"
                                          checked={founderApproval}
                                          onCheckedChange={setFounderApproval}
                                        />
                                        <Label htmlFor="approval">
                                          I have founder approval for this
                                          deployment
                                        </Label>
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button
                                        onClick={() =>
                                          deployModel(model.modelId)
                                        }
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

                          {/* Enhanced Performance Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Sharpe Ratio
                              </p>
                              <p className="text-sm font-medium">
                                {model.performance.sharpeRatio.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Win Rate
                              </p>
                              <p className="text-sm font-medium">
                                {formatPercentage(model.performance.winRate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Max Drawdown
                              </p>
                              <p className="text-sm font-medium text-red-600">
                                {formatPercentage(
                                  Math.abs(model.performance.maxDrawdown),
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Sortino Ratio
                              </p>
                              <p className="text-sm font-medium">
                                {model.performance.sortino.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Profit Factor
                              </p>
                              <p className="text-sm font-medium text-green-600">
                                {model.performance.profitFactor.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Experiment Tracking and Reproduction */}
                          <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                MLflow Run
                              </p>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-sm"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  {model.experiment.mlflowRunId.slice(0, 12)}...
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() =>
                                    copyToClipboard(
                                      model.experiment.mlflowRunId,
                                    )
                                  }
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                DVC Hash
                              </p>
                              <div className="flex items-center space-x-1">
                                <p className="text-sm font-mono">
                                  {model.experiment.dvcHash}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() =>
                                    copyToClipboard(model.experiment.dvcHash)
                                  }
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Dataset Version
                              </p>
                              <p className="text-sm font-medium">
                                {model.experiment.datasetVersion}
                              </p>
                            </div>
                          </div>

                          {/* Model Explainability */}
                          {model.explainability && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">
                                  Model Explainability
                                </p>
                                <div className="flex space-x-1">
                                  {model.explainability.availableExplanations.map(
                                    (exp) => (
                                      <Badge
                                        key={exp}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {exp}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>
                              {model.explainability.featureImportance && (
                                <div className="text-xs space-y-1">
                                  <p className="font-medium">Top Features:</p>
                                  {model.explainability.featureImportance
                                    .slice(0, 3)
                                    .map((feature) => (
                                      <div
                                        key={feature.feature}
                                        className="flex justify-between"
                                      >
                                        <span>{feature.feature}</span>
                                        <span>
                                          {formatPercentage(feature.importance)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Model Actions */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                            {model.experiment.reproductionCommand && (
                              <Button variant="outline" size="sm">
                                <FileText className="h-3 w-3 mr-1" />
                                Reproduction
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Performance Report
                            </Button>
                            {model.status === "deployed" && (
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3 mr-1" />
                                Live Monitoring
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Rocket className="h-3 w-3 mr-1" />
                                  Promote
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Promote Model</DialogTitle>
                                  <DialogDescription>
                                    Promote {model.name} to production (founder
                                    supermajority enforced server-side)
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`prom_${model.modelId}`}
                                    checked={founderApproval}
                                    onCheckedChange={setFounderApproval}
                                  />
                                  <Label htmlFor={`prom_${model.modelId}`}>
                                    I have founder approval
                                  </Label>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => promoteModel(model.modelId)}
                                    disabled={!founderApproval}
                                  >
                                    Confirm Promote
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            {model.status !== "shadow" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startShadow(model.modelId)}
                              >
                                <Play className="h-3 w-3 mr-1" /> Start Shadow
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => stopShadow(model.modelId)}
                              >
                                <Square className="h-3 w-3 mr-1" /> Stop Shadow
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Rollback
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Rollback Model</DialogTitle>
                                  <DialogDescription>
                                    Select target model to rollback to
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3">
                                  <div>
                                    <Label>Rollback target</Label>
                                    <Select
                                      onValueChange={(v) =>
                                        setRollbackToModelId(v)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select model" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {models
                                          .filter(
                                            (m) => m.modelId !== model.modelId,
                                          )
                                          .map((m) => (
                                            <SelectItem
                                              key={m.modelId}
                                              value={m.modelId}
                                            >
                                              {m.name} (v{m.version})
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`rb_${model.modelId}`}
                                      checked={founderApproval}
                                      onCheckedChange={setFounderApproval}
                                    />
                                    <Label htmlFor={`rb_${model.modelId}`}>
                                      I have founder approval
                                    </Label>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() =>
                                      rollbackModel(
                                        model.modelId,
                                        rollbackToModelId,
                                      )
                                    }
                                    disabled={
                                      !rollbackToModelId || !founderApproval
                                    }
                                  >
                                    Confirm Rollback
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          No trained models available
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Complete a training job to see models here
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="font-medium inline-flex items-center gap-2">
                        Explainability & Diagnostics <HelpTip content="Inspect feature importance and compute SHAP values to understand model decisions." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="diagModel" className="inline-flex items-center gap-2">Model ID <HelpTip content="Enter the model identifier to analyze (e.g., model_001)." /></Label>
                        <Input
                          id="diagModel"
                          value={diagModelId}
                          onChange={(e) => setDiagModelId(e.target.value)}
                          placeholder="model_001"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={runExplain}
                            disabled={explainLoading}
                          >
                            Fetch Feature Importance
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              (async () => {
                                try {
                                  setRationalesLoading(true);
                                  const r = await apiFetch(
                                    "/api/strategies/explain",
                                  );
                                  const j = await r.json();
                                  setRationales(j.items || j || []);
                                } catch {
                                } finally {
                                  setRationalesLoading(false);
                                }
                              })();
                            }}
                          >
                            Load Strategy Rationales
                          </Button>
                        </div>
                        {explain && explain.features && (
                          <div className="text-xs p-2 bg-muted rounded">
                            <div className="font-medium mb-1">Top features</div>
                            {explain.features.slice(0, 5).map((f: any) => (
                              <div
                                key={f.name}
                                className="flex justify-between"
                              >
                                <span>{f.name}</span>
                                <span>{(f.importance * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Manual SHAP Input</Label>
                          <HelpTip content="Enter numeric features to compute SHAP values. Accepts array or object of numbers." />
                        </div>
                        <Textarea
                          rows={4}
                          value={shapInput}
                          onChange={(e) => setShapInput(e.target.value)}
                          placeholder="[1.2, 0.4, -0.1, 2.3]"
                        />
                        <div className="flex gap-2">
                          <Button onClick={runShap}>Run SHAP</Button>
                          {shapResult && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                const blob = new Blob(
                                  [JSON.stringify(shapResult, null, 2)],
                                  { type: "application/json" },
                                );
                                const a = document.createElement("a");
                                a.href = URL.createObjectURL(blob);
                                a.download = `shap_${diagModelId || "model"}.json`;
                                a.click();
                              }}
                            >
                              Download JSON
                            </Button>
                          )}
                        </div>
                        {shapResult && (
                          <div className="overflow-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr>
                                  <th className="text-left p-1">Feature</th>
                                  <th className="text-left p-1">SHAP</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(shapResult.features || []).map((f: any) => (
                                  <tr key={f.name} className="border-t">
                                    <td className="p-1">{f.name}</td>
                                    <td className="p-1">{f.shap}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Recent Strategy Rationales
                        </div>
                        {rationalesLoading ? (
                          <div className="text-xs text-muted-foreground">
                            Loading…
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs max-h-40 overflow-auto">
                            {rationales
                              .slice(0, 10)
                              .map((it: any, idx: number) => (
                                <div key={idx} className="border-t pt-1">
                                  <div className="font-medium">
                                    {it.strategy || it.name || "strategy"}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {it.reason || it.rationale || ""}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">Recent Model Actions <HelpTip content="Latest admin actions for training, deployment, shadow, and rollback." /></CardTitle>
                <CardDescription>
                  Server-side audit of sensitive model operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm text-muted-foreground">Showing latest {Math.min(200, audit.length)} events</div>
                  <Button variant="outline" size="sm" onClick={fetchAudit}>Refresh</Button>
                </div>
                <div className="text-xs space-y-1 max-h-64 overflow-auto">
                  {audit.length === 0 ? (
                    <div className="text-muted-foreground">No recent actions</div>
                  ) : (
                    audit.slice(0, 200).map((e: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 border-t pt-1">
                        <div><span className="font-mono">{new Date(e.at).toLocaleString()}</span></div>
                        <div className="col-span-2">{e.type}</div>
                        <div>{e.modelId || e.jobId || `${e.from || ''}${e.to ? '→'+e.to : ''}`}</div>
                        <div className="text-muted-foreground">{e.actor}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curriculum Tab - Enhanced with progress tracking */}
          <TabsContent value="curriculum" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">Curriculum Learning <HelpTip content="Stage-based RL training with advancement criteria like win ratio, drawdown, and Sharpe." /></CardTitle>
                <CardDescription>
                  Progressive training stages for reinforcement learning agents
                  with adaptive advancement criteria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {curriculumStages.map((stage, index) => (
                    <div key={stage.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              stage.status === "completed"
                                ? "bg-green-100 text-green-600"
                                : stage.status === "active"
                                  ? "bg-blue-100 text-blue-600"
                                  : stage.status === "failed"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {stage.status === "completed" ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : stage.status === "active" ? (
                              <Activity className="h-5 w-5" />
                            ) : stage.status === "failed" ? (
                              <XCircle className="h-5 w-5" />
                            ) : (
                              <span className="text-sm font-medium">
                                {index + 1}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{stage.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {stage.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={
                              stage.level === "simple"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : stage.level === "volatile"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {stage.level}
                          </Badge>
                          {stage.attempts && (
                            <Badge variant="secondary" className="text-xs">
                              {stage.attempts} attempts
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Curriculum Criteria */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Win Ratio Target
                          </p>
                          <p className="text-sm font-medium">
                            {formatPercentage(stage.criteria.winRatio)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Min Trades
                          </p>
                          <p className="text-sm font-medium">
                            {stage.criteria.minTrades}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Max Drawdown
                          </p>
                          <p className="text-sm font-medium">
                            {formatPercentage(stage.criteria.maxDrawdown)}
                          </p>
                        </div>
                        {stage.criteria.sharpeRatio && (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Sharpe Ratio
                            </p>
                            <p className="text-sm font-medium">
                              {stage.criteria.sharpeRatio.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Progress and Best Performance */}
                      {stage.progress !== undefined && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">
                              Progress
                            </span>
                            <span className="text-sm">{stage.progress}%</span>
                          </div>
                          <Progress value={stage.progress} />
                        </div>
                      )}

                      {stage.bestPerformance && (
                        <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Best Win Ratio
                            </p>
                            <p className="text-sm font-medium">
                              {formatPercentage(stage.bestPerformance.winRatio)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Best Sharpe
                            </p>
                            <p className="text-sm font-medium">
                              {stage.bestPerformance.sharpeRatio.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Total Trades
                            </p>
                            <p className="text-sm font-medium">
                              {stage.bestPerformance.totalTrades}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Datasets Tab - Enhanced with metadata and version control */}
          <TabsContent value="datasets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">Dataset Management <HelpTip content="DVC-versioned datasets with metadata, feature lists, and quality scoring." /></CardTitle>
                <CardDescription>
                  DVC-versioned datasets with comprehensive metadata and feature
                  tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {datasets.map((dataset) => (
                    <div
                      key={dataset.version}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      {/* Dataset Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Database className="h-5 w-5 text-primary" />
                          <div>
                            <h3 className="font-medium">
                              Dataset {dataset.version}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {dataset.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(dataset.status)}>
                            {dataset.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Download className="h-3 w-3 mr-1" />
                            DVC Pull
                          </Button>
                        </div>
                      </div>

                      {/* Dataset Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Size</p>
                          <p className="text-sm font-medium">{dataset.size}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Rows × Columns
                          </p>
                          <p className="text-sm font-medium">
                            {dataset.metadata.rows.toLocaleString()} ×{" "}
                            {dataset.metadata.columns}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Sampling Rate
                          </p>
                          <p className="text-sm font-medium">
                            {dataset.metadata.samplingRate}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Quality Score
                          </p>
                          <p className="text-sm font-medium">
                            {formatPercentage(dataset.metadata.qualityScore)}
                          </p>
                        </div>
                      </div>

                      {/* Time Range and Assets */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Time Range
                          </p>
                          <p className="text-sm font-medium">
                            {new Date(
                              dataset.timeRange.start,
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              dataset.timeRange.end,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Asset Coverage
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {dataset.metadata.assetCoverage.map((asset) => (
                              <Badge
                                key={asset}
                                variant="secondary"
                                className="text-xs"
                              >
                                {asset}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">
                          Features ({dataset.features.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {dataset.features.map((feature) => (
                            <Badge
                              key={feature}
                              variant="outline"
                              className="text-xs"
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Version Info */}
                      <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            DVC Hash
                          </p>
                          <div className="flex items-center space-x-1">
                            <p className="text-sm font-mono">
                              {dataset.dvcHash}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(dataset.dvcHash)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Creator
                          </p>
                          <p className="text-sm font-medium">
                            {dataset.versionInfo.creator}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {dataset.versionInfo.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Change Log */}
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1">
                          Change Log:
                        </p>
                        <p>{dataset.versionInfo.changeLog}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sentiment Ingestion Tab - Twitter and RSS pipelines */}
          <TabsContent value="sentiment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">Sentiment Ingestion Pipelines <HelpTip content="Ingest and score social/news data to augment models and generate signals." /></CardTitle>
                <CardDescription>
                  Monitor Twitter and RSS news feeds for sentiment analysis and
                  market signal generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sentimentPipelines.map((pipeline) => (
                    <div
                      key={pipeline.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      {/* Pipeline Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {pipeline.type === "twitter" ? (
                            <Twitter className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Rss className="h-5 w-5 text-orange-500" />
                          )}
                          <div>
                            <h3 className="font-medium capitalize">
                              {pipeline.type} Pipeline
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Processing {pipeline.config.processingModel} •{" "}
                              {pipeline.config.updateFrequency} updates
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(pipeline.status)}>
                            {pipeline.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            {pipeline.status === "active" ? (
                              <>
                                <Pause className="h-3 w-3 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Resume
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Pipeline Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Total Processed
                          </p>
                          <p className="text-sm font-medium">
                            {pipeline.stats.totalProcessed.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Avg Sentiment
                          </p>
                          <p
                            className={`text-sm font-medium ${
                              pipeline.stats.avgSentimentScore > 0
                                ? "text-green-600"
                                : pipeline.stats.avgSentimentScore < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                            }`}
                          >
                            {pipeline.stats.avgSentimentScore > 0 ? "+" : ""}
                            {pipeline.stats.avgSentimentScore.toFixed(3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Flagged Content
                          </p>
                          <p className="text-sm font-medium text-red-600">
                            {pipeline.stats.flaggedContent}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Last Updated
                          </p>
                          <p className="text-sm font-medium">
                            {new Date(
                              pipeline.stats.lastUpdated,
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Sources and Configuration */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Sources
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {pipeline.config.sources.map((source) => (
                              <Badge
                                key={source}
                                variant="outline"
                                className="text-xs"
                              >
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Processing Model
                          </p>
                          <Badge variant="secondary">
                            {pipeline.config.processingModel}
                          </Badge>
                        </div>
                      </div>

                      {/* Filter Rules */}
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">
                          Filter Rules
                        </p>
                        <div className="text-sm">
                          {Object.entries(pipeline.config.filterRules).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize">
                                  {key.replace("_", " ")}:
                                </span>
                                <span>{String(value)}</span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experiments Tab - MLflow integration */}
          <TabsContent value="experiments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">Experiment Tracking <HelpTip content="Track MLflow runs, datasets, and reproducibility artifacts for every experiment." /></CardTitle>
                <CardDescription>
                  MLflow experiments, DVC datasets, and reproducibility tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Beaker className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    MLflow Integration
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    All training experiments are automatically tracked in MLflow
                    with full reproducibility
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button onClick={() => mlflowUrl && window.open(mlflowUrl, '_blank')} disabled={!mlflowUrl}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open MLflow UI
                    </Button>
                    <Button variant="outline" onClick={() => dvcUrl && window.open(dvcUrl, '_blank')} disabled={!dvcUrl}>
                      <GitBranch className="h-4 w-4 mr-2" />
                      DVC Registry
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
