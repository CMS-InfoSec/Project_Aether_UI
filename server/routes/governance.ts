import { Request, Response } from 'express';

// Types
interface Proposal {
  id: string;
  description: string;
  status: 'pending' | 'voting' | 'approved' | 'rejected' | 'deployed';
  votes: Vote[];
  requiredVotes: number;
  createdAt: string;
  createdBy: string;
  deployedAt?: string;
  deploymentStatus?: 'success' | 'failed' | 'in_progress';
}

interface Vote {
  founderId: string;
  approve: boolean;
  votedAt: string;
}

interface FeedbackEntry {
  id: string;
  comment: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'high_priority';
  reviewedBy?: string;
  reviewedAt?: string;
}

interface FeedbackSummary {
  totalSubmissions: number;
  reviewed: number;
  pending: number;
  highPriority: number;
  recentEntries: FeedbackEntry[];
}

// Mock data stores (in production, use database)
let proposals: Proposal[] = [
  {
    id: 'PROP-001',
    description: 'Increase BTC allocation to 40%',
    status: 'voting',
    votes: [
      { founderId: 'founder1', approve: true, votedAt: '2024-01-20T10:30:00Z' },
      { founderId: 'founder2', approve: true, votedAt: '2024-01-20T11:15:00Z' }
    ],
    requiredVotes: 3,
    createdAt: '2024-01-20T09:00:00Z',
    createdBy: 'admin@example.com'
  },
  {
    id: 'PROP-002',
    description: 'Add AVAX to portfolio',
    status: 'approved',
    votes: [
      { founderId: 'founder1', approve: true, votedAt: '2024-01-19T14:30:00Z' },
      { founderId: 'founder2', approve: true, votedAt: '2024-01-19T15:15:00Z' },
      { founderId: 'founder3', approve: true, votedAt: '2024-01-19T16:00:00Z' }
    ],
    requiredVotes: 3,
    createdAt: '2024-01-19T13:00:00Z',
    createdBy: 'admin@example.com'
  },
  {
    id: 'PROP-003',
    description: 'Implement new risk model',
    status: 'pending',
    votes: [
      { founderId: 'founder1', approve: true, votedAt: '2024-01-21T09:30:00Z' }
    ],
    requiredVotes: 3,
    createdAt: '2024-01-21T08:00:00Z',
    createdBy: 'admin@example.com'
  }
];

let feedbackEntries: FeedbackEntry[] = [
  {
    id: 'feedback_1',
    comment: 'The new trading algorithm is performing better than expected',
    submittedBy: 'user@example.com',
    submittedAt: '2024-01-21T10:30:00Z',
    status: 'reviewed',
    reviewedBy: 'admin@example.com',
    reviewedAt: '2024-01-21T11:00:00Z'
  },
  {
    id: 'feedback_2',
    comment: 'Suggest adding more defensive positions during high volatility',
    submittedBy: 'trader@example.com',
    submittedAt: '2024-01-21T14:15:00Z',
    status: 'high_priority'
  },
  {
    id: 'feedback_3',
    comment: 'Risk management could be improved for smaller cap coins',
    submittedBy: 'analyst@example.com',
    submittedAt: '2024-01-21T16:45:00Z',
    status: 'pending'
  }
];

