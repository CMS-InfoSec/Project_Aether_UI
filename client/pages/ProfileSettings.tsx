import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Settings, 
  Shield,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Bell,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  twoFactorEnabled: boolean;
}

interface TradingSettings {
  riskTier: 'aggressive' | 'balanced' | 'conservative';
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxPositionSize: number;
  autoTradingEnabled: boolean;
  newsAnalysisEnabled: boolean;
  maxDailyLoss: number;
  trailingStopEnabled: boolean;
  trailingStopPercentage: number;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  tradingAlerts: boolean;
  priceAlerts: boolean;
  portfolioAlerts: boolean;
  systemAlerts: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

// Mock data
const mockUserProfile: UserProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  timezone: 'America/New_York',
  language: 'en',
  twoFactorEnabled: true
};

const mockTradingSettings: TradingSettings = {
  riskTier: 'balanced',
  stopLossPercentage: 5,
  takeProfitPercentage: 15,
  maxPositionSize: 10000,
  autoTradingEnabled: true,
  newsAnalysisEnabled: true,
  maxDailyLoss: 1000,
  trailingStopEnabled: false,
  trailingStopPercentage: 2
};

const mockNotificationSettings: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  tradingAlerts: true,
  priceAlerts: true,
  portfolioAlerts: true,
  systemAlerts: true,
  weeklyReports: true,
  monthlyReports: false
};

