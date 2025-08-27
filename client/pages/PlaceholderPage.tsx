import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Construction, MessageSquare, ArrowRight } from 'lucide-react';

const sectionDescriptions: Record<string, { title: string; description: string; features: string[] }> = {
  // User sections
  notifications: {
    title: 'Notifications',
    description: 'System notifications and alerts management',
    features: ['View paginated notifications', 'Filter by severity levels', 'Mark notifications as read', 'Real-time alert system']
  },
  reports: {
    title: 'Reports & Analytics',
    description: 'Comprehensive reporting and analytics dashboard',
    features: ['Daily and weekly reports', 'Per-asset performance analysis', 'Export capabilities to CSV', 'Performance tracking']
  },
  // Admin sections
  governance: {
    title: 'Governance & Feedback',
    description: 'Manage proposals, voting, deployment, and feedback collection',
    features: ['Create and manage proposals', 'Cast votes on proposals', 'Deploy approved strategies', 'View feedback summary', 'Submit feedback for audit']
  },
  users: {
    title: 'User Management',
    description: 'Invite users, approve registrations, and manage user settings',
    features: ['Invite new users with role assignment', 'Approve pending user registrations', 'View paginated user lists', 'Manage user settings and preferences']
  },
  'admin/portfolio': {
    title: 'Portfolio Management',
    description: 'Admin overview of all portfolios and rebalancing operations',
    features: ['View all user portfolios with pagination', 'Trigger system-wide rebalancing', 'Monitor aggregate performance', 'Asset allocation management']
  },
  'admin/markets': {
    title: 'Market Eligibility',
    description: 'Monitor eligible markets with filtering and sorting capabilities',
    features: ['Filter markets by status and metrics', 'View market data including volatility and volume', 'Sort by profitability and other criteria', 'Real-time market data refresh']
  },
  'admin/models': {
    title: 'Model Management',
    description: 'Train, deploy, and manage ML models for trading strategies',
    features: ['Start and monitor training jobs', 'Deploy trained models', 'View model registry and history', 'Shadow testing and rollback capabilities']
  },
  'admin/system/config': {
    title: 'System Configuration',
    description: 'Manage runtime and system settings',
    features: ['View and update runtime configuration', 'Manage system settings', 'User settings management', 'Configuration validation and reset']
  },
  'admin/system/control': {
    title: 'System Control',
    description: 'Control system operations and trading modes',
    features: ['Pause and resume system operations', 'Set trading modes (Simulation, Dry-Run, Live)', 'Monitor system status', 'Audit log management']
  },
  'admin/backtest': {
    title: 'Backtest Report',
    description: 'Download and analyze backtesting results',
    features: ['Download latest backtest reports', 'Stream JSON report data', 'Historical backtest analysis', 'Performance comparison']
  },
  'admin/builder': {
    title: 'Builder.io Page Editor',
    description: 'Edit and manage Builder.io content pages',
    features: ['Load pages by ID', 'Edit page content with JSON editor', 'Preview changes', 'Save updates to Builder.io']
  },
  'admin/feedback': {
    title: 'Feedback Management',
    description: 'Submit and manage user feedback',
    features: ['Submit feedback comments', 'Audit trail maintenance', 'Feedback categorization', 'Response management']
  }
};

export default function PlaceholderPage() {
  const { section } = useParams<{ section: string }>();
  const sectionInfo = section ? sectionDescriptions[section] : null;

  if (!sectionInfo) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Page Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The requested section could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{sectionInfo.title}</h1>
          <p className="text-muted-foreground">
            {sectionInfo.description}
          </p>
        </div>
        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
          <Construction className="h-3 w-3 mr-1" />
          In Development
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Construction className="h-5 w-5 text-warning" />
            <span>Coming Soon</span>
          </CardTitle>
          <CardDescription>
            This section is currently under development. Below are the planned features for this module.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Planned Features</h3>
            <div className="grid gap-3">
              {sectionInfo.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-primary">Want this feature implemented?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Let us know which features are most important to you. Continue prompting to have specific 
                  sections built out with full functionality.
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Implementation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
