import { Request, Response } from 'express';

// Types
interface UserProfile {
  risk_tier: 'aggressive' | 'balanced' | 'conservative';
}

interface TradingSettings {
  sl_multiplier: number;
  tp_multiplier: number;
  use_news_analysis: boolean;
  trailing_stop: number;
}

// Mock data stores (in production, these would be database records)
let userProfiles: Record<string, UserProfile> = {
  'user_1': { risk_tier: 'balanced' },
  'user_2': { risk_tier: 'conservative' },
  'admin_1': { risk_tier: 'aggressive' }
};

let userSettings: Record<string, TradingSettings> = {
  'user_1': {
    sl_multiplier: 0.5,
    tp_multiplier: 2.0,
    use_news_analysis: true,
    trailing_stop: 0.1
  },
  'user_2': {
    sl_multiplier: 0.3,
    tp_multiplier: 1.5,
    use_news_analysis: false,
    trailing_stop: 0.05
  },
  'admin_1': {
    sl_multiplier: 0.8,
    tp_multiplier: 3.0,
    use_news_analysis: true,
    trailing_stop: 0.15
  }
};

// Get user profile (risk tier)
export function handleGetUserProfile(req: Request, res: Response) {
  try {
    // In production, extract user ID from authenticated session/JWT
    const userId = 'user_1'; // Mock user ID
    
    const profile = userProfiles[userId] || { risk_tier: 'balanced' };
    
    res.json({
      status: 'success',
      data: profile
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch user profile'
    });
  }
}

// Update user profile (risk tier)
export function handleUpdateUserProfile(req: Request, res: Response) {
  try {
    const { risk_tier } = req.body;
    
    // Validation
    if (!risk_tier) {
      return res.status(400).json({
        status: 'error',
        error: 'risk_tier is required'
      });
    }
    
    if (!['aggressive', 'balanced', 'conservative'].includes(risk_tier)) {
      return res.status(400).json({
        status: 'error',
        error: 'risk_tier must be one of: aggressive, balanced, conservative'
      });
    }
    
    // In production, extract user ID from authenticated session/JWT
    const userId = 'user_1'; // Mock user ID
    
    // Update profile
    userProfiles[userId] = { risk_tier };
    
    res.json({
      status: 'success',
      message: 'Risk tier updated successfully',
      data: userProfiles[userId]
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to update user profile'
    });
  }
}

// Get user trading settings
export function handleGetTradingSettings(req: Request, res: Response) {
  try {
    // In production, extract user ID from authenticated session/JWT
    const userId = 'user_1'; // Mock user ID
    
    const settings = userSettings[userId] || {
      sl_multiplier: 0.5,
      tp_multiplier: 2.0,
      use_news_analysis: true,
      trailing_stop: 0.1
    };
    
    res.json({
      status: 'success',
      data: { settings }
    });
  } catch (error) {
    console.error('Get trading settings error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch trading settings'
    });
  }
}

// Update user trading settings
export function handleUpdateTradingSettings(req: Request, res: Response) {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        status: 'error',
        error: 'settings object is required'
      });
    }
    
    const { sl_multiplier, tp_multiplier, use_news_analysis, trailing_stop } = settings;
    
    // Validation
    const errors: string[] = [];
    
    if (sl_multiplier !== undefined) {
      if (typeof sl_multiplier !== 'number' || sl_multiplier < 0.1 || sl_multiplier > 1.0) {
        errors.push('sl_multiplier must be a number between 0.1 and 1.0');
      }
    }
    
    if (tp_multiplier !== undefined) {
      if (typeof tp_multiplier !== 'number' || tp_multiplier <= 0) {
        errors.push('tp_multiplier must be a positive number');
      }
    }
    
    if (use_news_analysis !== undefined) {
      if (typeof use_news_analysis !== 'boolean') {
        errors.push('use_news_analysis must be a boolean');
      }
    }
    
    if (trailing_stop !== undefined) {
      if (typeof trailing_stop !== 'number' || trailing_stop <= 0) {
        errors.push('trailing_stop must be a positive number');
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        error: 'Validation failed',
        details: errors
      });
    }
    
    // In production, extract user ID from authenticated session/JWT
    const userId = 'user_1'; // Mock user ID
    
    // Get current settings or defaults
    const currentSettings = userSettings[userId] || {
      sl_multiplier: 0.5,
      tp_multiplier: 2.0,
      use_news_analysis: true,
      trailing_stop: 0.1
    };
    
    // Merge settings (only update provided fields)
    const updatedSettings = {
      ...currentSettings,
      ...Object.fromEntries(
        Object.entries(settings).filter(([_, value]) => value !== undefined)
      )
    };
    
    // Save updated settings
    userSettings[userId] = updatedSettings;
    
    res.json({
      status: 'success',
      message: 'Trading settings updated successfully',
      data: { settings: updatedSettings }
    });
  } catch (error) {
    console.error('Update trading settings error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to update trading settings'
    });
  }
}
