import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Vote,
  Briefcase,
  TrendingUp,
  Brain,
  Settings,
  PlayCircle,
  BarChart3,
  Bell,
  MessageSquare,
  LogOut,
  Menu,
  X,
  CandlestickChart,
  Wallet,
  User,
  PieChart,
  Shield,
  Download,
  Bot,
  Activity,
  FileText,
  Cog
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, Navigate, Outlet } from 'react-router-dom';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// User navigation items (accessible to both USER and ADMIN roles)
const userNavigationItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: null },
  { title: 'Trades & Positions', href: '/trades', icon: CandlestickChart, badge: null },
  { title: 'Wallet & Hedge', href: '/wallet', icon: Wallet, badge: null },
  { title: 'AI Assistant', href: '/assistant', icon: Bot, badge: null },
  { title: 'Strategies & Signals', href: '/strategies', icon: TrendingUp, badge: null },
  { title: 'Observability & Health', href: '/observability', icon: Activity, badge: null },
  { title: 'Audit & Logs', href: '/audit', icon: FileText, badge: null },
  { title: 'Profile & Settings', href: '/profile', icon: User, badge: null },
  { title: 'Notifications', href: '/notifications', icon: Bell, badge: null },
  { title: 'Reports & Analytics', href: '/reports', icon: BarChart3, badge: null }
];

// Admin-only navigation items
const adminNavigationItems = [
  {
    title: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: Shield,
    badge: null
  },
  {
    title: 'Governance',
    href: '/admin/governance',
    icon: Vote,
    badge: null
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    badge: '3'
  },
  {
    title: 'Portfolio Management',
    href: '/admin/portfolio',
    icon: Briefcase,
    badge: null
  },
  {
    title: 'Market Eligibility',
    href: '/admin/markets',
    icon: TrendingUp,
    badge: null
  },
  {
    title: 'Model Management',
    href: '/admin/models',
    icon: Brain,
    badge: null
  },
  {
    title: 'Adaptive Strategy Controller',
    href: '/admin/asc',
    icon: Settings,
    badge: null
  },
  {
    title: 'System Config',
    href: '/admin/system/config',
    icon: Settings,
    badge: null
  },
  {
    title: 'System Control',
    href: '/admin/system/control',
    icon: PlayCircle,
    badge: null
  },
  {
    title: 'Backtest Report',
    href: '/admin/backtest',
    icon: Download,
    badge: null
  },
  {
    title: 'Feedback',
    href: '/admin/feedback',
    icon: MessageSquare,
    badge: null
  },
  {
    title: 'Strategy Review',
    href: '/admin/strategy-review',
    icon: Vote,
    badge: null
  },
  {
    title: 'Plugins',
    href: '/admin/plugins',
    icon: Brain,
    badge: null
  },
  {
    title: 'Automation Social',
    href: '/admin/automation-social',
    icon: Activity,
    badge: null
  },
  {
    title: 'Push Console',
    href: '/admin/push-console',
    icon: Bell,
    badge: null
  },
  {
    title: 'System Tasks',
    href: '/admin/system/tasks',
    icon: Settings,
    badge: null
  }
];

