import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Play,
  Pause,
  Shield,
  Activity,
  Clock,
  User,
  Settings,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FileText,
  Calendar,
  Skull,
  Eye,
  EyeOff,
  Power,
  Lock,
  Server,
  Wifi,
  WifiOff,
  TestTube,
  Save
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import HelpTip from '@/components/ui/help-tip';
import apiFetch from '@/lib/apiClient';

// Types
interface SystemState {
  isPaused: boolean;
  pausedBy?: string;
  pausedReason?: string;
  pausedAt?: string;
  mode: string;
  changedBy?: string;
  changedAt?: string;
  killSwitchEnabled: boolean;
  killSwitchBy?: string;
  killSwitchReason?: string;
  killSwitchAt?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  success: boolean;
}

const API_KEY = '';

export default function AdminSystemControl() {
  // System state
  const [systemState, setSystemState] = useState<SystemState>({
    isPaused: false,
    mode: 'live',
    killSwitchEnabled: false
  });
  
  // Audit log
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Pause/Resume form
  const [pauseActor, setPauseActor] = useState('admin@example.com');
  const [pauseReason, setPauseReason] = useState('');
  const [resumeActor, setResumeActor] = useState('admin@example.com');
  const [resumeReason, setResumeReason] = useState('');
  
  // Trading mode form
  const [selectedMode, setSelectedMode] = useState('live');
  const [modeActor, setModeActor] = useState('admin@example.com');
  const [modeReason, setModeReason] = useState('');
  
  // Kill switch form
  const [killSwitchActor, setKillSwitchActor] = useState('admin@example.com');
  const [killSwitchReason, setKillSwitchReason] = useState('');

  // Backend connection state
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('aether-backend-url') || window.location.origin;
  });
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'testing'>('unknown');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // API request helper with X-API-Key header
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${backendUrl.replace(/\/+$/, '')}${url}`;
    const response = await apiFetch(fullUrl, { ...options, admin: true, headers: options.headers });
    if (response.status === 401) throw new Error('API key required');
    if (response.status === 403) throw new Error('Insufficient permissions');
    if (response.status >= 500) throw new Error('Server error. Please try again.');
    return response;
  };

  // Fetch system mode (backend exposes mode; pause/kill-switch status not queryable)
  const fetchSystemState = async () => {
    try {
      const response = await apiRequest('/api/v1/system/mode');
      const data = await response.json().catch(() => ({} as any));
      if (response.ok) {
        const mode = data?.mode || systemState.mode;
        setSystemState((prev) => ({ ...prev, mode }));
        setSelectedMode(mode);
      }
    } catch (error) {
      console.error('Failed to fetch system state:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch system state');
    }
  };

  // Fetch current mode
  const fetchCurrentMode = async () => {
    try {
      const response = await apiRequest('/api/v1/system/mode');
      const data = await response.json().catch(() => ({} as any));
      if (response.ok) {
        const mode = data?.mode || systemState.mode;
        setSystemState(prev => ({ ...prev, mode }));
        setSelectedMode(mode);
      }
    } catch (error) {
      console.error('Failed to fetch trading mode:', error);
    }
  };

  // Audit log endpoint not available in backend; hiding this feature for now

  // Test backend connection
  const testBackendConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('testing');

    try {
      const testUrl = backendUrl.replace(/\/+$/, '') + '/api/v1/system/health/live';
      const response = await apiRequest(testUrl, {
        method: 'GET',
      });

      if (response.ok) {
        setConnectionStatus('connected');
        toast({
          title: "Connection Successful",
          description: `Successfully connected to backend at ${backendUrl}`,
        });
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to backend server",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Save backend URL
  const saveBackendUrl = () => {
    const cleanUrl = backendUrl.replace(/\/+$/, ''); // Remove trailing slashes
    setBackendUrl(cleanUrl);
    localStorage.setItem('aether-backend-url', cleanUrl);
    setConnectionStatus('unknown'); // Reset connection status when URL changes

    toast({
      title: "Backend URL Saved",
      description: `Backend URL updated to: ${cleanUrl}`,
    });
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchSystemState(),
          fetchCurrentMode()
        ]);
        setConnectionStatus('connected'); // If we can load data, we're connected
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setConnectionStatus('disconnected');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [backendUrl]); // Re-run when backend URL changes

  // Handle pause system
  const handlePauseSystem = async () => {
    if (!pauseActor.trim()) {
      toast({
        title: "Validation Error",
        description: "Actor field is required",
        variant: "destructive"
      });
      return;
    }

    if (pauseReason.length > 200) {
      toast({
        title: "Validation Error",
        description: "Reason must be 200 characters or less",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest('/api/v1/system/pause', {
        method: 'POST',
        body: JSON.stringify({
          actor: pauseActor,
          reason: pauseReason || undefined
        }),
      });

      if (response.ok) {
        setSystemState(prev => ({ ...prev, isPaused: true }));
        toast({
          title: "Success",
          description: "System paused",
        });
        setPauseReason('');
        await Promise.all([fetchSystemState()]);
      } else {
        const j = await response.json().catch(() => ({} as any));
        throw new Error(j?.message || 'Failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to pause system",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle resume system
  const handleResumeSystem = async () => {
    if (!resumeActor.trim()) {
      toast({
        title: "Validation Error",
        description: "Actor field is required",
        variant: "destructive"
      });
      return;
    }

    if (resumeReason.length > 200) {
      toast({
        title: "Validation Error",
        description: "Reason must be 200 characters or less",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest('/api/v1/system/resume', {
        method: 'POST',
        body: JSON.stringify({
          actor: resumeActor,
          reason: resumeReason || undefined
        }),
      });

      if (response.ok) {
        setSystemState(prev => ({ ...prev, isPaused: false }));
        toast({
          title: "Success",
          description: "System resumed",
        });
        setResumeReason('');
        await Promise.all([fetchSystemState()]);
      } else {
        const j = await response.json().catch(() => ({} as any));
        throw new Error(j?.message || 'Failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resume system",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle mode change
  const handleModeChange = async () => {
    if (!modeActor.trim()) {
      toast({
        title: "Validation Error",
        description: "Actor field is required",
        variant: "destructive"
      });
      return;
    }

    // Require reason when moving to live
    if (selectedMode.toLowerCase() === 'live' && !modeReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Reason is required when switching to live mode",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest('/api/v1/system/mode', {
        method: 'POST',
        body: JSON.stringify({
          mode: selectedMode,
          actor: modeActor,
          reason: modeReason || undefined
        }),
      });

      const data = await response.json().catch(() => ({} as any));
      if (response.ok) {
        const mode = data?.mode || selectedMode;
        setSystemState(prev => ({ ...prev, mode }));
        toast({
          title: "Success",
          description: `Trading mode set to ${mode}`,
        });
        setModeReason('');
        await Promise.all([fetchSystemState()]);
      } else {
        throw new Error(data?.message || 'Failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update trading mode",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle kill switch toggle
  const handleKillSwitchToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!killSwitchActor.trim()) {
        toast({
          title: "Validation Error",
          description: "Actor is required when enabling kill switch",
          variant: "destructive"
        });
        return;
      }

      if (!killSwitchReason.trim()) {
        toast({
          title: "Validation Error",
          description: "Reason is mandatory when enabling kill switch",
          variant: "destructive"
        });
        return;
      }

      if (killSwitchReason.length < 10) {
        toast({
          title: "Validation Error",
          description: "Reason must be at least 10 characters",
          variant: "destructive"
        });
        return;
      }
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest('/api/v1/admin/kill-switch', {
        method: 'POST',
        body: JSON.stringify({
          enabled,
          actor: killSwitchActor,
          reason: enabled ? killSwitchReason : undefined
        }),
      });

      const data = await response.json().catch(() => ({} as any));
      if (response.ok) {
        setSystemState(prev => ({ ...prev, killSwitchEnabled: !!data?.enabled }));
        toast({
          title: "Success",
          description: `Kill switch ${data?.enabled ? 'enabled' : 'disabled'}`,
          variant: data?.enabled ? "destructive" : "default"
        });
        if (!data?.enabled) {
          setKillSwitchReason('');
        }
        await Promise.all([fetchSystemState()]);
      } else {
        throw new Error(data?.message || 'Failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle kill switch",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Status badge helpers
  const getStatusBadge = () => {
    if (systemState.killSwitchEnabled) {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <Skull className="h-3 w-3" />
          <span>EMERGENCY</span>
        </Badge>
      );
    }
    
    if (systemState.isPaused) {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <Pause className="h-3 w-3" />
          <span>PAUSED</span>
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="bg-accent text-accent-foreground flex items-center space-x-1">
        <Activity className="h-3 w-3" />
        <span>ACTIVE</span>
      </Badge>
    );
  };

  const getModeBadge = (mode: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      'simulation': 'secondary',
      'dry-run': 'outline',
      'live': 'default'
    };
    
    return (
      <Badge variant={variants[mode.toLowerCase()] || 'secondary'}>
        {mode.toUpperCase()}
      </Badge>
    );
  };

  const getKillSwitchBadge = () => {
    return systemState.killSwitchEnabled ? (
      <Badge variant="destructive" className="flex items-center space-x-1">
        <Lock className="h-3 w-3" />
        <span>ENABLED</span>
      </Badge>
    ) : (
      <Badge variant="secondary" className="flex items-center space-x-1">
        <Power className="h-3 w-3" />
        <span>DISABLED</span>
      </Badge>
    );
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 flex items-center space-x-1">
            <Wifi className="h-3 w-3" />
            <span>CONNECTED</span>
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <WifiOff className="h-3 w-3" />
            <span>DISCONNECTED</span>
          </Badge>
        );
      case 'testing':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>TESTING</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <TestTube className="h-3 w-3" />
            <span>UNKNOWN</span>
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error === 'API key required' && 'API key required.'}
            {error === 'Insufficient permissions' && 'Insufficient permissions.'}
            {error.includes('Server error') && (
              <div className="space-y-2">
                <div>{error}</div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            )}
            {!['API key required', 'Insufficient permissions'].includes(error) && !error.includes('Server error') && error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">System Control</h1>
            <HelpTip content="Admin controls to pause/resume trading, switch trading modes, and trigger emergency stop (kill switch)." />
          </div>
          <p className="text-muted-foreground">
            Pause/resume trading, change global trading mode, and manage emergency controls
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Backend Connection Configuration */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Backend Server Connection</span>
            </CardTitle>
            <HelpTip content="Set which backend server this dashboard controls. Use Test Connection to verify reachability." />
          </div>
          <CardDescription>
            Configure the backend server URL for system operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-3">
              <div>
                <div className="flex items-center gap-2"><Label htmlFor="backendUrl">Backend Server URL</Label><HelpTip content="Full base URL of your control API, e.g., https://api.example.com" /></div>
                <Input
                  id="backendUrl"
                  placeholder="http://localhost:3001 or https://api.yourserver.com"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Enter the complete URL including protocol (http:// or https://)
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={testBackendConnection}
                  disabled={isTestingConnection || !backendUrl.trim()}
                >
                  {isTestingConnection ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
                <Button
                  onClick={saveBackendUrl}
                  disabled={!backendUrl.trim() || backendUrl === localStorage.getItem('aether-backend-url')}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save URL
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="mb-2">
                  {getConnectionBadge()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {connectionStatus === 'connected' && 'Backend is reachable'}
                  {connectionStatus === 'disconnected' && 'Cannot reach backend'}
                  {connectionStatus === 'testing' && 'Testing connection...'}
                  {connectionStatus === 'unknown' && 'Connection not tested'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status Banner */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>System Status</span>
            </CardTitle>
            <HelpTip content="Live status of trading mode, pause state, and emergency kill switch." />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium inline-flex items-center gap-1">Mode <HelpTip content="Trading mode: Simulation (paper), Dry-Run (no orders), or Live (real orders)." /></div>
                <div className="text-sm text-muted-foreground">Current trading mode</div>
              </div>
              {getModeBadge(systemState.mode)}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium inline-flex items-center gap-1">Status <HelpTip content="Paused stops strategy execution; Active means trading logic can run." /></div>
                <div className="text-sm text-muted-foreground">
                  {systemState.isPaused ? 'System paused' : 'System active'}
                </div>
              </div>
              {getStatusBadge()}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium inline-flex items-center gap-1">Kill Switch <HelpTip content="Emergency stop that immediately disables all trading. Requires justification to enable." /></div>
                <div className="text-sm text-muted-foreground">Emergency control status</div>
              </div>
              {getKillSwitchBadge()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency alerts */}
      {connectionStatus === 'disconnected' && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-semibold">Backend Connection Lost</div>
              <div className="text-sm">
                Unable to connect to the backend server at: {backendUrl}
              </div>
              <div className="text-sm">
                Please verify the URL is correct and the server is running, then test the connection.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {systemState.killSwitchEnabled && (
        <Alert variant="destructive">
          <Skull className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-semibold">EMERGENCY KILL SWITCH ACTIVATED</div>
              <div className="text-sm">
                Activated by {systemState.killSwitchBy} at {systemState.killSwitchAt ? new Date(systemState.killSwitchAt).toLocaleString() : 'Unknown time'}
              </div>
              {systemState.killSwitchReason && (
                <div className="text-sm">Reason: {systemState.killSwitchReason}</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {systemState.isPaused && !systemState.killSwitchEnabled && (
        <Alert variant="destructive">
          <Pause className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-semibold">System is currently paused</div>
              <div className="text-sm">
                Paused by {systemState.pausedBy} at {systemState.pausedAt ? new Date(systemState.pausedAt).toLocaleString() : 'Unknown time'}
              </div>
              {systemState.pausedReason && (
                <div className="text-sm">Reason: {systemState.pausedReason}</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pause/Resume Trading */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Pause/Resume Trading</span>
              </CardTitle>
              <HelpTip content="Temporarily stop or resume all strategy execution. Changes are recorded to the audit log." />
            </div>
            <CardDescription>
              Control system operations with audit trail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemState.isPaused ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2"><Label htmlFor="resumeActor">Actor (optional)</Label><HelpTip content="Who is performing this action (for audit trail)." /></div>
                  <Input
                    id="resumeActor"
                    placeholder="Your email or identifier"
                    value={resumeActor}
                    onChange={(e) => setResumeActor(e.target.value)}
                    disabled={systemState.killSwitchEnabled || connectionStatus === 'disconnected'}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2"><Label htmlFor="resumeReason">Reason (optional, max 200 chars)</Label><HelpTip content="Context for resuming trading helps reviewers understand why." /></div>
                  <Textarea
                    id="resumeReason"
                    placeholder="Reason for resuming the system"
                    value={resumeReason}
                    onChange={(e) => setResumeReason(e.target.value)}
                    maxLength={200}
                    disabled={systemState.killSwitchEnabled || connectionStatus === 'disconnected'}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {resumeReason.length}/200 characters
                  </div>
                </div>
                <Button
                  onClick={handleResumeSystem}
                  disabled={isProcessing || systemState.killSwitchEnabled || connectionStatus === 'disconnected'}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resuming...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume System
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2"><Label htmlFor="pauseActor">Actor (optional)</Label><HelpTip content="Who is pausing the system (for audit trail)." /></div>
                  <Input
                    id="pauseActor"
                    placeholder="Your email or identifier"
                    value={pauseActor}
                    onChange={(e) => setPauseActor(e.target.value)}
                    disabled={connectionStatus === 'disconnected'}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2"><Label htmlFor="pauseReason">Reason (optional, max 200 chars)</Label><HelpTip content="Why the system is being paused; add details for future review." /></div>
                  <Textarea
                    id="pauseReason"
                    placeholder="Reason for pausing the system"
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    maxLength={200}
                    disabled={connectionStatus === 'disconnected'}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {pauseReason.length}/200 characters
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={handlePauseSystem}
                  disabled={isProcessing || connectionStatus === 'disconnected'}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Pausing...
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause System
                    </>
                  )}
                </Button>
              </div>
            )}

            {connectionStatus === 'disconnected' && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  Pause/Resume controls disabled: Backend server is not connected.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Trading Mode Control */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Trading Mode Control</span>
              </CardTitle>
              <HelpTip content="Switch between Simulation (paper), Dry-Run (no orders), and Live (real orders). Live requires a reason." />
            </div>
            <CardDescription>
              Change the global trading mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2"><Label htmlFor="modeSelect">Mode Selector</Label><HelpTip content="Choose the environment in which strategies operate." /></div>
              <Select
                value={selectedMode}
                onValueChange={setSelectedMode}
                disabled={systemState.killSwitchEnabled || connectionStatus === 'disconnected'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trading mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulation">Simulation</SelectItem>
                  <SelectItem value="dry-run">Dry-Run</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center gap-2"><Label htmlFor="modeActor">Actor (optional)</Label><HelpTip content="Who is changing the mode (captured in audit)." /></div>
              <Input
                id="modeActor"
                placeholder="Your email or identifier"
                value={modeActor}
                onChange={(e) => setModeActor(e.target.value)}
                disabled={systemState.killSwitchEnabled || connectionStatus === 'disconnected'}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="modeReason">Reason {selectedMode.toLowerCase() === 'live' && '(required for live mode)'}</Label>
                <HelpTip content="Document why the mode is changing; mandatory when switching to Live to ensure accountability." />
              </div>
              <Textarea
                id="modeReason"
                placeholder="Reason for changing trading mode"
                value={modeReason}
                onChange={(e) => setModeReason(e.target.value)}
                disabled={systemState.killSwitchEnabled || connectionStatus === 'disconnected'}
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  disabled={
                    isProcessing ||
                    systemState.killSwitchEnabled ||
                    connectionStatus === 'disconnected' ||
                    selectedMode === systemState.mode ||
                    (selectedMode.toLowerCase() === 'live' && !modeReason.trim())
                  }
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Set Mode
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Trading Mode Change</AlertDialogTitle>
                  <AlertDialogDescription>
                    Change trading mode from <strong>{systemState.mode.toUpperCase()}</strong> to <strong>{selectedMode.toUpperCase()}</strong>?
                  </AlertDialogDescription>
                  {selectedMode.toLowerCase() === 'live' && (
                    <div className="mt-2 p-2 bg-yellow-100 rounded border border-yellow-300">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      <strong>Warning:</strong> Switching to live mode will enable real trading.
                    </div>
                  )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleModeChange}>
                    Confirm Change
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {connectionStatus === 'disconnected' && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  Controls disabled: Backend server is not connected.
                </AlertDescription>
              </Alert>
            )}

            {systemState.isPaused && connectionStatus !== 'disconnected' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: System is paused but mode changes are allowed.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emergency Kill Switch */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Skull className="h-5 w-5" />
              <span>Emergency Kill Switch</span>
            </CardTitle>
            <HelpTip content="Emergency stop that blocks all trading instantly. Enabling requires an actor and a sufficiently detailed reason." />
          </div>
          <CardDescription>
            Immediately halt all trading operations. Use only in emergency situations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <div className="font-medium inline-flex items-center gap-1">Kill Switch Status <HelpTip content="Shows whether the emergency stop is currently active." /></div>
              <div className="text-sm text-muted-foreground">
                {systemState.killSwitchEnabled ? 'All trading disabled' : 'Trading allowed'}
              </div>
            </div>
            <Switch
              checked={systemState.killSwitchEnabled}
              onCheckedChange={handleKillSwitchToggle}
              disabled={isProcessing || connectionStatus === 'disconnected'}
            />
          </div>

          {!systemState.killSwitchEnabled && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2"><Label htmlFor="killSwitchActor">Actor (required for enabling)</Label><HelpTip content="Who is enabling the kill switch (mandatory for audit)." /></div>
                <Input
                  id="killSwitchActor"
                  placeholder="Your email or identifier"
                  value={killSwitchActor}
                  onChange={(e) => setKillSwitchActor(e.target.value)}
                  disabled={connectionStatus === 'disconnected'}
                />
              </div>
              <div>
                <div className="flex items-center gap-2"><Label htmlFor="killSwitchReason">Reason (mandatory when enabling, min 10 chars)</Label><HelpTip content="Explain the emergency clearly; minimum 10 characters to avoid vague entries." /></div>
                <Textarea
                  id="killSwitchReason"
                  placeholder="Emergency reason for activating kill switch"
                  value={killSwitchReason}
                  onChange={(e) => setKillSwitchReason(e.target.value)}
                  disabled={connectionStatus === 'disconnected'}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {killSwitchReason.length} characters (minimum 10 required)
                </div>
              </div>
            </div>
          )}

          {connectionStatus === 'disconnected' && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Kill switch controls disabled: Backend server is not connected.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
