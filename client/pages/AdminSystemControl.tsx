import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface SystemState {
  isPaused: boolean;
  pausedBy?: string;
  pausedReason?: string;
  pausedAt?: string;
  mode: 'Simulation' | 'Dry-Run' | 'Live';
  changedBy?: string;
  changedAt?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  success: boolean;
}

export default function AdminSystemControl() {
  const [systemState, setSystemState] = useState<SystemState>({
    isPaused: false,
    mode: 'Live'
  });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [pauseActor, setPauseActor] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [resumeActor, setResumeActor] = useState('');
  const [resumeReason, setResumeReason] = useState('');
  const [selectedMode, setSelectedMode] = useState<'Simulation' | 'Dry-Run' | 'Live'>('Live');
  const [modeChangeActor, setModeChangeActor] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch system state
  const fetchSystemState = async () => {
    try {
      const response = await fetch('/api/system/status');
      const data = await response.json();
      if (data.status === 'success') {
        setSystemState(data.data);
        setSelectedMode(data.data.mode);
      }
    } catch (error) {
      console.error('Failed to fetch system state:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system state",
        variant: "destructive"
      });
    }
  };

  // Fetch audit log
  const fetchAuditLog = async () => {
    try {
      const response = await fetch('/api/system/audit');
      const data = await response.json();
      if (data.status === 'success') {
        setAuditLog(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchSystemState(), fetchAuditLog()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

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

    setIsProcessing(true);
    try {
      const response = await fetch('/api/system/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actor: pauseActor,
          reason: pauseReason || 'No reason provided'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setSystemState(data.data);
        toast({
          title: "System Paused",
          description: "System has been paused successfully",
        });
        setIsPauseDialogOpen(false);
        setPauseActor('');
        setPauseReason('');
        await fetchAuditLog();
      } else {
        throw new Error(data.message);
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

    setIsProcessing(true);
    try {
      const response = await fetch('/api/system/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actor: resumeActor,
          reason: resumeReason || 'System resumed'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setSystemState(data.data);
        toast({
          title: "System Resumed",
          description: "System has been resumed successfully",
        });
        setIsResumeDialogOpen(false);
        setResumeActor('');
        setResumeReason('');
        await fetchAuditLog();
      } else {
        throw new Error(data.message);
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
    if (!modeChangeActor.trim()) {
      toast({
        title: "Validation Error",
        description: "Actor field is required",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/system/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: selectedMode,
          actor: modeChangeActor
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setSystemState(data.data);
        toast({
          title: "Trading Mode Updated",
          description: `Trading mode changed to ${selectedMode}`,
        });
        setModeChangeActor('');
        await fetchAuditLog();
      } else {
        throw new Error(data.message);
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

  const getStatusBadge = () => {
    if (systemState.isPaused) {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <Pause className="h-3 w-3" />
          <span>Paused</span>
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-accent text-accent-foreground flex items-center space-x-1">
        <Activity className="h-3 w-3" />
        <span>Active</span>
      </Badge>
    );
  };

  const getModeBadge = (mode: string) => {
    const variants = {
      'Simulation': 'secondary',
      'Dry-Run': 'outline',
      'Live': 'default'
    } as const;
    
    return (
      <Badge variant={variants[mode as keyof typeof variants] || 'secondary'}>
        {mode}
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
          <h1 className="text-3xl font-bold tracking-tight">System Control</h1>
          <p className="text-muted-foreground">
            Manage system operations and trading modes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge()}
          {getModeBadge(systemState.mode)}
        </div>
      </div>

      {/* Global Status Banner */}
      {systemState.isPaused && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
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
        {/* System Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>System Control</span>
            </CardTitle>
            <CardDescription>
              Pause or resume system operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Current Status</div>
                <div className="text-sm text-muted-foreground">
                  {systemState.isPaused ? 'System is paused' : 'System is active'}
                </div>
              </div>
              {getStatusBadge()}
            </div>

            <div className="flex space-x-2">
              {systemState.isPaused ? (
                <Dialog open={isResumeDialogOpen} onOpenChange={setIsResumeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Resume System
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Resume System</DialogTitle>
                      <DialogDescription>
                        This will resume all system operations. Please provide details for the audit log.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="resumeActor">Actor (Required)</Label>
                        <Input
                          id="resumeActor"
                          placeholder="Your email or identifier"
                          value={resumeActor}
                          onChange={(e) => setResumeActor(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="resumeReason">Reason (Optional)</Label>
                        <Textarea
                          id="resumeReason"
                          placeholder="Reason for resuming the system"
                          value={resumeReason}
                          onChange={(e) => setResumeReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsResumeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleResumeSystem} disabled={isProcessing}>
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
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="flex-1">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause System
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pause System</DialogTitle>
                      <DialogDescription>
                        This will pause all system operations including trading. Please provide details for the audit log.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pauseActor">Actor (Required)</Label>
                        <Input
                          id="pauseActor"
                          placeholder="Your email or identifier"
                          value={pauseActor}
                          onChange={(e) => setPauseActor(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pauseReason">Reason (Optional)</Label>
                        <Textarea
                          id="pauseReason"
                          placeholder="Reason for pausing the system"
                          value={pauseReason}
                          onChange={(e) => setPauseReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handlePauseSystem} disabled={isProcessing}>
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
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trading Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Trading Mode</span>
            </CardTitle>
            <CardDescription>
              Configure the trading mode for the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Current Mode</div>
                <div className="text-sm text-muted-foreground">
                  {systemState.mode} trading mode
                </div>
              </div>
              {getModeBadge(systemState.mode)}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="modeSelect">Select Trading Mode</Label>
                <Select
                  value={selectedMode}
                  onValueChange={(value: 'Simulation' | 'Dry-Run' | 'Live') => setSelectedMode(value)}
                  disabled={systemState.isPaused}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trading mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Simulation">Simulation</SelectItem>
                    <SelectItem value="Dry-Run">Dry-Run</SelectItem>
                    <SelectItem value="Live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="modeActor">Actor (Required for changes)</Label>
                <Input
                  id="modeActor"
                  placeholder="Your email or identifier"
                  value={modeChangeActor}
                  onChange={(e) => setModeChangeActor(e.target.value)}
                  disabled={systemState.isPaused}
                />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    disabled={systemState.isPaused || selectedMode === systemState.mode || !modeChangeActor.trim() || isProcessing}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Set Trading Mode
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Trading Mode Change</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to change the trading mode from <strong>{systemState.mode}</strong> to <strong>{selectedMode}</strong>?
                      This action will be logged in the audit trail.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleModeChange}>
                      Confirm Change
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {systemState.isPaused && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Trading mode cannot be changed while the system is paused.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>System Audit Log</span>
          </CardTitle>
          <CardDescription>
            Recent system control actions and changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLog.length > 0 ? (
              auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {entry.success ? (
                      <CheckCircle className="h-4 w-4 text-accent" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{entry.action.replace('_', ' ')}</div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{entry.details}</div>
                    <div className="flex items-center space-x-1 mt-2 text-xs">
                      <User className="h-3 w-3" />
                      <span>{entry.actor}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No audit log entries found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
