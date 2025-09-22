import { Request, Response } from 'express';

// Mock configuration data - in production this would be from database/config files
interface RuntimeConfig {
  [key: string]: string | number | boolean;
}

interface SystemConfig {
  [key: string]: any;
}

interface UserSettings {
  userId: string;
  settings: {
    [key: string]: any;
  };
}

// In-memory storage (replace with actual persistence in production)
let runtimeConfig: RuntimeConfig = {
  'trading.max_position_size': 100000,
  'trading.risk_limit_percent': 2.5,
  'trading.stop_loss_percent': 1.0,
  'api.rate_limit_per_minute': 1000,
  'system.maintenance_mode': false,
  'logging.level': 'info',
  'monitoring.alert_threshold': 95,
  'cache.ttl_seconds': 300,
  // External tooling endpoints
  'mlflow.ui_url': '',
  'dvc.registry_url': ''
};

let systemConfig: SystemConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    name: 'aether_db',
    pool_size: 20,
    timeout: 30000
  },
  redis: {
    host: 'localhost',
    port: 6379,
    ttl: 3600,
    max_connections: 10
  },
  trading: {
    engine: {
      enabled: true,
      mode: 'live',
      max_orders_per_second: 10
    },
    risk_management: {
      enabled: true,
      max_drawdown: 5.0,
      position_limit: 1000000
    }
  },
  monitoring: {
    metrics: {
      enabled: true,
      interval: 60,
      retention_days: 30
    },
    alerts: {
      email_enabled: true,
      slack_enabled: false,
      threshold_cpu: 80,
      threshold_memory: 85
    }
  },
  security: {
    jwt_expiry: 3600,
    max_login_attempts: 5,
    lockout_duration: 900
  }
};

let userSettings: UserSettings[] = [
  {
    userId: 'user_1',
    settings: {
      notifications: {
        email: true,
        push: false,
        trading_alerts: true
      },
      trading: {
        default_risk_level: 'medium',
        auto_stop_loss: true,
        confirm_trades: false
      },
      ui: {
        theme: 'dark',
        language: 'en',
        timezone: 'UTC'
      }
    }
  },
  {
    userId: 'user_2',
    settings: {
      notifications: {
        email: false,
        push: true,
        trading_alerts: false
      },
      trading: {
        default_risk_level: 'low',
        auto_stop_loss: false,
        confirm_trades: true
      },
      ui: {
        theme: 'light',
        language: 'en',
        timezone: 'America/New_York'
      }
    }
  }
];

// Define sensitive keys that should not be returned
const SENSITIVE_KEYS = ['password', 'secret', 'key', 'token', 'credential'];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive));
}

function filterSensitiveKeys(config: any): any {
  if (typeof config !== 'object' || config === null) {
    return config;
  }

  if (Array.isArray(config)) {
    return config.map(filterSensitiveKeys);
  }

  const filtered: any = {};
  for (const [key, value] of Object.entries(config)) {
    if (!isSensitiveKey(key)) {
      filtered[key] = filterSensitiveKeys(value);
    } else {
      filtered[key] = '***HIDDEN***';
    }
  }
  return filtered;
}

// Get runtime configuration (non-sensitive keys only)
export function handleGetRuntimeConfig(_req: Request, res: Response) {
  const filteredConfig = filterSensitiveKeys(runtimeConfig);
  
  res.json({
    status: 'success',
    data: filteredConfig
  });
}

// Update runtime configuration
export function handleUpdateRuntimeConfig(req: Request, res: Response) {
  const { config, actor } = req.body;

  if (!config || typeof config !== 'object') {
    return res.status(400).json({
      status: 'error',
      message: 'Configuration object is required'
    });
  }

  // Validate configuration keys
  const unknownKeys: string[] = [];
  const validKeys = Object.keys(runtimeConfig);
  
  for (const key of Object.keys(config)) {
    if (!validKeys.includes(key)) {
      unknownKeys.push(key);
    }
  }

  if (unknownKeys.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Unknown configuration keys found',
      unknownKeys
    });
  }

  // Update configuration
  for (const [key, value] of Object.entries(config)) {
    runtimeConfig[key] = value;
  }

  console.log(`Runtime config updated by ${actor || 'Unknown'}:`, config);

  res.json({
    status: 'success',
    message: 'Runtime configuration updated successfully',
    data: filterSensitiveKeys(runtimeConfig)
  });
}

// Get system configuration
export function handleGetSystemConfig(_req: Request, res: Response) {
  const filteredConfig = filterSensitiveKeys(systemConfig);
  
  res.json({
    status: 'success',
    data: filteredConfig
  });
}

