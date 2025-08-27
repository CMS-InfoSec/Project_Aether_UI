import { RequestHandler } from "express";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: 'admin' | 'user';
  };
}

export interface RefreshRequest {
  refresh_token: string;
}

// Mock user database
const mockUsers = [
  {
    id: '1',
    email: 'admin@projectaether.com',
    password: 'admin123', // In production, this would be hashed
    role: 'admin' as const
  },
  {
    id: '2',
    email: 'user@projectaether.com',
    password: 'user123',
    role: 'user' as const
  }
];

// Mock token generation
const generateTokens = (userId: string) => ({
  access_token: `access_${userId}_${Date.now()}`,
  refresh_token: `refresh_${userId}_${Date.now()}`
});

export const handleLogin: RequestHandler = (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = mockUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate tokens
    const tokens = generateTokens(user.id);

    const response: AuthResponse = {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleRefresh: RequestHandler = (req, res) => {
  try {
    const { refresh_token } = req.body as RefreshRequest;

    // Validate refresh token (simplified validation)
    if (!refresh_token || !refresh_token.startsWith('refresh_')) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    // Extract user ID from token (in production, properly decode JWT)
    const userId = refresh_token.split('_')[1];
    const user = mockUsers.find(u => u.id === userId);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const { access_token } = generateTokens(user.id);

    res.json({ access_token });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

export const handleLogout: RequestHandler = (req, res) => {
  // In a real app, you'd invalidate the tokens in your database
  res.json({ message: 'Logged out successfully' });
};
