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
  risk_tier?: 'aggressive' | 'balanced' | 'conservative';
}

interface BinanceApiCredentials {
  binance_key: string;
  binance_secret: string;
  expires_at: string;
}

interface ApiKeyRecord {
  key_masked: string;
  expires_at: string;
  created_at: string;
  scopes_verified: boolean;
}

interface SettingsUpdateRequest {
  settings?: TradingSettings;
  binance_key?: string;
  binance_secret?: string;
  expires_at?: string;
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

// Mock API keys store (encrypted in production)
let apiKeys: Record<string, ApiKeyRecord> = {
  'user_1': {
    key_masked: 'abcd****************************wxyz',
    expires_at: '2024-04-21T00:00:00Z',
    created_at: '2024-01-21T14:30:00Z',
    scopes_verified: true
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

// Validate Binance API key format
function validateBinanceApiKey(key: string): boolean {
  // Binance API keys are typically 64 character alphanumeric strings
  return /^[A-Za-z0-9]{64}$/.test(key);
}

// Mock function to verify Binance API key scopes
function verifyBinanceApiKeyScopes(key: string, secret: string): { valid: boolean; error?: string } {
  // Simulate scope verification - in production this would call Binance API
  if (key.includes('withdraw') || key.includes('transfer')) {
    return { valid: false, error: 'API key must not have withdrawal or transfer permissions' };
  }

  // Simulate random network errors for testing
  if (Math.random() > 0.9) {
    return { valid: false, error: 'Network error connecting to Binance API' };
  }

  return { valid: true };
}

// Encrypt API credentials (mock implementation)
function encryptApiCredentials(key: string, secret: string): { encryptedKey: string; encryptedSecret: string } {
  // In production, use proper encryption like AES-256
  return {
    encryptedKey: Buffer.from(key).toString('base64'),
    encryptedSecret: Buffer.from(secret).toString('base64')
  };
}

// Mask API key for display
function maskApiKey(key: string): string {
  if (key.length < 8) return '****';
  return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
}

// Update user trading settings (enhanced to handle API keys)
export function handleUpdateTradingSettings(req: Request, res: Response) {
  try {
    const { settings, binance_key, binance_secret, expires_at }: SettingsUpdateRequest = req.body;

    // In production, extract user ID from authenticated session/JWT
    const userId = 'user_1'; // Mock user ID

    const errors: string[] = [];
    let updatedSettings = null;
    let apiKeyResult = null;

    // Handle trading settings update
    if (settings) {
      const { sl_multiplier, tp_multiplier, use_news_analysis, trailing_stop, risk_tier } = settings;

      // Validation for trading settings
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

      if (risk_tier !== undefined) {
        if (!['aggressive', 'balanced', 'conservative'].includes(risk_tier)) {
          errors.push('risk_tier must be one of: aggressive, balanced, conservative');
        }
      }

      if (errors.length === 0) {
        // Get current settings or defaults
        const currentSettings = userSettings[userId] || {
          sl_multiplier: 0.5,
          tp_multiplier: 2.0,
          use_news_analysis: true,
          trailing_stop: 0.1
        };

        // Merge settings (only update provided fields)
        updatedSettings = {
          ...currentSettings,
          ...Object.fromEntries(
            Object.entries(settings).filter(([_, value]) => value !== undefined)
          )
        };

        // Save updated settings
        userSettings[userId] = updatedSettings;

        // If risk_tier is being updated, also update the profile
        if (risk_tier !== undefined) {
          userProfiles[userId] = { risk_tier };
        }
      }
    }

    // Handle Binance API credentials
    if (binance_key !== undefined || binance_secret !== undefined) {
      // Check if this is a deletion request (both empty strings)
      if (binance_key === '' && binance_secret === '') {
        console.log(`Deleting API keys for user: ${userId}`);
        delete apiKeys[userId];
        apiKeyResult = null;
      }
      // Check if this is an addition/update request (both have values)
      else if (binance_key && binance_secret) {
        // Validate API key format
        if (!validateBinanceApiKey(binance_key)) {
          errors.push('Binance API key must be a 64-character alphanumeric string');
        }

        if (!binance_secret || binance_secret.length < 10) {
          errors.push('Binance API secret is required and must be at least 10 characters');
        }

        if (errors.length === 0) {
          // Verify API key scopes
          const scopeValidation = verifyBinanceApiKeyScopes(binance_key, binance_secret);

          if (!scopeValidation.valid) {
            return res.status(400).json({
              status: 'error',
              error: scopeValidation.error || 'Invalid API key scopes'
            });
          }

          // Encrypt and store API credentials
          const { encryptedKey, encryptedSecret } = encryptApiCredentials(binance_key, binance_secret);

          // Calculate expiration date (default to 90 days)
          const expirationDate = expires_at || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

          console.log(`Saving API keys for user: ${userId}`);
          apiKeys[userId] = {
            key_masked: maskApiKey(binance_key),
            expires_at: expirationDate,
            created_at: new Date().toISOString(),
            scopes_verified: true
          };

          apiKeyResult = apiKeys[userId];
        }
      }
      // Invalid combination (one empty, one not)
      else {
        errors.push('Both API key and secret must be provided together, or both must be empty for deletion');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        error: 'Validation failed',
        details: errors
      });
    }

    const response: any = {
      status: 'success',
      message: 'Settings updated successfully',
      data: {}
    };

    if (updatedSettings) {
      response.data.settings = updatedSettings;
    }

    if (apiKeyResult !== undefined) {
      response.data.api_keys = apiKeyResult;
      if (apiKeyResult) {
        response.message = 'Settings and API keys updated successfully';
      } else {
        response.message = 'Settings updated and API keys deleted successfully';
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Update trading settings error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to update trading settings'
    });
  }
}

// Get API keys status
export function handleGetApiKeys(req: Request, res: Response) {
  try {
    // In production, extract user ID from authenticated session/JWT
    const userId = 'user_1'; // Mock user ID

    const userApiKeys = apiKeys[userId];

    res.json({
      status: 'success',
      data: {
        api_keys: userApiKeys || null
      }
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch API keys'
    });
  }
}
