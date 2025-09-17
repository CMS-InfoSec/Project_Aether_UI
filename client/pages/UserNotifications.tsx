import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  RefreshCw, 
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  AlertCircle,
  User,
  Settings as SettingsIcon,
  Shield
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  category: 'system' | 'trading' | 'user' | 'security';
  actionRequired: boolean;
  metadata?: any;
}

interface NotificationData {
  notifications: Notification[];
  summary: {
    total: number;
    unread: number;
    actionRequired: number;
    severityCounts: Record<string, number>;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const SEVERITY_COLORS = {
  error: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  success: 'bg-green-100 text-green-800 border-green-200'
};

const SEVERITY_ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2
};

const CATEGORY_ICONS = {
  system: SettingsIcon,
  trading: RefreshCw,
  user: User,
  security: Shield
};

export default function UserNotifications() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [notifications, setNotifications] = useState<NotificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [prefs, setPrefs] = useState<{ supported_channels: string[]; channels: Record<string, boolean> }|null>(null);

  // URL-based filter and pagination state
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('limit') || '10', 10);
  const severityFilter = searchParams.get('severity') || 'all';
  const categoryFilter = searchParams.get('category') || 'all';
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  // Utility functions
  const getSeverityIcon = (severity: string) => {
    const IconComponent = SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || Info;
    return <IconComponent className="h-4 w-4" />;
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Info;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return time.toLocaleDateString();
  };

  // Update URL parameters
  const updateFilters = useCallback((newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    // Reset to page 1 when filters change (except when only page changes)
    if (!newParams.page) {
      params.delete('page');
    }
    
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Load notifications
  const loadPreferences = useCallback(async ()=>{
    try{
      const r = await fetch('/api/notifications/preferences');
      const j = await r.json();
      if (j.status==='success') setPrefs(j.data);
    }catch{}
  },[]);

  const loadNotifications = useCallback(async () => {
    if (!isLoading) setIsRefreshing(true);
    
    try {
      const params = new URLSearchParams();
      
      // Pagination
      const offset = (currentPage - 1) * pageSize;
      params.set('limit', pageSize.toString());
      params.set('offset', offset.toString());
      
      // Filters
      if (severityFilter !== 'all') {
        params.set('severity', severityFilter);
      }
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter);
      }
      if (unreadOnly) {
        params.set('unreadOnly', 'true');
      }

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setNotifications(data.data);
      } else {
        throw new Error(data.error || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('Load notifications error:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, severityFilter, categoryFilter, unreadOnly]);

  // Mark notification as read
  const markAsRead = async (notificationId: string, read: boolean = true) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read })
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map(n => 
              n.id === notificationId ? { ...n, read } : n
            ),
            summary: {
              ...prev.summary,
              unread: prev.summary.unread + (read ? -1 : 1)
            }
          };
        });
        
        toast({
          title: read ? "Marked as Read" : "Marked as Unread",
          description: `Notification has been ${read ? 'marked as read' : 'marked as unread'}.`,
        });
      } else {
        throw new Error('Failed to update notification');
      }
    } catch (error) {
      console.error('Mark as read error:', error);
      toast({
        title: "Error",
        description: "Failed to update notification status.",
        variant: "destructive",
      });
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });

      if (response.ok) {
        await loadNotifications();
        toast({
          title: "All Marked as Read",
          description: "All notifications have been marked as read.",
        });
      } else {
        throw new Error('Failed to mark all as read');
      }
    } catch (error) {
      console.error('Mark all as read error:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    }
  };

  // Toggle notification expansion
  const toggleExpansion = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // Pagination controls
  const totalPages = notifications ? Math.ceil(notifications.pagination.total / pageSize) : 0;
  
  const goToPage = (page: number) => {
    updateFilters({ page: page.toString() });
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(Math.max(1, currentPage - 1));
  const goToNextPage = () => goToPage(Math.min(totalPages, currentPage + 1));

  // Load notifications when filters change
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Load preferences on mount
  useEffect(()=>{ loadPreferences(); }, [loadPreferences]);

  // Auto-refresh polling
  useEffect(()=>{
    if (!autoRefresh) return;
    const t = window.setInterval(()=>{ loadNotifications(); }, 30000);
    return ()=> window.clearInterval(t);
  }, [autoRefresh, loadNotifications]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view notifications.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Bell className="h-8 w-8" />
            <span>Notifications</span>
          </h1>
          <p className="text-muted-foreground">
            Stay updated with important alerts and system messages
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 mr-2 text-sm">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto-refresh">Auto-refresh 30s</Label>
          </div>
          {notifications?.summary.unread > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark All Read
            </Button>
          )}
          <Button
            variant="outline"
            onClick={loadNotifications}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {notifications && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{notifications.summary.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{notifications.summary.unread}</div>
                <div className="text-xs text-muted-foreground">Unread</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{notifications.summary.actionRequired}</div>
                <div className="text-xs text-muted-foreground">Action Required</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{notifications.summary.severityCounts.warning || 0}</div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={severityFilter}
                onValueChange={(value) => updateFilters({ severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => updateFilters({ category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Page Size</Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => updateFilters({ limit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="unread-only"
                checked={unreadOnly}
                onCheckedChange={(checked) => updateFilters({ unreadOnly: checked ? 'true' : null })}
              />
              <Label htmlFor="unread-only">Show unread only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      {prefs && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Select channels for alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              {prefs.supported_channels.includes('email') && (
                <label className="flex items-center space-x-2"><input type="checkbox" checked={!!prefs.channels.email} onChange={(e)=> setPrefs(p=> p? ({...p, channels:{...p.channels, email: e.target.checked}}): p)} /><span>Email</span></label>
              )}
              {prefs.supported_channels.includes('slack') && (
                <label className="flex items-center space-x-2"><input type="checkbox" checked={!!prefs.channels.slack} onChange={(e)=> setPrefs(p=> p? ({...p, channels:{...p.channels, slack: e.target.checked}}): p)} /><span>Slack</span></label>
              )}
              {prefs.supported_channels.includes('telegram') && (
                <label className="flex items-center space-x-2"><input type="checkbox" checked={!!prefs.channels.telegram} onChange={(e)=> setPrefs(p=> p? ({...p, channels:{...p.channels, telegram: e.target.checked}}): p)} /><span>Telegram</span></label>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={async ()=>{
                try{
                  const r = await fetch('/api/notifications/preferences',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ channels: prefs.channels })});
                  const j = await r.json();
                  if (!r.ok || j.status!=='success') throw new Error(j.error||'Failed');
                  toast({ title:'Saved', description:'Preferences updated' });
                }catch(e:any){ toast({ title:'Error', description: e.message||'Failed', variant:'destructive' }); }
              }}>Save Preferences</Button>
              <Button variant="outline" onClick={loadPreferences}>Reload</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {notifications ? (
              `${notifications.pagination.total} Notification${notifications.pagination.total !== 1 ? 's' : ''}`
            ) : (
              'Loading...'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications && notifications.notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.notifications.map((notification) => {
                const isExpanded = expandedNotifications.has(notification.id);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      notification.read ? 'bg-muted/20' : 'bg-background border-primary/20'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getCategoryIcon(notification.category)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className={`font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {notification.title}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`${SEVERITY_COLORS[notification.severity]} border`}
                              >
                                <span className="flex items-center space-x-1">
                                  {getSeverityIcon(notification.severity)}
                                  <span className="capitalize">{notification.severity}</span>
                                </span>
                              </Badge>
                              {notification.actionRequired && (
                                <Badge variant="destructive" className="text-xs">
                                  Action Required
                                </Badge>
                              )}
                            </div>
                            
                            <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground'} ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTimeAgo(notification.timestamp)}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {notification.category}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpansion(notification.id)}
                            >
                              {isExpanded ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id, !notification.read)}
                            >
                              {notification.read ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {isExpanded && notification.metadata && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md">
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">Additional Details:</h4>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {JSON.stringify(notification.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No notifications found</h3>
              <p className="text-sm text-muted-foreground">
                {unreadOnly ? 'No unread notifications available.' : 'You\'re all caught up!'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {notifications && totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, notifications.pagination.total)} of {notifications.pagination.total} notifications
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-muted-foreground">Page</span>
                  <Input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value, 10);
                      if (page >= 1 && page <= totalPages) {
                        goToPage(page);
                      }
                    }}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-sm text-muted-foreground">of {totalPages}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
