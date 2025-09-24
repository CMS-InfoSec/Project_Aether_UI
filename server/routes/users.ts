import { RequestHandler } from "express";

// Types
export interface InviteUserRequest {
  email: string;
  role: 'user' | 'admin';
  founderApprovals: string[];
}

export interface ApproveUserRequest {
  userId: string;
  assignedRole?: 'user' | 'admin';
}

export interface UserSettingsRequest {
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
  newsAnalysisEnabled: boolean;
  trailingStop: number;
  riskTier: 'low' | 'medium' | 'high';
}

export interface PendingUser {
  id: string;
  email: string;
  requestedRole: 'user' | 'admin';
  approvalsReceived: number;
  approvalsNeeded: number;
  invitedAt: string;
  founderApprovals: string[];
}

// Mock data store
let mockPendingUsers: PendingUser[] = [
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

// Mock user settings store
const mockUserSettings = new Map<string, UserSettingsRequest>();

// Invite User
export const handleInviteUser: RequestHandler = (req, res) => {
  try {
    const { email, role, founderApprovals } = req.body as Partial<InviteUserRequest> as any;

    // Validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        status: 'error',
        error: 'Valid email address is required'
      });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        error: 'Role must be either user or admin'
      });
    }

    const requiredApprovals = role === 'admin' ? 5 : 3;
    const approvalsList: string[] = Array.isArray(founderApprovals) ? founderApprovals.filter(Boolean) : [];
    // Signup is open to anyone; approvals are collected asynchronously by founders.
    // We accept the request even if approvals are zero or below required threshold.

    // Check if user already exists
    const existingUser = mockPendingUsers.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        error: 'User with this email already has a pending invitation'
      });
    }

    // Create new pending user
    const newUser: PendingUser = {
      id: `user_${Date.now()}`,
      email,
      requestedRole: role,
      approvalsReceived: approvalsList.length,
      approvalsNeeded: role === 'admin' ? 5 : 3,
      invitedAt: new Date().toISOString(),
      founderApprovals: approvalsList
    };

    mockPendingUsers.push(newUser);

    res.status(201).json({
      status: 'success',
      message: 'Invitation sent successfully',
      data: newUser
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
};

// Get Pending Users
export const handleGetPendingUsers: RequestHandler = (req, res) => {
  try {
    const { limit = '10', offset = '0', search = '' } = req.query;
    
    let filteredUsers = mockPendingUsers;
    
    // Apply search filter
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedUsers = filteredUsers.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      status: 'success',
      data: {
        users: paginatedUsers,
        total: filteredUsers.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < filteredUsers.length
      }
    });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Approve User
export const handleApproveUser: RequestHandler = (req, res) => {
  try {
    const { userId, assignedRole } = req.body as ApproveUserRequest;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }

    const userIndex = mockPendingUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Pending user not found'
      });
    }

    const user = mockPendingUsers[userIndex];

    // Check if user has sufficient approvals
    if (user.approvalsReceived < user.approvalsNeeded) {
      return res.status(400).json({
        error: 'User does not have sufficient founder approvals'
      });
    }

    // Remove from pending list (in real app, move to active users)
    mockPendingUsers.splice(userIndex, 1);

    res.json({
      status: 'success',
      message: 'User approved successfully',
      data: {
        id: user.id,
        email: user.email,
        role: assignedRole || user.requestedRole,
        approvedAt: new Date().toISOString(),
        audit_id: `AUD-${Date.now()}`
      }
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Reject User
export const handleRejectUser: RequestHandler = (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }

    const userIndex = mockPendingUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Pending user not found'
      });
    }

    const user = mockPendingUsers[userIndex];
    mockPendingUsers.splice(userIndex, 1);

    res.json({
      status: 'success',
      message: 'User invitation rejected',
      data: {
        id: user.id,
        email: user.email,
        rejectedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get User Settings
export const handleGetUserSettings: RequestHandler = (req, res) => {
  try {
    // In a real app, get from authenticated user context
    const userId = 'current_user'; // Mock user ID
    
    const settings = mockUserSettings.get(userId) || {
      stopLossMultiplier: 0.2,
      takeProfitMultiplier: 2.0,
      newsAnalysisEnabled: true,
      trailingStop: 0.05,
      riskTier: 'medium' as const
    };

    res.json({
      status: 'success',
      data: settings
    });
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Update User Settings
export const handleUpdateUserSettings: RequestHandler = (req, res) => {
  try {
    const settings = req.body as UserSettingsRequest;

    // Validation
    if (settings.stopLossMultiplier < 0.1 || settings.stopLossMultiplier > 1.0) {
      return res.status(400).json({
        error: 'Stop-loss multiplier must be between 0.1 and 1.0'
      });
    }

    if (settings.takeProfitMultiplier < 1.0) {
      return res.status(400).json({
        error: 'Take-profit multiplier must be at least 1.0'
      });
    }

    if (settings.trailingStop <= 0) {
      return res.status(400).json({
        error: 'Trailing stop must be greater than 0'
      });
    }

    if (!['low', 'medium', 'high'].includes(settings.riskTier)) {
      return res.status(400).json({
        error: 'Risk tier must be low, medium, or high'
      });
    }

    // In a real app, get from authenticated user context
    const userId = 'current_user'; // Mock user ID
    
    // Save settings
    mockUserSettings.set(userId, settings);

    res.json({
      status: 'success',
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get User Statistics (for admin dashboard)
export const handleGetUserStats: RequestHandler = (req, res) => {
  try {
    const stats = {
      totalPending: mockPendingUsers.length,
      needingApproval: mockPendingUsers.filter(u => u.approvalsReceived >= u.approvalsNeeded).length,
      totalInvitations: mockPendingUsers.length + 25, // Mock approved users
      approvalRate: 0.85,
      averageApprovalTime: '2.3 days'
    };

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};
