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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  Mail,
  Shield,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface PendingUser {
  id: string;
  email: string;
  requestedRole: 'user' | 'admin';
  approvalsReceived: number;
  approvalsNeeded: number;
  invitedAt: string;
  founderApprovals: string[];
}

interface UserSettings {
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
  newsAnalysisEnabled: boolean;
  trailingStop: number;
  riskTier: 'low' | 'medium' | 'high';
}

// Mock data
const mockFounders = [
  { id: 'founder1', name: 'Alice Johnson' },
  { id: 'founder2', name: 'Bob Smith' },
  { id: 'founder3', name: 'Carol Davis' },
  { id: 'founder4', name: 'David Wilson' },
  { id: 'founder5', name: 'Eva Chen' }
];

const mockPendingUsers: PendingUser[] = [
  {
    id: 'user1',
    email: 'john.doe@example.com',
    requestedRole: 'user',
    approvalsReceived: 2,
    approvalsNeeded: 3,
    invitedAt: '2024-01-20T10:30:00Z',
    founderApprovals: ['founder1', 'founder2']
  },
  {
    id: 'user2',
    email: 'jane.admin@example.com',
    requestedRole: 'admin',
    approvalsReceived: 4,
    approvalsNeeded: 5,
    invitedAt: '2024-01-19T14:15:00Z',
    founderApprovals: ['founder1', 'founder2', 'founder3', 'founder4']
  },
  {
    id: 'user3',
    email: 'mike.trader@example.com',
    requestedRole: 'user',
    approvalsReceived: 1,
    approvalsNeeded: 3,
    invitedAt: '2024-01-21T09:45:00Z',
    founderApprovals: ['founder1']
  }
];