export default function ProfileSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [userProfile, setUserProfile] = useState<UserProfile>(mockUserProfile);
  const [tradingSettings, setTradingSettings] = useState<TradingSettings>(mockTradingSettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(mockNotificationSettings);
  const [isUpdating, setIsUpdating] = useState({
    profile: false,
    trading: false,
    notifications: false,
    security: false
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const riskTierDescriptions = {
    aggressive: {
      description: 'High risk, high reward trading with larger position sizes',
      color: 'bg-destructive/10 text-destructive border-destructive/20',
      icon: TrendingUp
    },
    balanced: {
      description: 'Moderate risk approach balancing growth and safety',
      color: 'bg-primary/10 text-primary border-primary/20',
      icon: DollarSign
    },
    conservative: {
      description: 'Low risk strategy focusing on capital preservation',
      color: 'bg-accent/10 text-accent border-accent/20',
      icon: Shield
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  const handleProfileUpdate = async () => {
    setIsUpdating(prev => ({ ...prev, profile: true }));
    try {
      // Mock API call - replace with PATCH /user/profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(prev => ({ ...prev, profile: false }));
    }
  };

  const handleTradingSettingsUpdate = async () => {
    // Validation
    if (tradingSettings.stopLossPercentage < 1 || tradingSettings.stopLossPercentage > 50) {
      toast({
        title: "Validation Error",
        description: "Stop loss percentage must be between 1% and 50%.",
        variant: "destructive"
      });
      return;
    }

    if (tradingSettings.takeProfitPercentage < 5 || tradingSettings.takeProfitPercentage > 100) {
      toast({
        title: "Validation Error",
        description: "Take profit percentage must be between 5% and 100%.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(prev => ({ ...prev, trading: true }));
    try {
      // Mock API call - replace with PATCH /user/profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Trading Settings Updated",
        description: "Your trading preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update trading settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(prev => ({ ...prev, trading: false }));
    }
  };

  const handleNotificationSettingsUpdate = async () => {
    setIsUpdating(prev => ({ ...prev, notifications: true }));
    try {
      // Mock API call - replace with PATCH /user/profile
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast({
        title: "Notification Settings Updated",
        description: "Your notification preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(prev => ({ ...prev, notifications: false }));
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(prev => ({ ...prev, security: true }));
    try {
      // Mock API call - replace with PATCH /user/password
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Password Change Failed",
        description: "Failed to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(prev => ({ ...prev, security: false }));
    }
  };

  const RiskTierIcon = riskTierDescriptions[tradingSettings.riskTier].icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and trading preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <User className="h-3 w-3 mr-1" />
            {user?.role === 'admin' ? 'Admin' : 'User'} Account
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={userProfile.firstName}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={userProfile.lastName}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={userProfile.timezone} 
                    onValueChange={(value) => setUserProfile(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select 
                    value={userProfile.language} 
                    onValueChange={(value) => setUserProfile(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleProfileUpdate}
                disabled={isUpdating.profile}
                className="w-full md:w-auto"
              >
                {isUpdating.profile ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Settings Tab */}
        <TabsContent value="trading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
              <CardDescription>
                Configure your trading risk profile and position management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Risk Tier</Label>
                  <div className="grid gap-3 mt-3">
                    {Object.entries(riskTierDescriptions).map(([tier, config]) => {
                      const Icon = config.icon;
                      return (
                        <div
                          key={tier}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            tradingSettings.riskTier === tier 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setTradingSettings(prev => ({ 
                            ...prev, 
                            riskTier: tier as 'aggressive' | 'balanced' | 'conservative' 
                          }))}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5" />
                            <div className="flex-1">
                              <div className="font-medium capitalize">{tier}</div>
                              <div className="text-sm text-muted-foreground">{config.description}</div>
                            </div>
                            {tradingSettings.riskTier === tier && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stopLoss">Stop Loss Percentage</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      min="1"
                      max="50"
                      value={tradingSettings.stopLossPercentage}
                      onChange={(e) => setTradingSettings(prev => ({ 
                        ...prev, 
                        stopLossPercentage: parseInt(e.target.value) || 0 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">Range: 1% - 50%</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="takeProfit">Take Profit Percentage</Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      min="5"
                      max="100"
                      value={tradingSettings.takeProfitPercentage}
                      onChange={(e) => setTradingSettings(prev => ({ 
                        ...prev, 
                        takeProfitPercentage: parseInt(e.target.value) || 0 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">Range: 5% - 100%</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxPosition">Max Position Size</Label>
                    <Input
                      id="maxPosition"
                      type="number"
                      min="100"
                      value={tradingSettings.maxPositionSize}
                      onChange={(e) => setTradingSettings(prev => ({ 
                        ...prev, 
                        maxPositionSize: parseInt(e.target.value) || 0 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">Maximum USD per position</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dailyLoss">Max Daily Loss</Label>
                    <Input
                      id="dailyLoss"
                      type="number"
                      min="100"
                      value={tradingSettings.maxDailyLoss}
                      onChange={(e) => setTradingSettings(prev => ({ 
                        ...prev, 
                        maxDailyLoss: parseInt(e.target.value) || 0 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">Daily loss limit in USD</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Trading</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable automated trading based on signals
                      </p>
                    </div>
                    <Switch
                      checked={tradingSettings.autoTradingEnabled}
                      onCheckedChange={(checked) => setTradingSettings(prev => ({ 
                        ...prev, 
                        autoTradingEnabled: checked 
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>News Analysis</Label>
                      <p className="text-sm text-muted-foreground">
                        Include sentiment analysis in trading decisions
                      </p>
                    </div>
                    <Switch
                      checked={tradingSettings.newsAnalysisEnabled}
                      onCheckedChange={(checked) => setTradingSettings(prev => ({ 
                        ...prev, 
                        newsAnalysisEnabled: checked 
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Trailing Stop</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable trailing stop-loss orders
                      </p>
                    </div>
                    <Switch
                      checked={tradingSettings.trailingStopEnabled}
                      onCheckedChange={(checked) => setTradingSettings(prev => ({ 
                        ...prev, 
                        trailingStopEnabled: checked 
                      }))}
                    />
                  </div>

                  {tradingSettings.trailingStopEnabled && (
                    <div className="ml-4 space-y-2">
                      <Label htmlFor="trailingPercent">Trailing Stop Percentage</Label>
                      <Input
                        id="trailingPercent"
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={tradingSettings.trailingStopPercentage}
                        onChange={(e) => setTradingSettings(prev => ({ 
                          ...prev, 
                          trailingStopPercentage: parseFloat(e.target.value) || 0 
                        }))}
                      />
                      <p className="text-xs text-muted-foreground">Range: 0.5% - 10%</p>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleTradingSettingsUpdate}
                disabled={isUpdating.trading}
                className="w-full md:w-auto"
              >
                {isUpdating.trading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Trading Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control what notifications you receive and how
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Delivery Methods</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ 
                          ...prev, 
                          emailNotifications: checked 
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive browser push notifications
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.pushNotifications}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ 
                          ...prev, 
                          pushNotifications: checked 
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Alert Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Trading Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Trade executions, stop-loss triggers, etc.
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.tradingAlerts}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ 
                          ...prev, 
                          tradingAlerts: checked 
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Price Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Significant price movements and market changes
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.priceAlerts}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ 
                          ...prev, 
                          priceAlerts: checked 
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Portfolio Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Portfolio performance and rebalancing updates
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.portfolioAlerts}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ 
                          ...prev, 
                          portfolioAlerts: checked 
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>System Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          System maintenance and important updates
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.systemAlerts}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ 
                          ...prev, 
                          systemAlerts: checked 
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Reports</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Weekly performance summary and insights
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.weeklyReports}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ 
                          ...prev, 
                          weeklyReports: checked 
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Monthly Reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Comprehensive monthly portfolio analysis
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.monthlyReports}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ 
                          ...prev, 
                          monthlyReports: checked 
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleNotificationSettingsUpdate}
                disabled={isUpdating.notifications}
                className="w-full md:w-auto"
              >
                {isUpdating.notifications ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Notification Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-accent" />
                      <div>
                        <div className="font-medium">Two-Factor Authentication</div>
                        <div className="text-sm text-muted-foreground">
                          {userProfile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                    </div>
                    <Badge variant={userProfile.twoFactorEnabled ? "default" : "secondary"}>
                      {userProfile.twoFactorEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {userProfile.twoFactorEnabled && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Your account is protected with two-factor authentication.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ 
                            ...prev, 
                            currentPassword: e.target.value 
                          }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ 
                            ...prev, 
                            newPassword: e.target.value 
                          }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ 
                          ...prev, 
                          confirmPassword: e.target.value 
                        }))}
                      />
                    </div>

                    {passwordForm.newPassword && passwordForm.newPassword.length < 8 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Password must be at least 8 characters long.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      onClick={handlePasswordChange}
                      disabled={
                        isUpdating.security || 
                        !passwordForm.currentPassword || 
                        !passwordForm.newPassword || 
                        !passwordForm.confirmPassword ||
                        passwordForm.newPassword !== passwordForm.confirmPassword ||
                        passwordForm.newPassword.length < 8
                      }
                    >
                      {isUpdating.security ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