// Update system configuration (partial update)
export function handleUpdateSystemConfig(req: Request, res: Response) {
  const { config, actor } = req.body;

  if (!config || typeof config !== 'object') {
    return res.status(400).json({
      status: 'error',
      message: 'Configuration object is required'
    });
  }

  // Deep merge the configuration
  function deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  systemConfig = deepMerge(systemConfig, config);

  console.log(`System config updated by ${actor || 'Unknown'}:`, config);

  res.json({
    status: 'success',
    message: 'System configuration updated successfully',
    data: filterSensitiveKeys(systemConfig)
  });
}

// Reset system configuration to defaults
export function handleResetSystemConfig(req: Request, res: Response) {
  const { confirmation, actor } = req.body;

  if (confirmation !== 'RESET') {
    return res.status(400).json({
      status: 'error',
      message: 'Confirmation required. Type "RESET" to confirm.'
    });
  }

  // Reset to default configuration
  systemConfig = {
    database: {
      host: 'localhost',
      port: 5432,
      name: 'aether_db',
      pool_size: 20,
      timeout: 30000
    },
    redis: {
      host: 'localhost',
      port: 6379,
      ttl: 3600,
      max_connections: 10
    },
    trading: {
      engine: {
        enabled: true,
        mode: 'live',
        max_orders_per_second: 10
      },
      risk_management: {
        enabled: true,
        max_drawdown: 5.0,
        position_limit: 1000000
      }
    },
    monitoring: {
      metrics: {
        enabled: true,
        interval: 60,
        retention_days: 30
      },
      alerts: {
        email_enabled: true,
        slack_enabled: false,
        threshold_cpu: 80,
        threshold_memory: 85
      }
    },
    security: {
      jwt_expiry: 3600,
      max_login_attempts: 5,
      lockout_duration: 900
    }
  };

  console.log(`System config reset to defaults by ${actor || 'Unknown'}`);

  res.json({
    status: 'success',
    message: 'System configuration reset to defaults',
    data: filterSensitiveKeys(systemConfig)
  });
}

// Get all user settings
export function handleGetUserSettings(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: userSettings
  });
}

// Reload configuration
export function handleReloadConfig(req: Request, res: Response) {
  const { actor } = req.body;

  // Simulate configuration reload - in production this would reload from files/database
  try {
    // Reset to fresh values
    runtimeConfig = {
      'trading.max_position_size': 100000,
      'trading.risk_limit_percent': 2.5,
      'trading.stop_loss_percent': 1.0,
      'api.rate_limit_per_minute': 1000,
      'system.maintenance_mode': false,
      'logging.level': 'info',
      'monitoring.alert_threshold': 95,
      'cache.ttl_seconds': 300
    };

    console.log(`Configuration reloaded by ${actor || 'Unknown'}`);

    res.json({
      status: 'success',
      message: 'Configuration reloaded successfully',
      data: filterSensitiveKeys(runtimeConfig)
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to reload configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get effective configuration (runtime + derived data)
export function handleGetEffectiveConfig(_req: Request, res: Response) {
  const RISK_TIER_DEFAULTS = {
    conservative: {
      max_position_size: 50000,
      risk_limit_percent: 1.0,
      stop_loss_percent: 0.5
    },
    moderate: {
      max_position_size: 100000,
      risk_limit_percent: 2.5,
      stop_loss_percent: 1.0
    },
    aggressive: {
      max_position_size: 200000,
      risk_limit_percent: 5.0,
      stop_loss_percent: 2.0
    }
  };

  const ASC = {
    algorithmic_strategy_config: {
      momentum: {
        enabled: true,
        lookback_period: 20,
        threshold: 0.02
      },
      mean_reversion: {
        enabled: true,
        bollinger_bands: 2.0,
        rsi_threshold: 30
      },
      arbitrage: {
        enabled: false,
        min_spread: 0.001,
        max_exposure: 0.1
      }
    }
  };

  const effectiveConfig = {
    runtime: filterSensitiveKeys(runtimeConfig),
    system: filterSensitiveKeys(systemConfig),
    derived: {
      RISK_TIER_DEFAULTS,
      ASC
    },
    metadata: {
      last_reload: new Date().toISOString(),
      config_version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  res.json({
    status: 'success',
    data: effectiveConfig
  });
}

// Update user settings
export function handleUpdateUserSettings(req: Request, res: Response) {
  const { userId, settings, actor } = req.body;

  if (!userId || !settings) {
    return res.status(400).json({
      status: 'error',
      message: 'User ID and settings are required'
    });
  }

  const userIndex = userSettings.findIndex(u => u.userId === userId);

  if (userIndex === -1) {
    // Create new user settings
    userSettings.push({ userId, settings });
  } else {
    // Update existing user settings
    userSettings[userIndex].settings = { ...userSettings[userIndex].settings, ...settings };
  }

  console.log(`User settings updated for ${userId} by ${actor || 'Unknown'}`);

  res.json({
    status: 'success',
    message: 'User settings updated successfully',
    data: userSettings.find(u => u.userId === userId)
  });
}
