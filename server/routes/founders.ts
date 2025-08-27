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

export const handleGetBootstrapStatus: RequestHandler = (req, res) => {
  try {
    const foundersExist = mockFounders.length > 0;
    
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
    // Re-check that no founder record exists
    if (mockFounders.length > 0) {
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
