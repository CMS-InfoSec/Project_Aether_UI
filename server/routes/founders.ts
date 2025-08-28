import { RequestHandler } from "express";

export interface BootstrapStatusResponse {
  foundersExist: boolean;
}

export interface CreateFounderRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateFounderResponse {
  id: string;
}

// Mock founders database
let mockFounders: Array<{
  id: string;
  email: string;
  name: string;
  createdAt: string;
}> = [];

// Initialize mockFounders based on existing admin users
const initializeMockFounders = () => {
  const { mockUsers } = require('./auth');
  if (mockUsers && mockFounders.length === 0) {
    // Find any existing admin users and add them to founders
    const adminUsers = mockUsers.filter((user: any) => user.role === 'admin');
    adminUsers.forEach((admin: any) => {
      mockFounders.push({
        id: admin.id,
        email: admin.email,
        name: admin.email.split('@')[0], // Use email prefix as name
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      });
    });
  }
};

// Initialize on module load
initializeMockFounders();

export const handleGetBootstrapStatus: RequestHandler = (req, res) => {
  try {
    // Ensure mockFounders is synchronized with admin users
    initializeMockFounders();

    const foundersExist = mockFounders.length > 0;

    console.log('Bootstrap status check:', { foundersExist, foundersCount: mockFounders.length });

    const response: BootstrapStatusResponse = {
      foundersExist
    };

    res.json(response);
  } catch (error) {
    console.error('Bootstrap status error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleCreateFounder: RequestHandler = (req, res) => {
  try {
    // Ensure mockFounders is synchronized with admin users
    initializeMockFounders();

    // Re-check that no founder record exists
    if (mockFounders.length > 0) {
      console.log('Bootstrap conflict: founders already exist', { foundersCount: mockFounders.length, founders: mockFounders });
      return res.status(409).json({
        error: 'Founders already exist. Bootstrap is not allowed.'
      });
    }

    const { email, password, name } = req.body as CreateFounderRequest;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // Generate unique ID
    const founderId = `founder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, this would:
    // 1. Create a Supabase user with Role.ADMIN
    // 2. Insert that user's ID into the founders table
    // For now, we'll simulate this process
    
    const newFounder = {
      id: founderId,
      email,
      name,
      createdAt: new Date().toISOString()
    };

    mockFounders.push(newFounder);

    // Also add to mock users for login purposes
    const { mockUsers } = require('./auth');
    if (mockUsers) {
      mockUsers.push({
        id: founderId,
        email,
        password, // In production, this would be hashed
        role: 'admin' as const
      });
    }

    const response: CreateFounderResponse = {
      id: founderId
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create founder error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleGetFounders: RequestHandler = (req, res) => {
  try {
    // This would require admin authentication in production
    res.json(mockFounders);
  } catch (error) {
    console.error('Get founders error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleDeleteFounder: RequestHandler = (req, res) => {
  try {
    // This would require admin authentication in production
    const { founderId } = req.params;

    const index = mockFounders.findIndex(f => f.id === founderId);
    if (index === -1) {
      return res.status(404).json({
        error: 'Founder not found'
      });
    }

    mockFounders.splice(index, 1);
    res.json({ message: 'Founder deleted successfully' });
  } catch (error) {
    console.error('Delete founder error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleResetFounders: RequestHandler = (req, res) => {
  try {
    // This is for testing purposes only - clear all founders
    mockFounders.length = 0;

    // Also reset mock users to remove default admin users for proper bootstrap
    const { mockUsers } = require('./auth');
    if (mockUsers) {
      mockUsers.length = 0;
      // Don't add default admin user - let bootstrap process create it
      mockUsers.push({
        id: '2',
        email: 'user@projectaether.com',
        password: 'user123',
        role: 'user' as const
      });
    }

    console.log('Founders and admin users reset for bootstrap');
    res.json({ message: 'Founders reset successfully' });
  } catch (error) {
    console.error('Reset founders error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleGetSystemDebug: RequestHandler = (req, res) => {
  try {
    const { mockUsers } = require('./auth');

    // Ensure mockFounders is synchronized
    initializeMockFounders();

    const debugInfo = {
      founders: mockFounders,
      users: mockUsers ? mockUsers.map((u: any) => ({ id: u.id, email: u.email, role: u.role })) : [],
      foundersCount: mockFounders.length,
      adminUsersCount: mockUsers ? mockUsers.filter((u: any) => u.role === 'admin').length : 0,
      foundersExist: mockFounders.length > 0
    };

    res.json(debugInfo);
  } catch (error) {
    console.error('System debug error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};