export default function AppLayout() {
  const { user, logout, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  // Top bar status polling
  const API_KEY = 'aether-admin-key-2024';
  const backendUrl = useMemo(() => localStorage.getItem('aether-backend-url') || window.location.origin, []);
  const [mode, setMode] = useState<string>('live');
  const [killSwitch, setKillSwitch] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Active');
  const apiRequest = useCallback(async (path: string) => {
    const url = path.startsWith('http') ? path : `${backendUrl.replace(/\/+$/, '')}${path}`;
    return fetch(url, { headers: { 'X-API-Key': API_KEY } });
  }, [backendUrl]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const m = await apiRequest('/api/system/mode');
        if (m.ok) { const d = await m.json(); if (!cancelled) setMode(d.data.mode); }
        const s = await apiRequest('/api/system/status');
        if (s.ok) { const j = await s.json(); if (!cancelled) { setKillSwitch(!!j.data.killSwitchEnabled); setStatusText(j.data.isPaused ? 'Paused' : 'Active'); } }
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [apiRequest]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Determine which navigation items to show based on user role
  const navigationItems = user.role === 'admin' 
    ? [...userNavigationItems, ...adminNavigationItems]
    : userNavigationItems;

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard' && location.pathname === '/') return true;
    return location.pathname.startsWith(href);
  };

  const getUserRoleBadge = () => {
    return user.role === 'admin' ? 'Admin' : 'User';
  };

  const getUserRoleColor = () => {
    return user.role === 'admin' 
      ? 'bg-destructive/10 text-destructive border-destructive/20'
      : 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border" style={{ backgroundColor: '#10141D' }}>
            <div className="flex items-center space-x-3">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fd9af307b1ff14040a7ba27bfc11d5227%2Ffd066184d3bd44f2ab4e38cf3625b126?format=webp&width=800"
                alt="Aether Logo"
                className="w-8 h-8 object-contain"
              />
              <div>
                <h1 className="font-semibold text-white">AETHER</h1>
                <p className="text-xs text-white/80">AI Trading Platform</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {user.role === 'admin' && (
                <>
                  {/* User Section */}
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                      User Features
                    </h3>
                  </div>
                  {userNavigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    
                    return (
                      <Link key={item.href} to={item.href}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start h-10 px-3",
                            isActive 
                              ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          <span className="flex-1 text-left">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto bg-accent text-accent-foreground">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    );
                  })}

                  <Separator className="my-2" />

                  {/* Admin Section */}
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                      Admin Features
                    </h3>
                  </div>
                  {adminNavigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    
                    return (
                      <Link key={item.href} to={item.href}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start h-10 px-3",
                            isActive 
                              ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          <span className="flex-1 text-left">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto bg-accent text-accent-foreground">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                </>
              )}

              {/* Regular User Navigation */}
              {user.role === 'user' && navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                
                return (
                  <Link key={item.href} to={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start h-10 px-3",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      <span className="flex-1 text-left">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto bg-accent text-accent-foreground">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-medium text-sm">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.email}
                </p>
                <div className="flex items-center space-x-2">
                  <Badge className={getUserRoleColor()}>
                    {getUserRoleBadge()}
                  </Badge>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6" style={{ backgroundColor: '#10141D' }}>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-3 ml-auto">
            <Badge variant={killSwitch ? 'destructive' : 'outline'} className="text-white border-accent/30">
              {killSwitch ? 'Kill Switch Enabled' : `System Status: ${statusText}`}
            </Badge>
            <div className="flex items-center space-x-2 text-sm text-white/90">
              <div className={`w-2 h-2 rounded-full ${mode?.toLowerCase() === 'live' ? 'bg-green-500' : mode?.toLowerCase() === 'dry-run' ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
              <span className="capitalize">{mode} Mode</span>
            </div>
            <Link to="/notifications" className="text-white/90 hover:text-white" aria-label="Open Alert Center">
              <Bell className="h-5 w-5" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-white/10 flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem disabled>{user.role === 'admin' ? 'Admin' : 'User'}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <Dialog>
                  <DialogTrigger asChild>
                    <DropdownMenuItem>
                      <MessageSquare className="h-4 w-4 mr-2" /> Feedback
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Feedback</DialogTitle>
                      <DialogDescription>We value your input.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="feedback">Feedback</Label>
                      <Textarea id="feedback" placeholder="Share details" onChange={(e)=> (window as any)._fb = e.target.value} />
                    </div>
                    <DialogFooter>
                      <Button onClick={async ()=>{
                        const msg = (window as any)._fb || '';
                        if (!msg || String(msg).trim().length === 0) { toast({ title:'Validation', description:'Feedback is required', variant:'destructive' }); return; }
                        try {
                          const r = await fetch('/api/feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: msg }) });
                          if (r.ok) { toast({ title:'Thanks!', description:'Feedback submitted.' }); (document.querySelector('[data-radix-dialog-close]') as HTMLElement)?.click(); }
                          else { const j = await r.json().catch(()=>({detail:'Failed'})); toast({ title:'Error', description:j.detail || 'Failed', variant:'destructive' }); }
                        } catch { toast({ title:'Error', description:'Network error', variant:'destructive' }); }
                      }}>Submit</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <DropdownMenuItem>
                      <Cog className="h-4 w-4 mr-2" /> Global Settings
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Global Settings</DialogTitle>
                      <DialogDescription>Saved settings load on boot from localStorage.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="apiBaseUrl">API Base URL</Label>
                        <Input id="apiBaseUrl" defaultValue={backendUrl} />
                      </div>
                      <div>
                        <Label htmlFor="wsUrl">WebSocket URL (optional)</Label>
                        <Input id="wsUrl" defaultValue={localStorage.getItem('aether-ws-url') || ''} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" onClick={async ()=>{
                          const base = (document.getElementById('apiBaseUrl') as HTMLInputElement)?.value?.trim();
                          if (!base) { toast({ title:'Validation', description:'API Base URL is required', variant:'destructive' }); return; }
                          try {
                            const url = base.replace(/\/+$/, '') + '/api/health/live';
                            const s = performance.now();
                            const r = await fetch(url);
                            const latency = Math.round(performance.now() - s);
                            toast({ title: r.ok ? 'Connection OK' : 'Connection Failed', description: r.ok ? `Latency ~${latency} ms` : `${r.status} ${r.statusText}`, variant: r.ok ? 'default' : 'destructive' });
                          } catch { toast({ title:'Connection Failed', description:'Network error', variant:'destructive' }); }
                        }}>Test Connection</Button>
                        <Button onClick={()=>{
                          const base = (document.getElementById('apiBaseUrl') as HTMLInputElement)?.value?.trim();
                          const ws = (document.getElementById('wsUrl') as HTMLInputElement)?.value?.trim();
                          if (!base) { toast({ title:'Validation', description:'API Base URL is required', variant:'destructive' }); return; }
                          localStorage.setItem('aether-backend-url', base.replace(/\/+$/, ''));
                          if (ws) localStorage.setItem('aether-ws-url', ws); else localStorage.removeItem('aether-ws-url');
                          toast({ title:'Saved', description:'Settings saved. Reinitializing…' });
                          (document.querySelector('[data-radix-dialog-close]') as HTMLElement)?.click();
                          window.location.reload();
                        }}>Save</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/openapi.json" target="_blank" rel="noreferrer">API Documentation</a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
