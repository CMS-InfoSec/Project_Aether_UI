import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Vote, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Rocket,
  MessageSquare,
  Send
} from 'lucide-react';
import { useState } from 'react';

export default function Governance() {
  const [activeTab, setActiveTab] = useState('proposals');
  const [newProposal, setNewProposal] = useState({ id: '', description: '' });
  const [selectedProposal, setSelectedProposal] = useState('');
  const [voteData, setVoteData] = useState({ founderId: '', approve: false });
  const [feedback, setFeedback] = useState('');

  const mockProposals = [
    { id: 'PROP-001', description: 'Increase BTC allocation to 40%', status: 'pending', votes: 2, required: 3 },
    { id: 'PROP-002', description: 'Add AVAX to portfolio', status: 'approved', votes: 3, required: 3 },
    { id: 'PROP-003', description: 'Implement new risk model', status: 'voting', votes: 1, required: 3 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-accent/10 text-accent border-accent/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'voting': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Governance & Feedback</h1>
          <p className="text-muted-foreground">
            Manage proposals, voting, deployment, and feedback collection
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Vote className="h-3 w-3 mr-1" />
          Admin Access
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="voting">Voting</TabsTrigger>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Create Proposal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Create Proposal</span>
                </CardTitle>
                <CardDescription>
                  Submit a new proposal for founder review and voting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proposalId">Proposal ID</Label>
                  <Input
                    id="proposalId"
                    placeholder="PROP-004"
                    value={newProposal.id}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the proposal details..."
                    value={newProposal.description}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proposal
                </Button>
              </CardContent>
            </Card>

            {/* Existing Proposals */}
            <Card>
              <CardHeader>
                <CardTitle>Active Proposals</CardTitle>
                <CardDescription>
                  Current proposals and their voting status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockProposals.map((proposal) => (
                    <div key={proposal.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{proposal.id}</div>
                        <Badge className={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {proposal.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{proposal.votes}/{proposal.required} votes</span>
                        <div className="w-16 bg-muted rounded-full h-1">
                          <div 
                            className="bg-primary h-1 rounded-full" 
                            style={{ width: `${(proposal.votes / proposal.required) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="voting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Vote className="h-5 w-5" />
                <span>Cast Vote</span>
              </CardTitle>
              <CardDescription>
                Vote on pending proposals requiring founder approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Proposal</Label>
                <Select value={selectedProposal} onValueChange={setSelectedProposal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a proposal to vote on" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProposals.filter(p => p.status === 'voting').map((proposal) => (
                      <SelectItem key={proposal.id} value={proposal.id}>
                        {proposal.id} - {proposal.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="founderId">Founder ID</Label>
                <Input
                  id="founderId"
                  placeholder="Enter founder ID"
                  value={voteData.founderId}
                  onChange={(e) => setVoteData(prev => ({ ...prev, founderId: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approve"
                  checked={voteData.approve}
                  onCheckedChange={(checked) => setVoteData(prev => ({ ...prev, approve: !!checked }))}
                />
                <Label htmlFor="approve">Approve this proposal</Label>
              </div>
              <Button className="w-full" disabled={!selectedProposal || !voteData.founderId}>
                <Vote className="h-4 w-4 mr-2" />
                Cast Vote
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deploy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Rocket className="h-5 w-5" />
                <span>Deploy Strategy</span>
              </CardTitle>
              <CardDescription>
                Deploy approved proposals to production
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {mockProposals.filter(p => p.status === 'approved').map((proposal) => (
                  <div key={proposal.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{proposal.id}</div>
                        <p className="text-sm text-muted-foreground">{proposal.description}</p>
                        <Badge className="mt-2 bg-accent/10 text-accent border-accent/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved ({proposal.votes}/{proposal.required})
                        </Badge>
                      </div>
                      <Button>
                        <Rocket className="h-4 w-4 mr-2" />
                        Deploy
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {mockProposals.filter(p => p.status === 'approved').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No approved proposals ready for deployment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Submit Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Submit Feedback</span>
                </CardTitle>
                <CardDescription>
                  Submit feedback for audit and review
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedback">Comment</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Enter your feedback or comments..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button className="w-full" disabled={!feedback.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </Button>
              </CardContent>
            </Card>

            {/* Feedback Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Summary</CardTitle>
                <CardDescription>
                  Aggregated feedback statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">24</div>
                      <div className="text-sm text-muted-foreground">Total Submissions</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-accent">18</div>
                      <div className="text-sm text-muted-foreground">Reviewed</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-warning">6</div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-destructive">3</div>
                      <div className="text-sm text-muted-foreground">High Priority</div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    View Detailed Feedback
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
