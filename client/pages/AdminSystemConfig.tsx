import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings,
  Save,
  Search,
  RefreshCw,
  AlertTriangle,
  Database,
  Eye,
  Plus,
  Trash2,
  RotateCcw,
  FileText,
  ExternalLink
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import apiFetch from "@/lib/apiClient";

// Types
interface RuntimeConfig {
  [key: string]: string | number | boolean;
}

interface SystemSettings {
  [key: string]: any;
}

interface EffectiveConfig {
  runtime: RuntimeConfig;
  system: any;
  derived: {
    RISK_TIER_DEFAULTS: any;
    ASC: any;
  };
  metadata: {
    last_reload: string;
    config_version: string;
    environment: string;
  };
}

interface ConfigError {
  key: string;
  message: string;
}

export default function AdminSystemConfig() {
  // Runtime Configuration State
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>({});
  const [originalRuntimeConfig, setOriginalRuntimeConfig] = useState<RuntimeConfig>({});
  const [runtimeSearchTerm, setRuntimeSearchTerm] = useState('');
  const [runtimeErrors, setRuntimeErrors] = useState<ConfigError[]>([]);
  
  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({});
  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingValue, setNewSettingValue] = useState('');
  const [resetConfirmation, setResetConfirmation] = useState('');
  
  // Utility State
  const [effectiveConfig, setEffectiveConfig] = useState<EffectiveConfig | null>(null);
  const [isEffectiveDialogOpen, setIsEffectiveDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [confirmRuntimeOpen, setConfirmRuntimeOpen] = useState(false);
  const [confirmSystemOpen, setConfirmSystemOpen] = useState(false);
  const [runtimeDiff, setRuntimeDiff] = useState<Array<{key:string; from:any; to:any}>>([]);
  const [systemDiff, setSystemDiff] = useState<Array<{key:string; from:any; to:any}>>([]);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Available config keys for dropdown (mock - in production would come from Config.__annotations__)
  const AVAILABLE_CONFIG_KEYS = [
    'trading.max_position_size',
    'trading.risk_limit_percent',
    'trading.stop_loss_percent',
    'api.rate_limit_per_minute',
    'system.maintenance_mode',
    'logging.level',
    'monitoring.alert_threshold',
    'cache.ttl_seconds',
    // External tooling endpoints
    'mlflow.ui_url',
    'dvc.registry_url'
  ];

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [runtimeRes, systemRes] = await Promise.all([
          apiFetch('/api/config/runtime'),
          apiFetch('/api/config')
        ]);

        const [runtimeData, systemData] = await Promise.all([
          runtimeRes.json(),
          systemRes.json()
        ]);

        if (runtimeData.status === 'success') {
          setRuntimeConfig(runtimeData.data);
          setOriginalRuntimeConfig(runtimeData.data);
        }
        
        if (systemData.status === 'success') {
          setSystemSettings(systemData.data);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
        toast({
          title: "Error",
          description: "Failed to load configuration data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const computeRuntimeDiff = () => {
    const diffs: Array<{key:string; from:any; to:any}> = [];
    for (const k of Object.keys({ ...originalRuntimeConfig, ...runtimeConfig })) {
      const a = (originalRuntimeConfig as any)[k];
      const b = (runtimeConfig as any)[k];
      if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ key:k, from:a, to:b });
    }
    setRuntimeDiff(diffs);
    return diffs;
  };

  // Runtime Configuration Functions
  const handleRuntimeValueChange = (key: string, value: string) => {
    const originalValue = originalRuntimeConfig[key];
    let parsedValue: any = value;

    // Auto-type the input based on original value type
    if (typeof originalValue === 'boolean') {
      parsedValue = value === 'true';
    } else if (typeof originalValue === 'number') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        setRuntimeErrors(prev => [...prev.filter(e => e.key !== key), {
          key,
          message: 'Invalid number format'
        }]);
        return;
      }
    }

    // Clear any existing errors for this key
    setRuntimeErrors(prev => prev.filter(e => e.key !== key));
    
    setRuntimeConfig(prev => ({
      ...prev,
      [key]: parsedValue
    }));
  };

  const hasRuntimeChanges = () => {
    return JSON.stringify(runtimeConfig) !== JSON.stringify(originalRuntimeConfig);
  };

  const handleSaveRuntimeChanges = async () => {
    if (runtimeErrors.length > 0) {
      toast({ title: 'Validation Error', description: 'Please fix all errors before saving', variant: 'destructive' });
      return;
    }
    const diffs = computeRuntimeDiff();
    if (diffs.length === 0) {
      toast({ title: 'No changes', description: 'Nothing to save' });
      return;
    }
    setConfirmRuntimeOpen(true);
  };

  const applyRuntimeChanges = async () => {
    setIsProcessing(true);
    try {
      const response = await apiFetch('/api/config/runtime', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: runtimeConfig, actor: 'admin@example.com' }),
      });
      const data = await response.json();
      if (response.status === 422) {
        if (data.unknownKeys) {
          setRuntimeErrors(data.unknownKeys.map((key: string) => ({ key, message: 'Unknown configuration key' })));
        }
        toast({ title: 'Validation Error', description: data.message || 'Invalid configuration values', variant: 'destructive' });
        return;
      }
      if (response.status === 404) {
        toast({ title: 'Error', description: 'Unknown setting', variant: 'destructive' });
        return;
      }
      if (data.status === 'success') {
        setRuntimeConfig(data.data);
        setOriginalRuntimeConfig(data.data);
        setRuntimeErrors([]);
        setConfirmRuntimeOpen(false);
        toast({ title: 'Success', description: 'Runtime configuration updated successfully' });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update configuration', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReloadConfig = async () => {
    setIsReloading(true);
    try {
      const response = await apiFetch('/api/config/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'admin@example.com' }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setRuntimeConfig(data.data);
        setOriginalRuntimeConfig(data.data);
        toast({
          title: "Success",
          description: "Configuration reloaded successfully"
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reload configuration",
        variant: "destructive"
      });
    } finally {
      setIsReloading(false);
    }
  };

  const handleViewEffectiveConfig = async () => {
    try {
      const response = await apiFetch('/api/config/effective');
      const data = await response.json();
      
      if (data.status === 'success') {
        setEffectiveConfig(data.data);
        setIsEffectiveDialogOpen(true);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch effective configuration",
        variant: "destructive"
      });
    }
  };

  // System Settings Functions
  const handleAddSetting = () => {
    if (!newSettingKey || !newSettingValue) {
      toast({
        title: "Validation Error",
        description: "Both key and value are required",
        variant: "destructive"
      });
      return;
    }

    if (!AVAILABLE_CONFIG_KEYS.includes(newSettingKey)) {
      toast({
        title: "Validation Error",
        description: "Invalid configuration key",
        variant: "destructive"
      });
      return;
    }

    setSystemSettings(prev => ({
      ...prev,
      [newSettingKey]: newSettingValue
    }));

    setNewSettingKey('');
    setNewSettingValue('');
  };

  const handleUpdateSetting = (key: string, value: any) => {
    setSystemSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRemoveSetting = (key: string) => {
    setSystemSettings(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  };

  const handleSaveSystemSettings = async () => {
    setConfirmSystemOpen(true);
  };

  const applySystemSettings = async () => {
    setIsProcessing(true);
    try {
      const response = await apiFetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: systemSettings, actor: 'admin@example.com' }),
      });
      const data = await response.json();
      if (response.status === 400) {
        toast({ title: 'Validation Error', description: data.message || 'Invalid configuration keys', variant: 'destructive' });
        return;
      }
      if (data.status === 'success') {
        setSystemSettings(data.data);
        setConfirmSystemOpen(false);
        toast({ title: 'Success', description: 'System settings updated successfully' });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update system settings', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSystemSettings = async () => {
    if (resetConfirmation !== 'RESET') {
      toast({
        title: "Validation Error",
        description: 'Type "RESET" to confirm',
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiFetch('/api/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: resetConfirmation,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setSystemSettings(data.data);
        setResetConfirmation('');
        toast({
          title: "Success",
          description: "System settings reset to defaults"
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset system settings",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Utility Functions
  const openBulkEditor = () => {
    setBulkJson(JSON.stringify(runtimeConfig, null, 2));
    setIsBulkDialogOpen(true);
  };

  const applyBulkJson = async () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Payload must be an object');
      const invalid = Object.keys(parsed).find(k => !k.split('.').every(seg => /^[a-z0-9]+(_[a-z0-9]+)*$/.test(seg)));
      if (invalid) { toast({ title:'Validation', description:`Invalid key: ${invalid} (snake_case segments required)`, variant:'destructive' }); return; }
      setRuntimeConfig(parsed);
      setIsBulkDialogOpen(false);
      toast({ title:'Loaded', description:'Bulk JSON applied locally. Confirm to save.' });
    } catch (e:any) {
      toast({ title:'Invalid JSON', description: e.message || 'Parse error', variant:'destructive' });
    }
  };

  const renderConfigValue = (key: string, value: any, onChange?: (value: string) => void) => {
    const error = runtimeErrors.find(e => e.key === key);
    
    if (typeof value === 'boolean') {
      return onChange ? (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={value}
            onCheckedChange={(checked) => onChange(String(checked))}
          />
          <span className="text-sm">{String(value)}</span>
        </div>
      ) : (
        <Badge variant={value ? 'default' : 'secondary'}>{String(value)}</Badge>
      );
    }

    if (typeof value === 'number') {
      return onChange ? (
        <div className="space-y-1">
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'border-red-500' : ''}
          />
          {error && <p className="text-xs text-red-500">{error.message}</p>}
        </div>
      ) : (
        <Badge variant="outline">{value}</Badge>
      );
    }

    return onChange ? (
      <div className="space-y-1">
        <Input
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className={error ? 'border-red-500' : ''}
        />
        {error && <p className="text-xs text-red-500">{error.message}</p>}
      </div>
    ) : (
      <span className="text-sm">{String(value)}</span>
    );
  };

  const filteredRuntimeConfig = Object.entries(runtimeConfig).filter(([key]) =>
    key.toLowerCase().includes(runtimeSearchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground">
            Manage runtime configuration and persistent system settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReloadConfig} disabled={isReloading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isReloading ? 'animate-spin' : ''}`} />
            Reload Config
          </Button>
          <Button variant="outline" onClick={handleViewEffectiveConfig}>
            <Eye className="h-4 w-4 mr-2" />
            View Effective Config
          </Button>
        </div>
      </div>

      <Tabs defaultValue="runtime" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="runtime">Runtime Configuration</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="utility">Utility Controls</TabsTrigger>
        </TabsList>

        {/* Runtime Configuration Tab */}
        <TabsContent value="runtime" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Runtime Configuration</span>
                  </CardTitle>
                  <CardDescription>
                    Read and edit non-sensitive runtime values. Changes persist until next reload.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={openBulkEditor}>
                    <FileText className="h-4 w-4 mr-2" />
                    Bulk JSON Edit
                  </Button>
                  <Button
                    onClick={handleSaveRuntimeChanges}
                    disabled={!hasRuntimeChanges() || isProcessing || runtimeErrors.length > 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search configuration keys..."
                  value={runtimeSearchTerm}
                  onChange={(e) => setRuntimeSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {runtimeErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please fix validation errors before saving
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {filteredRuntimeConfig.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="font-mono text-sm">{key}</Label>
                    </div>
                    <div className="w-48">
                      {renderConfigValue(key, value, (newValue) => handleRuntimeValueChange(key, newValue))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>System Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Persisted configuration overrides stored in database (user_id="system")
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={handleSaveSystemSettings} disabled={isProcessing}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset System Settings</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all persisted settings and revert to defaults. 
                          Type "RESET" to confirm.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Type RESET to confirm"
                          value={resetConfirmation}
                          onChange={(e) => setResetConfirmation(e.target.value)}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setResetConfirmation('')}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleResetSystemSettings}
                          disabled={resetConfirmation !== 'RESET' || isProcessing}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Reset Settings
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Label htmlFor="newKey">Setting Key</Label>
                  <Select value={newSettingKey} onValueChange={setNewSettingKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a setting key" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_CONFIG_KEYS.filter(key => !systemSettings.hasOwnProperty(key)).map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="newValue">Value</Label>
                  <Input
                    id="newValue"
                    value={newSettingValue}
                    onChange={(e) => setNewSettingValue(e.target.value)}
                    placeholder="Enter value"
                  />
                </div>
                <Button onClick={handleAddSetting} disabled={!newSettingKey || !newSettingValue}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Setting
                </Button>
              </div>

              <div className="space-y-3">
                {Object.entries(systemSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="font-mono text-sm">{key}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-48">
                        <Input
                          value={String(value)}
                          onChange={(e) => handleUpdateSetting(key, e.target.value)}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveSetting(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utility Controls Tab */}
        <TabsContent value="utility" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5" />
                  <span>Configuration Control</span>
                </CardTitle>
                <CardDescription>
                  Reload configuration and view effective settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    onClick={handleReloadConfig} 
                    disabled={isReloading}
                    className="w-full"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isReloading ? 'animate-spin' : ''}`} />
                    Reload Configuration
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Reload configuration from files and refresh all clients
                  </p>
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline"
                    onClick={handleViewEffectiveConfig}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Effective Config
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Display runtime values plus derived data (RISK_TIER_DEFAULTS, ASC)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Documentation</span>
                </CardTitle>
                <CardDescription>
                  Access configuration documentation and help
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Configuration Guide
                </Button>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  API Documentation
                </Button>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Best Practices
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Runtime Save Confirmation */}
      <Dialog open={confirmRuntimeOpen} onOpenChange={setConfirmRuntimeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Runtime Changes</DialogTitle>
            <DialogDescription>Review differences before applying.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-auto text-sm">
            {runtimeDiff.length === 0 ? (
              <div>No changes detected.</div>
            ) : (
              <div className="space-y-2">
                {runtimeDiff.map((d)=> (
                  <div key={d.key} className="border rounded p-2">
                    <div className="font-mono text-xs">{d.key}</div>
                    <div className="text-xs"><span className="text-muted-foreground">from</span>: {JSON.stringify(d.from)}</div>
                    <div className="text-xs"><span className="text-muted-foreground">to</span>: {JSON.stringify(d.to)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=> setConfirmRuntimeOpen(false)}>Cancel</Button>
            <Button onClick={applyRuntimeChanges} disabled={isProcessing}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* System Save Confirmation */}
      <Dialog open={confirmSystemOpen} onOpenChange={setConfirmSystemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm System Settings</DialogTitle>
            <DialogDescription>Submit staged overrides to persistence.</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">Proceed to save settings. Backend validation errors will be shown verbatim.</div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={()=> setConfirmSystemOpen(false)}>Cancel</Button>
            <Button onClick={applySystemSettings} disabled={isProcessing}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk JSON Editor */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk JSON Editor (Runtime)</DialogTitle>
            <DialogDescription>Paste/edit JSON object. Keys must be dot-separated snake_case segments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <textarea value={bulkJson} onChange={(e)=> setBulkJson(e.target.value)} className="w-full h-72 font-mono text-sm p-2 border rounded" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> setIsBulkDialogOpen(false)}>Cancel</Button>
              <Button onClick={applyBulkJson}>Load to Form</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Effective Configuration Dialog */}
      <Dialog open={isEffectiveDialogOpen} onOpenChange={setIsEffectiveDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Effective Configuration</DialogTitle>
            <DialogDescription>
              Complete configuration view including runtime values and derived data
            </DialogDescription>
          </DialogHeader>
          {effectiveConfig && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Runtime Configuration</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="text-sm">{JSON.stringify(effectiveConfig.runtime, null, 2)}</pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">System Configuration</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="text-sm">{JSON.stringify(effectiveConfig.system, null, 2)}</pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Risk Tier Defaults</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="text-sm">{JSON.stringify(effectiveConfig.derived.RISK_TIER_DEFAULTS, null, 2)}</pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Algorithmic Strategy Config (ASC)</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="text-sm">{JSON.stringify(effectiveConfig.derived.ASC, null, 2)}</pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Metadata</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="text-sm">{JSON.stringify(effectiveConfig.metadata, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
