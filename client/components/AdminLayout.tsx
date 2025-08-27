import { Outlet, Navigate, useLocation } from 'react-router-dom';
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
  FileEdit,
  MessageSquare,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null
  },
  {
    title: 'Governance',
    href: '/governance',
    icon: Vote,
    badge: null
  },
  {
    title: 'User Management',
    href: '/users',
    icon: Users,
    badge: '3'
  },
  {
    title: 'Portfolio',
    href: '/portfolio',
    icon: Briefcase,
    badge: null
  },
  {
    title: 'Markets',
    href: '/markets',
    icon: TrendingUp,
    badge: null
  },
  {
    title: 'Models',
    href: '/models',
    icon: Brain,
    badge: null
  },
  {
    title: 'System Config',
    href: '/system/config',
    icon: Settings,
    badge: null
  },
  {
    title: 'System Control',
    href: '/system/control',
    icon: PlayCircle,
    badge: null
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    badge: null
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    badge: '12'
  },
  {
    title: 'Feedback',
    href: '/feedback',
    icon: MessageSquare,
    badge: null
  }
];

export default function AdminLayout() {
  const { user, logout, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard' && location.pathname === '/') return true;
    return location.pathname.startsWith(href);
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
          <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h1 className="font-semibold text-sidebar-foreground">Project Aether</h1>
                <p className="text-xs text-sidebar-foreground/60">Admin Portal</p>
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
              {navigationItems.map((item) => {
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
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {user.role}
                </p>
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
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-4 ml-auto">
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
              System Status: Active
            </Badge>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Live Trading</span>
            </div>
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
