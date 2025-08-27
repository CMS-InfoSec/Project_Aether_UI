import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Shield
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
}

interface ValidationErrors {
  sl_multiplier?: string;
  tp_multiplier?: string;
  trailing_stop?: string;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedRiskTier, setSelectedRiskTier] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced');
  const [tradingSettings, setTradingSettings] = useState<TradingSettings>({
    sl_multiplier: 0.5,
    tp_multiplier: 2.0,
    use_news_analysis: true,
    trailing_stop: 0.1
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState({
    profile: true,
    settings: false,
    saveProfile: false,
    saveSettings: false
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string>('');

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
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      
      if (data.status === 'success') {
        setUserProfile(data.data);
        setSelectedRiskTier(data.data.risk_tier);
      } else {
        throw new Error(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Load profile error:', error);
      setApiError('Failed to load user profile');
    } finally {
      setIsLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const loadTradingSettings = async () => {
    try {
      const response = await fetch('/api/user/trading-settings');
      const data = await response.json();
      
      if (data.status === 'success') {
        setTradingSettings(data.data.settings);
      } else {
        // If no settings exist, use defaults (as specified in requirements)
        console.log('No existing settings found, using defaults');
      }
    } catch (error) {
      console.error('Load trading settings error:', error);
      // Don't show error for missing settings, use defaults
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

  const handleSaveRiskTier = async () => {
    // Validation
    if (!['aggressive', 'balanced', 'conservative'].includes(selectedRiskTier)) {
      setApiError('Invalid risk tier selection');
      return;
    }

    setIsLoading(prev => ({ ...prev, saveProfile: true }));
    setApiError('');
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          risk_tier: selectedRiskTier
        })
      });
      
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
    
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: tradingSettings
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Update form values with response (merged settings)
        setTradingSettings(data.data.settings);
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

  const handleResetToLastSaved = () => {
    // Reset to last loaded values
    if (userProfile) {
      setSelectedRiskTier(userProfile.risk_tier);
    }
    loadTradingSettings();
    setErrors({});
    setApiError('');
  };

  // Check if risk tier has changed
  const riskTierChanged = userProfile && selectedRiskTier !== userProfile.risk_tier;
  
  // Check if all trading settings are valid
  const tradingSettingsValid = Object.keys(errors).length === 0 && 
    tradingSettings.sl_multiplier >= 0.1 && tradingSettings.sl_multiplier <= 1.0 &&
    tradingSettings.tp_multiplier > 0 &&
    tradingSettings.trailing_stop > 0;

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal risk profile and trading preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleResetToLastSaved}>
            Reset
          </Button>
        </div>
      </div>

      {/* API Error Display */}
      {apiError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Risk Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Risk Profile</span>
          </CardTitle>
          <CardDescription>
            Set your trading risk tolerance level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="riskTier">Risk Tier</Label>
              <Select 
                value={selectedRiskTier} 
                onValueChange={(value: 'aggressive' | 'balanced' | 'conservative') => setSelectedRiskTier(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="conservative">Conservative</SelectItem>
                </SelectContent>
              </Select>
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
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Trading Preferences</span>
          </CardTitle>
          <CardDescription>
            Configure your trading parameters and risk management settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Stop-Loss Multiplier */}
            <div className="space-y-2">
              <Label htmlFor="slMultiplier">Stop-Loss Multiplier</Label>
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
              <Label htmlFor="tpMultiplier">Take-Profit Multiplier</Label>
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
              <Label htmlFor="trailingStop">Trailing Stop</Label>
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
                  <Label>Use News Analysis</Label>
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
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please fix the validation errors above before saving.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleSaveTradingSettings}
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
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Settings Summary</CardTitle>
          <CardDescription>Review your current configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
