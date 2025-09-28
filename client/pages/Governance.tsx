import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import apiFetch from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Vote,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Rocket,
  MessageSquare,
  Send,
  RefreshCw,
  Eye,
  Users,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import ASCModelsPanel from "./components/ASCModelsPanel";
import ComplianceAuditTab from "./components/ComplianceAuditTab";
import ModelLineagePanel from "./components/ModelLineagePanel";
import ModelComparisonTab from "./components/ModelComparisonTab";
import RegulatoryReportsTab from "./components/RegulatoryReportsTab";
import ComplianceForecastPanel from "./components/ComplianceForecastPanel";

// Types
interface Proposal {
  id: string;
  description: string;
  status: "pending" | "voting" | "approved" | "rejected" | "deployed";
  votes: Vote[];
  requiredVotes: number;
  createdAt: string;
  createdBy: string;
  deployedAt?: string;
  deploymentStatus?: "success" | "failed" | "in_progress";
  voteCount?: number;
  approvalCount?: number;
  canDeploy?: boolean;
}

interface Vote {
  founderId: string;
  approve: boolean;
  votedAt: string;
}

interface FeedbackSummary {
  totalSubmissions: number;
  reviewed: number;
  pending: number;
  highPriority: number;
  recentEntries: Array<{
    id: string;
    comment: string;
    submittedBy: string;
    submittedAt: string;
    status: string;
  }>;
}