export default function UserManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('invite');
  
  // Invite Users State
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user' as 'user' | 'admin',
    founderApprovals: [] as string[]
  });
  const [isInviting, setIsInviting] = useState(false);
  
  // Approve Users State
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assignedRole, setAssignedRole] = useState<'user' | 'admin'>('user');
  
  // User Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>({
    stopLossMultiplier: 0.2,
    takeProfitMultiplier: 2.0,
    newsAnalysisEnabled: true,
    trailingStop: 0.05,
    riskTier: 'medium'
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Filter pending users based on search
  const filteredPendingUsers = pendingUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredPendingUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredPendingUsers.slice(startIndex, startIndex + itemsPerPage);

  // Invite User Functions
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - check approval quorum
    const requiredApprovals = inviteForm.role === 'admin' ? 5 : 3;

    if (!inviteForm.email || inviteForm.founderApprovals.length < requiredApprovals) {
      toast({
        title: "Validation Error",
        description: `Email is required and ${requiredApprovals} founder approvals needed for ${inviteForm.role} role.`,
        variant: "destructive"
      });
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Invitation Sent",
          description: `Invitation sent to ${inviteForm.email} successfully.`,
        });

        // Reset form
        setInviteForm({
          email: '',
          role: 'user',
          founderApprovals: []
        });

        // Refresh pending users
        await fetchPendingUsers();
      } else {
        throw new Error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleFounderToggle = (founderId: string) => {
    setInviteForm(prev => ({
      ...prev,
      founderApprovals: prev.founderApprovals.includes(founderId)
        ? prev.founderApprovals.filter(id => id !== founderId)
        : [...prev.founderApprovals, founderId]
    }));
  };

  // Fetch pending users from API
  const fetchPendingUsers = async () => {
    try {
      const params = new URLSearchParams({
        limit: '100', // Get all for local filtering
        offset: '0',
        search: searchTerm
      });

      const response = await fetch(`/api/users/pending?${params}`);
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setPendingUsers(data.data.users || []);
      } else {
        console.error('Failed to fetch pending users:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
    }
  };

  // Load pending users on component mount and when search changes
  useEffect(() => {
    fetchPendingUsers();
  }, [searchTerm]);

  // Approve User Functions
  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch('/api/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          assignedRole
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "User Approved",
          description: "User has been successfully approved and activated.",
        });

        // Refresh pending users list
        await fetchPendingUsers();
        setSelectedUser('');
      } else {
        throw new Error(data.error || 'Failed to approve user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve user. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/pending/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "User Rejected",
          description: "User invitation has been rejected.",
        });

        // Refresh pending users list
        await fetchPendingUsers();
      } else {
        throw new Error(data.error || 'Failed to reject user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject user. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Load user settings on component mount
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const response = await fetch('/api/users/settings');
        const data = await response.json();

        if (response.ok && data.status === 'success') {
          setUserSettings(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch user settings:', error);
      }
    };

    fetchUserSettings();
  }, []);

  // User Settings Functions
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (userSettings.stopLossMultiplier < 0.1 || userSettings.stopLossMultiplier > 1.0) {
      toast({
        title: "Validation Error",
        description: "Stop-loss multiplier must be between 0.1 and 1.0.",
        variant: "destructive"
      });
      return;
    }

    if (userSettings.takeProfitMultiplier < 1.0) {
      toast({
        title: "Validation Error",
        description: "Take-profit multiplier must be at least 1.0.",
        variant: "destructive"
      });
      return;
    }

    if (userSettings.trailingStop <= 0) {
      toast({
        title: "Validation Error",
        description: "Trailing stop must be greater than 0.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingSettings(true);
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userSettings),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your trading preferences have been updated successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const getApprovalProgress = (user: PendingUser) => {
    return (user.approvalsReceived / user.approvalsNeeded) * 100;
  };

  const canApprove = (user: PendingUser) => {
    return user.approvalsReceived >= user.approvalsNeeded;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Invite, approve, and manage user accounts and settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Users className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
            {pendingUsers.length} Pending
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invite">Invite Users</TabsTrigger>
          <TabsTrigger value="approve">Approve Users</TabsTrigger>
          <TabsTrigger value="pending">Pending Users</TabsTrigger>
          <TabsTrigger value="settings">User Settings</TabsTrigger>
        </TabsList>

        {/* Invite Users Tab */}
        <TabsContent value="invite" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Invite New User</span>
              </CardTitle>
              <CardDescription>
                Send invitations to new users with proper founder approvals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Role</Label>
                    <Select 
                      value={inviteForm.role} 
                      onValueChange={(value: 'user' | 'admin') => setInviteForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Founder Approvals ({inviteForm.founderApprovals.length}/5 selected)</Label>
                    <Badge variant={inviteForm.founderApprovals.length >= 3 ? "default" : "destructive"}>
                      {inviteForm.founderApprovals.length >= 3 ? "Valid Quorum" : "Need 3 minimum"}
                    </Badge>
                  </div>
                  {inviteForm.role === 'admin' && inviteForm.founderApprovals.length < 5 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Admin role requires all 5 founder approvals. Currently selected: {inviteForm.founderApprovals.length}/5
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {mockFounders.map((founder) => (
                      <div key={founder.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          id={founder.id}
                          checked={inviteForm.founderApprovals.includes(founder.id)}
                          onChange={() => handleFounderToggle(founder.id)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={founder.id} className="flex-1 cursor-pointer">
                          {founder.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isInviting || !inviteForm.email || inviteForm.founderApprovals.length < (inviteForm.role === 'admin' ? 5 : 3)}
                >
                  {isInviting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approve Users Tab */}
        <TabsContent value="approve" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Approve Users</span>
              </CardTitle>
              <CardDescription>
                Review and approve pending user registrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select User to Approve</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a pending user" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingUsers.filter(user => canApprove(user)).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} - {user.requestedRole} ({user.approvalsReceived}/{user.approvalsNeeded} approvals)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned Role (Optional Override)</Label>
                <Select value={assignedRole} onValueChange={(value: 'user' | 'admin') => setAssignedRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => selectedUser && handleApproveUser(selectedUser)}
                disabled={!selectedUser}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve User
              </Button>

              {pendingUsers.filter(user => canApprove(user)).length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No users currently have sufficient approvals for activation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Users Table Tab */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Users</CardTitle>
                  <CardDescription>
                    Users awaiting approval with actions
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedUsers.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {paginatedUsers.map((user) => (
                        <div key={user.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{user.email}</div>
                              <div className="text-sm text-muted-foreground">
                                Requested: {user.requestedRole} • Invited: {new Date(user.invitedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={canApprove(user) ? "default" : "secondary"}>
                                {user.approvalsReceived}/{user.approvalsNeeded} approvals
                              </Badge>
                              <Badge variant="outline">
                                {user.requestedRole}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Approval Progress</span>
                              <span>{Math.round(getApprovalProgress(user))}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  canApprove(user) ? 'bg-accent' : 'bg-primary'
                                }`}
                                style={{ width: `${getApprovalProgress(user)}%` }}
                              />
                            </div>
                          </div>

                          {/* Founder approvals */}
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">Founder Approvals:</div>
                            <div className="flex flex-wrap gap-1">
                              {mockFounders.map((founder) => (
                                <Badge 
                                  key={founder.id}
                                  variant={user.founderApprovals.includes(founder.id) ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {founder.name}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectUser(user.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveUser(user.id)}
                              disabled={!canApprove(user)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPendingUsers.length)} of {filteredPendingUsers.length} users
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No pending users found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Trading Preferences</span>
              </CardTitle>
              <CardDescription>
                Configure your personal trading settings and risk parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stopLoss">Stop-loss Multiplier</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      min="0.1"
                      max="1.0"
                      step="0.01"
                      value={userSettings.stopLossMultiplier}
                      onChange={(e) => setUserSettings(prev => ({ 
                        ...prev, 
                        stopLossMultiplier: parseFloat(e.target.value) || 0 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">Range: 0.1 - 1.0</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="takeProfit">Take-profit Multiplier</Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      min="1.0"
                      step="0.1"
                      value={userSettings.takeProfitMultiplier}
                      onChange={(e) => setUserSettings(prev => ({ 
                        ...prev, 
                        takeProfitMultiplier: parseFloat(e.target.value) || 1 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">Minimum: 1.0</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trailingStop">Trailing Stop</Label>
                    <Input
                      id="trailingStop"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={userSettings.trailingStop}
                      onChange={(e) => setUserSettings(prev => ({ 
                        ...prev, 
                        trailingStop: parseFloat(e.target.value) || 0 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">Must be greater than 0</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Risk Tier</Label>
                    <Select 
                      value={userSettings.riskTier} 
                      onValueChange={(value: 'low' | 'medium' | 'high') => 
                        setUserSettings(prev => ({ ...prev, riskTier: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <Switch
                    id="newsAnalysis"
                    checked={userSettings.newsAnalysisEnabled}
                    onCheckedChange={(checked) => setUserSettings(prev => ({ 
                      ...prev, 
                      newsAnalysisEnabled: checked 
                    }))}
                  />
                  <div className="flex-1">
                    <Label htmlFor="newsAnalysis" className="cursor-pointer">
                      Enable News Analysis
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Include news sentiment analysis in trading signals
                    </p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isUpdatingSettings}
                >
                  {isUpdatingSettings ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Saving Settings...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
