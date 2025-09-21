import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiFetch from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import HelpTip from '@/components/ui/help-tip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  User, 
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  Key,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Info,
  RotateCcw,
  WifiOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface UserProfile {
  risk_tier: 'aggressive' | 'balanced' | 'conservative';
}

interface TradingSettings {
  sl_multiplier: number;
  tp_multiplier: number;
  use_news_analysis: boolean;
  trailing_stop: number;
  risk_tier?: 'aggressive' | 'balanced' | 'conservative';
}

interface ApiKeyRecord {
  key_masked: string;
  expires_at: string;
  created_at: string;
  scopes_verified: boolean;
}

interface BinanceCredentials {
  api_key: string;
  api_secret: string;
  expiration: string;
}

interface ValidationErrors {
  sl_multiplier?: string;
  tp_multiplier?: string;
  trailing_stop?: string;
  risk_tier?: string;
  api_key?: string;
  api_secret?: string;
}

export default function ProfileSettings() {
  const { user, refreshToken } = useAuth();
  
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedRiskTier, setSelectedRiskTier] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced');
  const [tradingSettings, setTradingSettings] = useState<TradingSettings>({
    sl_multiplier: 0.5,
    tp_multiplier: 2.0,
    use_news_analysis: true,
    trailing_stop: 0.1
  });
  const [originalTradingSettings, setOriginalTradingSettings] = useState<TradingSettings>({
    sl_multiplier: 0.5,
    tp_multiplier: 2.0,
    use_news_analysis: true,
    trailing_stop: 0.1
  });
  
  // Binance API credentials state
  const [binanceCredentials, setBinanceCredentials] = useState<BinanceCredentials>({
    api_key: '',
    api_secret: '',
    expiration: ''
  });
  const [existingApiKeys, setExistingApiKeys] = useState<ApiKeyRecord | null>(null);
  const [showApiSecret, setShowApiSecret] = useState(false);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState({
    profile: true,
    settings: false,
    apiKeys: false,
    saveProfile: false,
    saveSettings: false,
    saveApiKeys: false,
    deleteApiKeys: false
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string>('');
  const [retryAction, setRetryAction] = useState<string | null>(null);

  // Risk tier descriptions
  const riskTierDescriptions = {
    aggressive: {
      description: 'High risk, high reward trading with maximum position sizes',
      icon: TrendingUp,
      color: 'text-red-600'
    },
    balanced: {
      description: 'Moderate risk approach balancing growth and safety',
      icon: Settings,
      color: 'text-blue-600'
    },
    conservative: {
      description: 'Low risk strategy focusing on capital preservation',
      icon: Shield,
      color: 'text-green-600'
    }
  };

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
    loadTradingSettings();
    loadApiKeys();
  }, []);

  // Set default expiration date (90 days from now)
  useEffect(() => {
    if (!binanceCredentials.expiration) {
      const defaultExpiration = new Date();
      defaultExpiration.setDate(defaultExpiration.getDate() + 90);
      setBinanceCredentials(prev => ({
        ...prev,
        expiration: defaultExpiration.toISOString().split('T')[0]
      }));
    }
  }, [binanceCredentials.expiration]);

  const handleApiRequest = useCallback(async (requestFn: () => Promise<Response>, actionName: string) => {
    try {
      const response = await requestFn();
      
      // Handle 401 (token expired) with automatic refresh
      if (response.status === 401) {
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          // Retry the original request once
          return await requestFn();
        }
        throw new Error('Authentication failed. Please log in again.');
      }
      
      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setRetryAction(actionName);
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }, [refreshToken]);

  const loadUserProfile = async () => {
    try {
      const response = await handleApiRequest(
        () => apiFetch('/api/user/profile'),
        'loadProfile'
      );
      const data = await response.json();
      
      if (data.status === 'success') {
        setUserProfile(data.data);
        setSelectedRiskTier(data.data.risk_tier);
      } else {
        throw new Error(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Load profile error:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to load user profile');
    } finally {
      setIsLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const loadTradingSettings = async () => {
    try {
      const response = await handleApiRequest(
        () => apiFetch('/api/user/trading-settings'),
        'loadSettings'
      );
      const data = await response.json();
      
      if (data.status === 'success') {
        setTradingSettings(data.data.settings);
        setOriginalTradingSettings(data.data.settings);
      } else {
        // If no settings exist, use defaults
        console.log('No existing settings found, using defaults');
      }
    } catch (error) {
      console.error('Load trading settings error:', error);
      // Don't show error for missing settings, use defaults
    }
  };

  const loadApiKeys = async () => {
    try {
      const response = await handleApiRequest(
        () => apiFetch('/api/user/api-keys'),
        'loadApiKeys'
      );
      const data = await response.json();
      
      if (data.status === 'success') {
        setExistingApiKeys(data.data.api_keys);
      }
    } catch (error) {
      console.error('Load API keys error:', error);
      // Don't show error for missing API keys
    }
  };

  const validateTradingSettings = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Validate sl_multiplier (0.1 - 1.0)
    if (tradingSettings.sl_multiplier < 0.1 || tradingSettings.sl_multiplier > 1.0) {
      newErrors.sl_multiplier = 'Stop-Loss Multiplier must be between 0.1 and 1.0';
    }
    
    // Validate tp_multiplier (> 0)
    if (tradingSettings.tp_multiplier <= 0) {
      newErrors.tp_multiplier = 'Take-Profit Multiplier must be greater than 0';
    }
    
    // Validate trailing_stop (> 0)
    if (tradingSettings.trailing_stop <= 0) {
      newErrors.trailing_stop = 'Trailing Stop must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBinanceCredentials = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Validate API key (64-char alphanumeric)
    if (!binanceCredentials.api_key) {
      newErrors.api_key = 'API key is required';
    } else if (!/^[A-Za-z0-9]{64}$/.test(binanceCredentials.api_key)) {
      newErrors.api_key = 'API key must be exactly 64 alphanumeric characters';
    }
    
    // Validate API secret
    if (!binanceCredentials.api_secret) {
      newErrors.api_secret = 'API secret is required';
    } else if (binanceCredentials.api_secret.length < 10) {
      newErrors.api_secret = 'API secret must be at least 10 characters';
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveRiskTier = async () => {
    // Validation
    if (!['aggressive', 'balanced', 'conservative'].includes(selectedRiskTier)) {
      setErrors({ risk_tier: 'Invalid risk tier selection' });
      return;
    }

    setIsLoading(prev => ({ ...prev, saveProfile: true }));
    setApiError('');
    setRetryAction(null);
    
    try {
      const response = await handleApiRequest(
        () => apiFetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ risk_tier: selectedRiskTier })
        }),
        'saveProfile'
      );
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setUserProfile(data.data);
        toast({
          title: "Risk Tier Updated",
          description: "Your risk profile has been updated successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to update risk tier');
      }
    } catch (error) {
      console.error('Save risk tier error:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to update risk tier');
    } finally {
      setIsLoading(prev => ({ ...prev, saveProfile: false }));
    }
  };

  const handleSaveTradingSettings = async () => {
    if (!validateTradingSettings()) {
      return;
    }

    setIsLoading(prev => ({ ...prev, saveSettings: true }));
    setApiError('');
    setRetryAction(null);

    try {
      const response = await handleApiRequest(
        () => apiFetch('/api/users/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: tradingSettings })
        }),
        'saveSettings'
      );

      // Check status first before reading JSON
      if (response.status === 400) {
        const errorData = await response.json();
        const errorMessage = errorData.details ? errorData.details.join(', ') : errorData.error;
        setApiError(errorMessage);
        return;
      }

      if (response.status === 502) {
        setRetryAction('saveSettings');
        setApiError('Network error. Please try again.');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setTradingSettings(data.data.settings);
        setOriginalTradingSettings(data.data.settings);
        toast({
          title: "Trading Settings Updated",
          description: "Your trading preferences have been updated successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to update trading settings');
      }
    } catch (error) {
      console.error('Save trading settings error:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to update trading settings');
    } finally {
      setIsLoading(prev => ({ ...prev, saveSettings: false }));
    }
  };

  const handleSaveApiKeys = async () => {
    if (!validateBinanceCredentials()) {
      return;
    }

    setIsLoading(prev => ({ ...prev, saveApiKeys: true }));
    setApiError('');
    setRetryAction(null);

    try {
      const expirationISO = new Date(binanceCredentials.expiration + 'T00:00:00Z').toISOString();

      const response = await handleApiRequest(
        () => apiFetch('/api/users/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            binance_key: binanceCredentials.api_key,
            binance_secret: binanceCredentials.api_secret,
            expires_at: expirationISO
          })
        }),
        'saveApiKeys'
      );

      // Check status first, then read JSON once
      if (response.status === 400) {
        const errorData = await response.json();
        setApiError(errorData.error || 'Invalid API credentials');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setExistingApiKeys(data.data.api_keys);
        setBinanceCredentials({ api_key: '', api_secret: '', expiration: '' });
        toast({
          title: "API Keys Saved",
          description: "Your Binance API credentials have been saved securely.",
        });
      } else {
        throw new Error(data.error || 'Failed to save API keys');
      }
    } catch (error) {
      console.error('Save API keys error:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to save API keys');
    } finally {
      setIsLoading(prev => ({ ...prev, saveApiKeys: false }));
    }
  };

  const handleDeleteApiKeys = async () => {
    setIsLoading(prev => ({ ...prev, deleteApiKeys: true }));
    setApiError('');

    try {
      console.log('Sending delete API keys request to dedicated endpoint...');

      const response = await handleApiRequest(
        () => apiFetch('/api/user/api-keys', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }),
        'deleteApiKeys'
      );

      console.log('Delete API keys response status:', response.status);

      // Check response status first
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            errorMessage += ': ' + errorData.details.join(', ');
          }
        } catch (jsonError) {
          console.log('Could not parse error response as JSON:', jsonError);
          try {
            const textError = await response.text();
            console.log('Error response text:', textError);
            if (textError) {
              errorMessage = textError;
            }
          } catch (textError) {
            console.log('Could not read error response as text:', textError);
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Delete API keys success response:', data);

      if (data.status === 'success') {
        setExistingApiKeys(null);
        toast({
          title: "API Keys Deleted",
          description: "Your Binance API credentials have been removed.",
          variant: "destructive"
        });
      } else {
        throw new Error(data.error || data.message || 'Failed to delete API keys');
      }
    } catch (error) {
      console.error('Delete API keys error:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to delete API keys');
    } finally {
      setIsLoading(prev => ({ ...prev, deleteApiKeys: false }));
    }
  };

  const handleResetToLastSaved = () => {
    // Reset to last loaded values
    if (userProfile) {
      setSelectedRiskTier(userProfile.risk_tier);
    }
    setTradingSettings(originalTradingSettings);
    setBinanceCredentials({ api_key: '', api_secret: '', expiration: '' });
    setErrors({});
    setApiError('');
    setRetryAction(null);
    
    toast({
      title: "Form Reset",
      description: "All changes have been reverted to last saved values.",
    });
  };

  const handleRetry = () => {
    setRetryAction(null);
    setApiError('');
    
    switch (retryAction) {
      case 'loadProfile':
        loadUserProfile();
        break;
      case 'loadSettings':
        loadTradingSettings();
        break;
      case 'loadApiKeys':
        loadApiKeys();
        break;
      case 'saveProfile':
        handleSaveRiskTier();
        break;
      case 'saveSettings':
        handleSaveTradingSettings();
        break;
      case 'saveApiKeys':
        handleSaveApiKeys();
        break;
      case 'deleteApiKeys':
        handleDeleteApiKeys();
        break;
    }
  };

  // Check if risk tier has changed
  const riskTierChanged = userProfile && selectedRiskTier !== userProfile.risk_tier;
  
  // Check if all trading settings are valid
  const tradingSettingsValid = Object.keys(errors).filter(key => 
    ['sl_multiplier', 'tp_multiplier', 'trailing_stop'].includes(key)
  ).length === 0 && 
    tradingSettings.sl_multiplier >= 0.1 && tradingSettings.sl_multiplier <= 1.0 &&
    tradingSettings.tp_multiplier > 0 &&
    tradingSettings.trailing_stop > 0;

  // Check if API credentials are valid
  const apiCredentialsValid = Object.keys(errors).filter(key => 
    ['api_key', 'api_secret'].includes(key)
  ).length === 0 && 
    binanceCredentials.api_key.length > 0 && 
    binanceCredentials.api_secret.length > 0;

  if (isLoading.profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
            <p className="text-muted-foreground">
              Manage your personal risk profile, trading preferences, and API credentials
            </p>
            <div className="mt-2 text-sm flex items-center gap-2">
              <Badge variant="outline">{user?.email}</Badge>
              <Badge variant={user?.role==='admin' ? 'destructive' : 'outline'}>{user?.role ?? 'user'}</Badge>
              {userProfile && <Badge variant="secondary" className="capitalize">{userProfile.risk_tier}</Badge>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <HelpTip content="Reset all fields on this page to the most recently saved values." />
            <Button variant="outline" onClick={handleResetToLastSaved}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* API Error Display */}
        {apiError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{apiError}</span>
              {retryAction && (
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Offline indicator */}
        {!navigator.onLine && (
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You're currently offline. Changes will be saved when connection is restored.
            </AlertDescription>
          </Alert>
        )}

        {/* Risk Profile Section */}
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Risk Profile</span>
              </CardTitle>
              <CardDescription>
                Set your trading risk tolerance level. This affects position sizing and risk management.
              </CardDescription>
            </div>
            <HelpTip content="Choose a preset risk tier; it influences defaults for sizing and stops." />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Label htmlFor="riskTier">Risk Tier</Label><HelpTip content="Preset profile controlling default risk limits for your account." /></div>
                <Select 
                  value={selectedRiskTier} 
                  onValueChange={(value: 'aggressive' | 'balanced' | 'conservative') => setSelectedRiskTier(value)}
                >
                  <SelectTrigger className={errors.risk_tier ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="conservative">Conservative</SelectItem>
                  </SelectContent>
                </Select>
                {errors.risk_tier && (
                  <p className="text-xs text-red-500">{errors.risk_tier}</p>
                )}
              </div>

              {/* Risk Tier Description */}
              <div className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center space-x-3">
                  {React.createElement(riskTierDescriptions[selectedRiskTier].icon, {
                    className: `h-5 w-5 ${riskTierDescriptions[selectedRiskTier].color}`
                  })}
                  <div>
                    <div className="font-medium capitalize">{selectedRiskTier}</div>
                    <div className="text-sm text-muted-foreground">
                      {riskTierDescriptions[selectedRiskTier].description}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveRiskTier}
              disabled={!riskTierChanged || isLoading.saveProfile}
              className="w-full md:w-auto"
            >
              {isLoading.saveProfile ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Risk Tier
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Trading Preferences Section */}
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Trading Preferences</span>
              </CardTitle>
              <CardDescription>
                Configure your trading parameters and risk management settings
              </CardDescription>
            </div>
            <HelpTip content="Adjust multipliers and options used by your trading rules." />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Stop-Loss Multiplier */}
              <div className="space-y-2">
                <Label htmlFor="slMultiplier" className="flex items-center gap-2">
                  <span>Stop-Loss Multiplier</span><HelpTip content="Multiplier applied to baseline stop-loss distance. Higher widens stops." />
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Multiplier applied to system-calculated stop-loss</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="slMultiplier"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="1.0"
                  value={tradingSettings.sl_multiplier}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setTradingSettings(prev => ({ ...prev, sl_multiplier: isNaN(value) ? 0 : value }));
                  }}
                  className={errors.sl_multiplier ? 'border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Valid Range: 0.1 - 1.0
                </p>
                {errors.sl_multiplier && (
                  <p className="text-xs text-red-500">{errors.sl_multiplier}</p>
                )}
              </div>

              {/* Take-Profit Multiplier */}
              <div className="space-y-2">
                <Label htmlFor="tpMultiplier" className="flex items-center gap-2">
                  <span>Take-Profit Multiplier</span><HelpTip content="Multiplier applied to baseline take-profit. Higher enlarges target." />
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Multiplier for take-profit targets</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="tpMultiplier"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={tradingSettings.tp_multiplier}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setTradingSettings(prev => ({ ...prev, tp_multiplier: isNaN(value) ? 0 : value }));
                  }}
                  className={errors.tp_multiplier ? 'border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Must be greater than 0
                </p>
                {errors.tp_multiplier && (
                  <p className="text-xs text-red-500">{errors.tp_multiplier}</p>
                )}
              </div>

              {/* Trailing Stop */}
              <div className="space-y-2">
                <Label htmlFor="trailingStop" className="flex items-center gap-2">
                  <span>Trailing Stop</span><HelpTip content="Percentage trail that follows price to protect gains." />
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Percentage trigger for trailing stop (e.g. 0.1 for 10%)</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="trailingStop"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tradingSettings.trailing_stop}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setTradingSettings(prev => ({ ...prev, trailing_stop: isNaN(value) ? 0 : value }));
                  }}
                  className={errors.trailing_stop ? 'border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Percentage for trailing stop trigger (e.g., 0.1 for 10%)
                </p>
                {errors.trailing_stop && (
                  <p className="text-xs text-red-500">{errors.trailing_stop}</p>
                )}
              </div>

              {/* Use News Analysis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <span>Use News Analysis</span><HelpTip content="Include news-derived sentiment in decision making." />
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enable or disable news sentiment signals</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable/disable use of news sentiment in trading signals
                    </p>
                  </div>
                  <Switch
                    checked={tradingSettings.use_news_analysis}
                    onCheckedChange={(checked) => setTradingSettings(prev => ({ 
                      ...prev, 
                      use_news_analysis: checked 
                    }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Validation Summary */}
            {Object.keys(errors).filter(key => 
              ['sl_multiplier', 'tp_multiplier', 'trailing_stop'].includes(key)
            ).length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the validation errors above before saving.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={async ()=>{
                  const before = originalTradingSettings;
                  const after = tradingSettings;
                  const diff: Record<string, { from:any; to:any }> = {};
                  (['sl_multiplier','tp_multiplier','trailing_stop','use_news_analysis'] as const).forEach(k=>{
                    if ((before as any)[k] !== (after as any)[k]) diff[k] = { from: (before as any)[k], to: (after as any)[k] };
                  });
                  const ok = window.confirm(`Review changes before saving:\n\n${JSON.stringify(diff,null,2)}`);
                  if (!ok) return;
                  await handleSaveTradingSettings();
                  try {
                    await apiFetch('/api/config/user', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: user?.id || 'user_1', settings: { trading: { ...after } } }) });
                  } catch {}
                }}
                disabled={!tradingSettingsValid || isLoading.saveSettings}
                className="w-full md:w-auto"
              >
                {isLoading.saveSettings ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Trading Settings
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={()=>{
                const tier = selectedRiskTier;
                const defaults = tier==='aggressive' ? { sl_multiplier: 0.8, tp_multiplier: 3.0, trailing_stop: 0.15, use_news_analysis: true } : tier==='balanced' ? { sl_multiplier: 0.5, tp_multiplier: 2.0, trailing_stop: 0.1, use_news_analysis: true } : { sl_multiplier: 0.3, tp_multiplier: 1.5, trailing_stop: 0.05, use_news_analysis: false };
                setTradingSettings(defaults);
                toast({ title:'Defaults applied', description:`Applied ${tier} tier defaults` });
              }}>Reset to Tier Defaults</Button>
            </div>
          </CardContent>
        </Card>

        {/* Binance API Credentials Section */}
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Binance API Credentials</span>
              </CardTitle>
              <CardDescription>
                Connect your Binance account for live trading. Keys are encrypted at rest and must not have withdrawal permissions.
              </CardDescription>
            </div>
            <HelpTip content="Enter your Binance API key/secret; avoid withdrawal scopes. Rotate periodically." />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing API Keys Display */}
            {existingApiKeys && (
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">API Keys Configured</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Key: <code className="bg-green-100 px-1 rounded">{existingApiKeys.key_masked}</code></div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>Expires: {new Date(existingApiKeys.expires_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          {existingApiKeys.scopes_verified ? 'Scopes Verified' : 'Pending Verification'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExistingApiKeys(null);
                        const defaultExpiration = new Date();
                        defaultExpiration.setDate(defaultExpiration.getDate() + 90);
                        setBinanceCredentials({
                          api_key: '',
                          api_secret: '',
                          expiration: defaultExpiration.toISOString().split('T')[0]
                        });
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Rotate
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteApiKeys}
                      disabled={isLoading.deleteApiKeys}
                    >
                      {isLoading.deleteApiKeys ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* API Credentials Form */}
            {!existingApiKeys && (
              <div className="space-y-4">
                {/* Binance API Key */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Label htmlFor="apiKey">Binance API Key</Label><HelpTip content="Your Binance API key used for authenticated requests. Stored securely on the server." /></div>
                  <Input
                    id="apiKey"
                    type="text"
                    placeholder="Enter your 64-character Binance API key"
                    value={binanceCredentials.api_key}
                    onChange={(e) => setBinanceCredentials(prev => ({ 
                      ...prev, 
                      api_key: e.target.value.replace(/[^A-Za-z0-9]/g, '').substring(0, 64)
                    }))}
                    className={errors.api_key ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    64-character alphanumeric string from your Binance account
                  </p>
                  {errors.api_key && (
                    <p className="text-xs text-red-500">{errors.api_key}</p>
                  )}
                </div>

                {/* Binance API Secret */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Label htmlFor="apiSecret">Binance API Secret</Label><HelpTip content="Your Binance API secret. Keep private. Required to place orders and fetch balances." /></div>
                  <div className="relative">
                    <Input
                      id="apiSecret"
                      type={showApiSecret ? 'text' : 'password'}
                      placeholder="Enter your Binance API secret"
                      value={binanceCredentials.api_secret}
                      onChange={(e) => setBinanceCredentials(prev => ({ 
                        ...prev, 
                        api_secret: e.target.value 
                      }))}
                      className={errors.api_secret ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowApiSecret(!showApiSecret)}
                    >
                      {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your API secret will be encrypted and stored securely
                  </p>
                  {errors.api_secret && (
                    <p className="text-xs text-red-500">{errors.api_secret}</p>
                  )}
                </div>

                {/* Expiration Date */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Label htmlFor="expiration">Expiration Date (Optional)</Label><HelpTip content="Optional expiry for rotating API credentials. Leave empty for no expiry." /></div>
                  <Input
                    id="expiration"
                    type="date"
                    value={binanceCredentials.expiration}
                    onChange={(e) => setBinanceCredentials(prev => ({ 
                      ...prev, 
                      expiration: e.target.value 
                    }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to 90 days from entry. Set when you want to rotate keys.
                  </p>
                </div>

                {/* Security Notice */}
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Requirements:</strong> Your API keys must NOT have withdrawal or transfer permissions. 
                    We only need spot trading and account information access.
                  </AlertDescription>
                </Alert>

                {/* Validation Errors */}
                {Object.keys(errors).filter(key => 
                  ['api_key', 'api_secret'].includes(key)
                ).length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Please fix the validation errors above before saving.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Save API Keys Button */}
                <Button 
                  onClick={handleSaveApiKeys}
                  disabled={!apiCredentialsValid || isLoading.saveApiKeys}
                  className="w-full md:w-auto"
                >
                  {isLoading.saveApiKeys ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving & Verifying...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save API Keys
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Settings Summary */}
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle>Current Settings Summary</CardTitle>
              <CardDescription>Review your current configuration</CardDescription>
            </div>
            <HelpTip content="Snapshot of your active profile, preferences, and API connection." />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">Risk Profile</h4>
                <div className="flex items-center space-x-2">
                  {React.createElement(riskTierDescriptions[selectedRiskTier].icon, {
                    className: `h-4 w-4 ${riskTierDescriptions[selectedRiskTier].color}`
                  })}
                  <span className="capitalize">{selectedRiskTier}</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Trading Settings</h4>
                <div className="text-sm space-y-1">
                  <div>Stop-Loss: {tradingSettings.sl_multiplier}x</div>
                  <div>Take-Profit: {tradingSettings.tp_multiplier}x</div>
                  <div>Trailing Stop: {(tradingSettings.trailing_stop * 100).toFixed(1)}%</div>
                  <div>News Analysis: {tradingSettings.use_news_analysis ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">API Connection</h4>
                <div className="flex items-center space-x-2">
                  {existingApiKeys ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-yellow-700">Not Connected</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