export default function Governance() {
  const [activeTab, setActiveTab] = useState("proposals");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [feedbackSummary, setFeedbackSummary] =
    useState<FeedbackSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Proposal creation state
  const [newProposal, setNewProposal] = useState({ id: "", description: "" });
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);

  // Voting state
  const [selectedProposal, setSelectedProposal] = useState("");
  const [voteData, setVoteData] = useState({ founderId: "", approve: false });
  const [isCastingVote, setIsCastingVote] = useState(false);

  // Deployment state
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [deployingProposal, setDeployingProposal] = useState<Proposal | null>(
    null,
  );
  const [isDeploying, setIsDeploying] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Available founders (in production, this would come from an API)
  const founders = ["founder1", "founder2", "founder3", "founder4", "founder5"];

  // Fetch proposals
  const fetchProposals = async () => {
    try {
      const response = await apiFetch("/api/admin/proposals");
      const data = await response.json();

      if (data.status === "success") {
        setProposals(data.data);
      } else {
        console.error("Failed to fetch proposals:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch proposals:", error);
    }
  };

  // Fetch feedback summary
  const fetchFeedbackSummary = async () => {
    try {
      const response = await apiFetch("/api/admin/feedback");
      const data = await response.json();

      if (data.status === "success") {
        setFeedbackSummary(data.data);
      } else {
        console.error("Failed to fetch feedback:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchProposals(), fetchFeedbackSummary()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Create proposal
  const handleCreateProposal = async () => {
    if (!newProposal.id.trim() || !newProposal.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Both Proposal ID and Description are required.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingProposal(true);
    try {
      const response = await apiFetch(
        `/api/admin/proposals/${newProposal.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            proposalId: newProposal.id,
            description: newProposal.description,
          }),
        },
      );

      const data = await response.json();

      if (data.status === "success") {
        toast({
          title: "Proposal Created",
          description: `Proposal ${newProposal.id} created successfully.`,
        });

        // Reset form and refresh proposals
        setNewProposal({ id: "", description: "" });
        await fetchProposals();
      } else {
        throw new Error(data.error || "Failed to create proposal");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create proposal.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingProposal(false);
    }
  };

  // Cast vote
  const handleCastVote = async () => {
    if (!selectedProposal || !voteData.founderId) {
      toast({
        title: "Validation Error",
        description: "Please select a proposal and enter founder ID.",
        variant: "destructive",
      });
      return;
    }

    setIsCastingVote(true);
    try {
      const response = await apiFetch(
        `/api/admin/proposals/${selectedProposal}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(voteData),
        },
      );

      const data = await response.json();

      if (data.status === "success") {
        toast({
          title: "Vote Cast",
          description: `Vote ${voteData.approve ? "approved" : "rejected"} for proposal ${selectedProposal}.`,
        });

        // Reset form and refresh proposals
        setSelectedProposal("");
        setVoteData({ founderId: "", approve: false });
        await fetchProposals();
      } else {
        throw new Error(data.error || "Failed to cast vote");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to cast vote.",
        variant: "destructive",
      });
    } finally {
      setIsCastingVote(false);
    }
  };

  // Deploy proposal
  const handleDeployProposal = async () => {
    if (!deployingProposal) return;

    setIsDeploying(true);
    try {
      const response = await apiFetch(
        `/api/admin/deploy/${deployingProposal.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.status === "success") {
        toast({
          title: "Deployment Successful",
          description: `Proposal ${deployingProposal.id} deployed at ${new Date(data.data.deployedAt).toLocaleString()}.`,
        });

        // Close dialog and refresh proposals
        setIsDeployDialogOpen(false);
        setDeployingProposal(null);
        await fetchProposals();
      } else {
        throw new Error(data.error || "Failed to deploy proposal");
      }
    } catch (error) {
      toast({
        title: "Deployment Failed",
        description:
          error instanceof Error ? error.message : "Failed to deploy proposal.",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // Submit feedback
  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter feedback comment.",
        variant: "destructive",
      });
      return;
    }

    if (feedback.trim().length < 10) {
      toast({
        title: "Validation Error",
        description: "Feedback must be at least 10 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const response = await apiFetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment: feedback }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast({
          title: "Feedback Submitted",
          description: "Your feedback has been submitted for review.",
        });

        // Clear form and refresh feedback summary
        setFeedback("");
        await fetchFeedbackSummary();
      } else {
        throw new Error(data.error || "Failed to submit feedback");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to submit feedback.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Utility functions
  const getStatusBadge = (status: string) => {
    const variants = {
      approved: {
        variant: "default" as const,
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      pending: {
        variant: "secondary" as const,
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
      },
      voting: {
        variant: "outline" as const,
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Vote,
      },
      rejected: {
        variant: "destructive" as const,
        color: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
      },
      deployed: {
        variant: "default" as const,
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: Rocket,
      },
    };

    const config =
      variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge
        variant={config.variant}
        className={`flex items-center space-x-1 ${config.color}`}
      >
        <Icon className="h-3 w-3" />
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getVotingProposals = () =>
    proposals.filter((p) => p.status === "voting" || p.status === "pending");
  const getApprovedProposals = () =>
    proposals.filter((p) => p.status === "approved");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Governance & Feedback
          </h1>
          <p className="text-muted-foreground">
            Manage proposals, voting, deployment, and feedback collection
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20"
          >
            <Vote className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
          <Button
            variant="outline"
            onClick={() =>
              Promise.all([fetchProposals(), fetchFeedbackSummary()])
            }
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="voting">Voting</TabsTrigger>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
          <TabsTrigger value="asc-models">ASC Models</TabsTrigger>
          <TabsTrigger value="compliance">Compliance & Audit</TabsTrigger>
          <TabsTrigger value="compliance-forecast">Compliance Forecast</TabsTrigger>
          <TabsTrigger value="regulatory-reports">Regulatory Reports</TabsTrigger>
          <TabsTrigger value="model-lineage">Model Lineage</TabsTrigger>
          <TabsTrigger value="model-comparison">Model Comparison</TabsTrigger>
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
                    onChange={(e) =>
                      setNewProposal((prev) => ({
                        ...prev,
                        id: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the proposal details..."
                    value={newProposal.description}
                    onChange={(e) =>
                      setNewProposal((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateProposal}
                  disabled={
                    isCreatingProposal ||
                    !newProposal.id.trim() ||
                    !newProposal.description.trim()
                  }
                >
                  {isCreatingProposal ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Proposal
                    </>
                  )}
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
                  {proposals.length > 0 ? (
                    proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{proposal.id}</div>
                          {getStatusBadge(proposal.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {proposal.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {proposal.votes.length}/{proposal.requiredVotes}{" "}
                            votes (
                            {proposal.votes.filter((v) => v.approve).length}{" "}
                            approvals)
                          </span>
                          <div className="w-16 bg-muted rounded-full h-1">
                            <div
                              className="bg-primary h-1 rounded-full transition-all"
                              style={{
                                width: `${(proposal.votes.filter((v) => v.approve).length / proposal.requiredVotes) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created:{" "}
                          {new Date(proposal.createdAt).toLocaleDateString()} by{" "}
                          {proposal.createdBy}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Vote className="h-8 w-8 mx-auto mb-2" />
                      <p>No proposals found</p>
                    </div>
                  )}
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
                <Select
                  value={selectedProposal}
                  onValueChange={setSelectedProposal}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a proposal to vote on" />
                  </SelectTrigger>
                  <SelectContent>
                    {getVotingProposals().map((proposal) => (
                      <SelectItem key={proposal.id} value={proposal.id}>
                        {proposal.id} - {proposal.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="founderId">Founder ID</Label>
                <Select
                  value={voteData.founderId}
                  onValueChange={(value) =>
                    setVoteData((prev) => ({ ...prev, founderId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select founder ID" />
                  </SelectTrigger>
                  <SelectContent>
                    {founders.map((founder) => (
                      <SelectItem key={founder} value={founder}>
                        {founder}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approve"
                  checked={voteData.approve}
                  onCheckedChange={(checked) =>
                    setVoteData((prev) => ({ ...prev, approve: !!checked }))
                  }
                />
                <Label htmlFor="approve">Approve this proposal</Label>
              </div>

              {getVotingProposals().length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No proposals are currently open for voting.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                onClick={handleCastVote}
                disabled={
                  !selectedProposal || !voteData.founderId || isCastingVote
                }
              >
                {isCastingVote ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Casting Vote...
                  </>
                ) : (
                  <>
                    <Vote className="h-4 w-4 mr-2" />
                    Cast Vote
                  </>
                )}
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
                {getApprovedProposals().map((proposal) => (
                  <div key={proposal.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{proposal.id}</div>
                        <p className="text-sm text-muted-foreground">
                          {proposal.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          {getStatusBadge(proposal.status)}
                          <Badge variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {proposal.votes.filter((v) => v.approve).length}/
                            {proposal.requiredVotes} approvals
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setDeployingProposal(proposal);
                          setIsDeployDialogOpen(true);
                        }}
                        disabled={proposal.status === "deployed"}
                      >
                        <Rocket className="h-4 w-4 mr-2" />
                        {proposal.status === "deployed" ? "Deployed" : "Deploy"}
                      </Button>
                    </div>
                    {proposal.deployedAt && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Deployed:{" "}
                        {new Date(proposal.deployedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {getApprovedProposals().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No approved proposals ready for deployment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asc-models" className="space-y-6">
          <ASCModelsPanel />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <ComplianceAuditTab />
        </TabsContent>

        <TabsContent value="compliance-forecast" className="space-y-6">
          <ComplianceForecastPanel />
        </TabsContent>

        <TabsContent value="regulatory-reports" className="space-y-6">
          <RegulatoryReportsTab />
        </TabsContent>

        <TabsContent value="model-lineage" className="space-y-6">
          <ModelLineagePanel />
        </TabsContent>

        <TabsContent value="model-comparison" className="space-y-6">
          <ModelComparisonTab />
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
                  <div className="text-xs text-muted-foreground">
                    Minimum 10 characters required
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmitFeedback}
                  disabled={
                    !feedback.trim() ||
                    feedback.trim().length < 10 ||
                    isSubmittingFeedback
                  }
                >
                  {isSubmittingFeedback ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Feedback Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Summary</CardTitle>
                <CardDescription>
                  Aggregated feedback statistics and recent entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackSummary && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {feedbackSummary.totalSubmissions}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Submissions
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-accent">
                          {feedbackSummary.reviewed}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Reviewed
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-warning">
                          {feedbackSummary.pending}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Pending
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-destructive">
                          {feedbackSummary.highPriority}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          High Priority
                        </div>
                      </div>
                    </div>

                    {/* Recent Entries */}
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Recent Entries</div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {feedbackSummary.recentEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="p-2 border rounded text-xs"
                          >
                            <div className="font-medium">
                              {entry.submittedBy}
                            </div>
                            <div className="text-muted-foreground truncate">
                              {entry.comment}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-muted-foreground">
                                {new Date(
                                  entry.submittedAt,
                                ).toLocaleDateString()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {entry.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View All Feedback
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Deployment Confirmation Dialog */}
      <AlertDialog
        open={isDeployDialogOpen}
        onOpenChange={setIsDeployDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deploy proposal "{deployingProposal?.id}
              "? This action cannot be undone.
            </AlertDialogDescription>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <div>
                  <strong>Proposal:</strong> {deployingProposal?.id}
                </div>
                <div>
                  <strong>Description:</strong> {deployingProposal?.description}
                </div>
                <div>
                  <strong>Approvals:</strong>{" "}
                  {deployingProposal?.votes.filter((v) => v.approve).length}/
                  {deployingProposal?.requiredVotes}
                </div>
                <div>
                  <strong>Deployment Time:</strong>{" "}
                  {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeployingProposal(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeployProposal}
              disabled={isDeploying}
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                "Confirm Deploy"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
