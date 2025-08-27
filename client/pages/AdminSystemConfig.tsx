import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings,
  Edit,
  Save,
  X,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  User,
  Database,
  Shield,
  Eye,
  EyeOff,
  Code,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface RuntimeConfig {
  [key: string]: string | number | boolean;
}

interface SystemConfig {
  [key: string]: any;
}

interface UserSettings {
  userId: string;
  settings: {
    [key: string]: any;
  };
}

export default function AdminSystemConfig() {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>({});
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({});
  const [userSettings, setUserSettings] = useState<UserSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [unknownKeys, setUnknownKeys] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [configDiff, setConfigDiff] = useState<any>(null);
  const [isDiffDialogOpen, setIsDiffDialogOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSettingsForm, setUserSettingsForm] = useState<any>({});
  const [showSensitive, setShowSensitive] = useState(false);

  // Fetch all configuration data
  const fetchConfigurations = async () => {
    try {
      const [runtimeRes, systemRes, usersRes] = await Promise.all([
        fetch('/api/config/runtime'),
        fetch('/api/config'),
        fetch('/api/config/users')
      ]);

      const [runtimeData, systemData, usersData] = await Promise.all([
        runtimeRes.json(),
        systemRes.json(),
        usersRes.json()
      ]);

      if (runtimeData.status === 'success') {
        setRuntimeConfig(runtimeData.data);
      }
      
      if (systemData.status === 'success') {
        setSystemConfig(systemData.data);
      }
      
      if (usersData.status === 'success') {
        setUserSettings(usersData.data);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch configuration data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchConfigurations();
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Handle runtime config inline editing
  const handleStartEdit = (key: string, value: any) => {
    setEditingKey(key);
    setEditValue(String(value));
  };

  const handleSaveEdit = async () => {
    if (!editingKey) return;

    setIsProcessing(true);
    try {
      const value = editValue === 'true' ? true : 
                   editValue === 'false' ? false :
                   !isNaN(Number(editValue)) ? Number(editValue) : editValue;

      const response = await fetch('/api/config/runtime', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: { [editingKey]: value },
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setRuntimeConfig(data.data);
        setEditingKey(null);
        setEditValue('');
        setUnknownKeys([]);
        toast({
          title: "Success",
          description: "Runtime configuration updated",
        });
      } else if (data.unknownKeys) {
        setUnknownKeys(data.unknownKeys);
        toast({
          title: "Warning",
          description: `Unknown keys found: ${data.unknownKeys.join(', ')}`,
          variant: "destructive"
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update configuration",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
    setUnknownKeys([]);
  };

  // Handle system config update with diff preview
  const handleSystemConfigUpdate = (newConfig: any) => {
    setConfigDiff(newConfig);
    setIsDiffDialogOpen(true);
  };

  const handleConfirmSystemUpdate = async () => {
    if (!configDiff) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: configDiff,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setSystemConfig(data.data);
        setIsDiffDialogOpen(false);
        setConfigDiff(null);
        toast({
          title: "Success",
          description: "System configuration updated",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update system configuration",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle system config reset
  const handleResetSystemConfig = async () => {
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
      const response = await fetch('/api/config', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: resetConfirmation,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setSystemConfig(data.data);
        setResetConfirmation('');
        toast({
          title: "Success",
          description: "System configuration reset to defaults",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset configuration",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle user settings update
  const handleUpdateUserSettings = async () => {
    if (!selectedUserId || !userSettingsForm) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/config/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          settings: userSettingsForm,
          actor: 'admin@example.com'
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        await fetchConfigurations(); // Refresh user settings
        setUserSettingsForm({});
        toast({
          title: "Success",
          description: `User settings updated for ${selectedUserId}`,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user settings",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter configs based on search
  const filterConfig = (config: any, term: string): any => {
    if (!term) return config;
    
    const filtered: any = {};
    for (const [key, value] of Object.entries(config)) {
      if (key.toLowerCase().includes(term.toLowerCase()) ||
          (typeof value === 'string' && value.toLowerCase().includes(term.toLowerCase()))) {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  // Render config value with type detection
  const renderConfigValue = (value: any) => {
    if (typeof value === 'boolean') {
      return <Badge variant={value ? 'default' : 'secondary'}>{String(value)}</Badge>;
    }
    if (typeof value === 'number') {
      return <Badge variant="outline">{value}</Badge>;
    }
    if (typeof value === 'string' && value === '***HIDDEN***') {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <EyeOff className="h-3 w-3" />
          <span>Hidden</span>
        </Badge>
      );
    }
    return <span className="text-sm">{String(value)}</span>;
  };

  // Render hierarchical config
  const renderHierarchicalConfig = (config: any, path: string = '') => {
    return Object.entries(config).map(([key, value]) => {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return (
          <div key={fullPath} className="space-y-2">
            <div className="font-medium text-sm flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>{key}</span>
            </div>
            <div className="ml-6 space-y-2 border-l-2 border-muted pl-4">
              {renderHierarchicalConfig(value, fullPath)}
            </div>
          </div>
        );
      }
      
      return (
        <div key={fullPath} className="flex items-center justify-between py-2 border-b border-muted/30">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono">{key}</span>
          </div>
          <div className="flex items-center space-x-2">
            {renderConfigValue(value)}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSystemConfigUpdate({ [fullPath]: 'NEW_VALUE' })}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    });
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

  const filteredRuntimeConfig = filterConfig(runtimeConfig, searchTerm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground">
            Manage runtime and system settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowSensitive(!showSensitive)}>
            {showSensitive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showSensitive ? 'Hide' : 'Show'} Sensitive
          </Button>
          <Button variant="outline" onClick={fetchConfigurations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="runtime" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="runtime">Runtime Configuration</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="users">User Settings</TabsTrigger>
        </TabsList>

        {/* Runtime Configuration Tab */}
        <TabsContent value="runtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Runtime Configuration</span>
              </CardTitle>
              <CardDescription>
                Edit runtime configuration values with inline editing and validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search configuration keys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {unknownKeys.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Unknown configuration keys: {unknownKeys.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {Object.entries(filteredRuntimeConfig).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{key}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingKey === key ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-32"
                            size="sm"
                          />
                          <Button size="sm" onClick={handleSaveEdit} disabled={isProcessing}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {renderConfigValue(value)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(key, value)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
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
                    Hierarchical system configuration with diff preview
                  </CardDescription>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset System Configuration</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset all system configuration to default values. This action cannot be undone.
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
                        onClick={handleResetSystemConfig}
                        disabled={resetConfirmation !== 'RESET' || isProcessing}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          'Reset Configuration'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {renderHierarchicalConfig(systemConfig)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Settings Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Centralized User Settings</span>
              </CardTitle>
              <CardDescription>
                Admin-editable user preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="userSelect">Select User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {userSettings.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
                          {user.userId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedUserId && (
                  <Button onClick={handleUpdateUserSettings} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save User Settings
                      </>
                    )}
                  </Button>
                )}
              </div>

              {selectedUserId && (
                <div className="space-y-4">
                  {userSettings
                    .filter(user => user.userId === selectedUserId)
                    .map(user => (
                      <div key={user.userId} className="space-y-3">
                        <h3 className="text-lg font-semibold">Settings for {user.userId}</h3>
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <pre className="text-sm">{JSON.stringify(user.settings, null, 2)}</pre>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diff Preview Dialog */}
      <Dialog open={isDiffDialogOpen} onOpenChange={setIsDiffDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuration Change Preview</DialogTitle>
            <DialogDescription>
              Review the changes before applying to system configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="font-medium mb-2">Changes to be applied:</div>
              <pre className="text-sm">{JSON.stringify(configDiff, null, 2)}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiffDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSystemUpdate} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