// Get all proposals
export function handleGetProposals(_req: Request, res: Response) {
  try {
    // Add vote counts and status calculations
    const enrichedProposals = proposals.map(proposal => ({
      ...proposal,
      voteCount: proposal.votes.length,
      approvalCount: proposal.votes.filter(v => v.approve).length,
      canDeploy: proposal.status === 'approved' && proposal.votes.filter(v => v.approve).length >= proposal.requiredVotes
    }));

    res.json({
      status: 'success',
      data: enrichedProposals
    });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}

// Create new proposal
export function handleCreateProposal(req: Request, res: Response) {
  try {
    const { proposalId, description } = req.body;
    const actor = 'admin@example.com'; // In production, get from auth context

    // Validation
    if (!proposalId || !proposalId.trim()) {
      return res.status(400).json({
        status: 'error',
        error: 'Proposal ID is required'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        status: 'error',
        error: 'Proposal description is required'
      });
    }

    // Check for duplicate ID
    const existingProposal = proposals.find(p => p.id === proposalId);
    if (existingProposal) {
      return res.status(409).json({
        status: 'error',
        error: 'Proposal ID already exists'
      });
    }

    // Create new proposal
    const newProposal: Proposal = {
      id: proposalId,
      description: description.trim(),
      status: 'pending',
      votes: [],
      requiredVotes: 3, // Default required votes
      createdAt: new Date().toISOString(),
      createdBy: actor
    };

    proposals.push(newProposal);

    console.log(`Proposal created: ${proposalId} by ${actor}`);

    res.status(201).json({
      status: 'success',
      message: 'Proposal created successfully',
      data: newProposal
    });
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}

// Cast vote on proposal
export function handleCastVote(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    const { founderId, approve } = req.body;

    // Validation
    if (!founderId || !founderId.trim()) {
      return res.status(400).json({
        status: 'error',
        error: 'Founder ID is required'
      });
    }

    if (typeof approve !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        error: 'Approve field must be true or false'
      });
    }

    // Find proposal
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) {
      return res.status(404).json({
        status: 'error',
        error: 'Proposal not found'
      });
    }

    // Check if proposal is in voting status
    if (proposal.status !== 'voting' && proposal.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        error: 'Proposal is not open for voting'
      });
    }

    // Check if founder has already voted
    const existingVoteIndex = proposal.votes.findIndex(v => v.founderId === founderId);
    if (existingVoteIndex !== -1) {
      // Update existing vote
      proposal.votes[existingVoteIndex] = {
        founderId,
        approve,
        votedAt: new Date().toISOString()
      };
    } else {
      // Add new vote
      proposal.votes.push({
        founderId,
        approve,
        votedAt: new Date().toISOString()
      });
    }

    // Update proposal status based on votes
    const approvalCount = proposal.votes.filter(v => v.approve).length;
    const totalVotes = proposal.votes.length;

    if (approvalCount >= proposal.requiredVotes) {
      proposal.status = 'approved';
    } else if (totalVotes >= proposal.requiredVotes && approvalCount < proposal.requiredVotes) {
      proposal.status = 'rejected';
    } else {
      proposal.status = 'voting';
    }

    console.log(`Vote cast on ${proposalId} by ${founderId}: ${approve ? 'approve' : 'reject'}`);

    res.json({
      status: 'success',
      message: 'Vote cast successfully',
      data: {
        proposal,
        voteCount: totalVotes,
        approvalCount,
        newStatus: proposal.status
      }
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}

// Deploy approved proposal
export function handleDeployProposal(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    const actor = 'admin@example.com'; // In production, get from auth context

    // Find proposal
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) {
      return res.status(404).json({
        status: 'error',
        error: 'Proposal not found'
      });
    }

    // Check if proposal is approved
    if (proposal.status !== 'approved') {
      return res.status(400).json({
        status: 'error',
        error: 'Only approved proposals can be deployed'
      });
    }

    // Check if already deployed
    if (proposal.status === 'deployed') {
      return res.status(400).json({
        status: 'error',
        error: 'Proposal is already deployed'
      });
    }

    // Update proposal status
    proposal.status = 'deployed';
    proposal.deployedAt = new Date().toISOString();
    proposal.deploymentStatus = 'success'; // In production, this would be determined by actual deployment

    console.log(`Proposal deployed: ${proposalId} by ${actor}`);

    res.json({
      status: 'success',
      message: 'Proposal deployed successfully',
      data: {
        proposalId,
        deployedAt: proposal.deployedAt,
        deploymentStatus: proposal.deploymentStatus
      }
    });
  } catch (error) {
    console.error('Deploy proposal error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}

// Get feedback summary
export function handleGetFeedbackSummary(_req: Request, res: Response) {
  try {
    const summary: FeedbackSummary = {
      totalSubmissions: feedbackEntries.length,
      reviewed: feedbackEntries.filter(f => f.status === 'reviewed').length,
      pending: feedbackEntries.filter(f => f.status === 'pending').length,
      highPriority: feedbackEntries.filter(f => f.status === 'high_priority').length,
      recentEntries: feedbackEntries
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 5)
    };

    res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Get feedback summary error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}

// Submit feedback
export function handleSubmitFeedback(req: Request, res: Response) {
  try {
    const { comment } = req.body;
    const actor = 'user@example.com'; // In production, get from auth context

    // Validation
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        status: 'error',
        error: 'Comment is required'
      });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        status: 'error',
        error: 'Comment must be at least 10 characters long'
      });
    }

    // Create feedback entry
    const newFeedback: FeedbackEntry = {
      id: `feedback_${Date.now()}`,
      comment: comment.trim(),
      submittedBy: actor,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };

    feedbackEntries.push(newFeedback);

    console.log(`Feedback submitted by ${actor}: ${comment.substring(0, 50)}...`);

    res.status(201).json({
      status: 'success',
      message: 'Feedback submitted successfully',
      data: newFeedback
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}

// Get all feedback (admin only)
export function handleGetAllFeedback(req: Request, res: Response) {
  try {
    const { status, limit = '20', offset = '0' } = req.query;

    let filteredFeedback = [...feedbackEntries];

    // Apply status filter
    if (status && typeof status === 'string' && status !== 'all') {
      filteredFeedback = filteredFeedback.filter(f => f.status === status);
    }

    // Apply pagination
    const limitNum = parseInt(limit as string, 10) || 20;
    const offsetNum = parseInt(offset as string, 10) || 0;
    const paginatedFeedback = filteredFeedback
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(offsetNum, offsetNum + limitNum);

    res.json({
      status: 'success',
      data: {
        feedback: paginatedFeedback,
        total: filteredFeedback.length,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}
