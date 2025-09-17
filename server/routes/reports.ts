import { Request, Response } from 'express';

// Types
interface DailyReport {
  totalReturn: number;
  totalReturnPercent: number;
  activePortfolios: number;
  avgPerformance: number;
  topPerformer: {
    asset: string;
    performance: number;
  };
  bottomPerformer: {
    asset: string;
    performance: number;
  };
  dailyReturnsData: Array<{
    date: string;
    returns: number;
    benchmark: number;
  }>;
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  lastUpdated: string;
}

interface WeeklyReport {
  weeklyReturn: number;
  weeklyReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  avgHoldTime: number;
  weeklyAssetData: Array<{
    asset: string;
    returns: number;
    volatility: number;
    allocation: number;
    trades: number;
  }>;
  performanceMetrics: {
    informationRatio: number;
    calmarRatio: number;
    sortinoRatio: number;
  };
  lastUpdated: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  category: 'system' | 'trading' | 'user' | 'security';
  actionRequired: boolean;
  metadata?: any;
}

interface PerAssetReport {
  assets: Array<{
    symbol: string;
    name: string;
    allocation: number;
    currentPrice: number;
    dailyChange: number;
    weeklyChange: number;
    monthlyChange: number;
    totalReturn: number;
    totalReturnPercent: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
    trades: number;
    avgHoldTime: number;
    lastRebalance: string;
  }>;
  summary: {
    totalAssets: number;
    topPerformer: { symbol: string; return: number };
    bottomPerformer: { symbol: string; return: number };
    avgVolatility: number;
    correlationMatrix: Array<{ asset1: string; asset2: string; correlation: number }>;
  };
  lastUpdated: string;
}

// Mock data generators (in production, these would fetch from database/calculations)
function generateDailyReport(): DailyReport {
  const baseReturn = 24580;
  const variation = (Math.random() - 0.5) * 5000;
  const totalReturn = baseReturn + variation;
  const totalReturnPercent = (totalReturn / 1000000) * 100; // Assuming 1M portfolio base

  // Generate 7 days of data
  const dailyReturnsData = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dailyReturnsData.push({
      date: date.toISOString().split('T')[0],
      returns: (Math.random() - 0.3) * 5, // Slight positive bias
      benchmark: (Math.random() - 0.4) * 3 // Lower benchmark returns
    });
  }

  return {
    totalReturn,
    totalReturnPercent,
    activePortfolios: Math.floor(45 + Math.random() * 10),
    avgPerformance: 2.8 + (Math.random() - 0.5) * 2,
    topPerformer: {
      asset: ['SOL', 'AVAX', 'MATIC', 'DOT'][Math.floor(Math.random() * 4)],
      performance: 10 + Math.random() * 15
    },
    bottomPerformer: {
      asset: ['ADA', 'LINK', 'ATOM', 'ALGO'][Math.floor(Math.random() * 4)],
      performance: -(Math.random() * 8)
    },
    dailyReturnsData,
    riskMetrics: {
      volatility: 12.5 + (Math.random() - 0.5) * 5,
      sharpeRatio: 1.8 + (Math.random() - 0.5) * 0.8,
      maxDrawdown: -(2 + Math.random() * 3)
    },
    lastUpdated: new Date().toISOString()
  };
}

function generateWeeklyReport(): WeeklyReport {
  const weeklyAssetData = [
    { asset: 'BTC', baseReturns: 12.5, baseVolatility: 8.2, allocation: 35 },
    { asset: 'ETH', baseReturns: 8.7, baseVolatility: 12.1, allocation: 25 },
    { asset: 'SOL', baseReturns: 15.2, baseVolatility: 18.5, allocation: 15 },
    { asset: 'AVAX', baseReturns: 6.3, baseVolatility: 15.2, allocation: 10 },
    { asset: 'MATIC', baseReturns: 9.1, baseVolatility: 14.8, allocation: 10 },
    { asset: 'LINK', baseReturns: 4.2, baseVolatility: 11.5, allocation: 5 }
  ].map(asset => ({
    ...asset,
    returns: asset.baseReturns + (Math.random() - 0.5) * 5,
    volatility: asset.baseVolatility + (Math.random() - 0.5) * 3,
    trades: Math.floor(10 + Math.random() * 50)
  }));

  const totalWeeklyReturn = weeklyAssetData.reduce((sum, asset) => 
    sum + (asset.returns * asset.allocation / 100), 0
  );

  return {
    weeklyReturn: totalWeeklyReturn * 10000, // Convert to dollar amount
    weeklyReturnPercent: totalWeeklyReturn,
    sharpeRatio: 2.14 + (Math.random() - 0.5) * 0.5,
    maxDrawdown: -(2.3 + Math.random() * 1.5),
    winRate: 0.73 + (Math.random() - 0.5) * 0.1,
    totalTrades: weeklyAssetData.reduce((sum, asset) => sum + asset.trades, 0),
    avgHoldTime: 2.5 + Math.random() * 2, // hours
    weeklyAssetData,
    performanceMetrics: {
      informationRatio: 1.2 + Math.random() * 0.5,
      calmarRatio: 3.1 + Math.random() * 0.8,
      sortinoRatio: 2.8 + Math.random() * 0.6
    },
    lastUpdated: new Date().toISOString()
  };
}

function generatePerAssetReport(): PerAssetReport {
  const assetData = [
    { symbol: 'BTC', name: 'Bitcoin', basePrice: 43250, allocation: 35 },
    { symbol: 'ETH', name: 'Ethereum', basePrice: 2680, allocation: 25 },
    { symbol: 'SOL', name: 'Solana', basePrice: 98, allocation: 15 },
    { symbol: 'AVAX', name: 'Avalanche', basePrice: 38, allocation: 10 },
    { symbol: 'MATIC', name: 'Polygon', basePrice: 0.85, allocation: 8 },
    { symbol: 'LINK', name: 'Chainlink', basePrice: 15.2, allocation: 7 }
  ];

  const assets = assetData.map(asset => {
    const dailyChange = (Math.random() - 0.4) * 10; // Slight positive bias
    const weeklyChange = (Math.random() - 0.3) * 20;
    const monthlyChange = (Math.random() - 0.2) * 40;
    const currentPrice = asset.basePrice * (1 + dailyChange / 100);

    return {
      symbol: asset.symbol,
      name: asset.name,
      allocation: asset.allocation,
      currentPrice,
      dailyChange,
      weeklyChange,
      monthlyChange,
      totalReturn: asset.basePrice * asset.allocation * (monthlyChange / 100) * 100,
      totalReturnPercent: monthlyChange,
      sharpeRatio: 1.5 + Math.random() * 1.5,
      volatility: 15 + Math.random() * 25,
      maxDrawdown: -(2 + Math.random() * 8),
      trades: Math.floor(20 + Math.random() * 80),
      avgHoldTime: 1.5 + Math.random() * 4,
      lastRebalance: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  });

  const topPerformer = assets.reduce((max, asset) =>
    asset.totalReturnPercent > max.totalReturnPercent ? asset : max
  );

  const bottomPerformer = assets.reduce((min, asset) =>
    asset.totalReturnPercent < min.totalReturnPercent ? asset : min
  );

  // Generate correlation matrix (simplified)
  const correlationMatrix = [];
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      correlationMatrix.push({
        asset1: assets[i].symbol,
        asset2: assets[j].symbol,
        correlation: (Math.random() - 0.5) * 2 // -1 to 1
      });
    }
  }

  return {
    assets,
    summary: {
      totalAssets: assets.length,
      topPerformer: { symbol: topPerformer.symbol, return: topPerformer.totalReturnPercent },
      bottomPerformer: { symbol: bottomPerformer.symbol, return: bottomPerformer.totalReturnPercent },
      avgVolatility: assets.reduce((sum, asset) => sum + asset.volatility, 0) / assets.length,
      correlationMatrix
    },
    lastUpdated: new Date().toISOString()
  };
}

// Mock notifications store
let notifications: Notification[] = [
  {
    id: '1',
    title: 'Model Performance Alert',
    message: 'Primary trading model showing decreased accuracy (78% vs 85% baseline)',
    severity: 'warning',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    read: false,
    category: 'trading',
    actionRequired: true,
    metadata: { modelId: 'model_1', currentAccuracy: 0.78, baselineAccuracy: 0.85 }
  },
  {
    id: '2',
    title: 'Portfolio Rebalance Complete',
    message: 'Successfully rebalanced 47 portfolios with new asset allocations',
    severity: 'success',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    read: false,
    category: 'trading',
    actionRequired: false,
    metadata: { portfoliosRebalanced: 47, totalValue: 2450000 }
  },
  {
    id: '3',
    title: 'High Volatility Detected',
    message: 'BTC volatility exceeded 15% threshold. Stop-loss triggers activated.',
    severity: 'error',
    timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    read: true,
    category: 'trading',
    actionRequired: false,
    metadata: { asset: 'BTC', volatility: 0.157, threshold: 0.15 }
  },
  {
    id: '4',
    title: 'New User Approval Required',
    message: '3 new user registrations pending admin approval',
    severity: 'info',
    timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    read: false,
    category: 'user',
    actionRequired: true,
    metadata: { pendingUsers: 3 }
  },
  {
    id: '5',
    title: 'System Backup Completed',
    message: 'Daily system backup completed successfully. All data secured.',
    severity: 'success',
    timestamp: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
    read: true,
    category: 'system',
    actionRequired: false,
    metadata: { backupSize: '2.3GB', duration: '45min' }
  },
  {
    id: '6',
    title: 'API Rate Limit Warning',
    message: 'Exchange API usage at 85% of daily limit. Consider optimization.',
    severity: 'warning',
    timestamp: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
    read: false,
    category: 'system',
    actionRequired: true,
    metadata: { usage: 0.85, limit: 10000, remaining: 1500 }
  }
];

// Get daily report
export function handleGetDailyReport(_req: Request, res: Response) {
  try {
    const report = generateDailyReport();
    
    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to generate daily report'
    });
  }
}

// Get weekly report
export function handleGetWeeklyReport(_req: Request, res: Response) {
  try {
    const report = generateWeeklyReport();
    
    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to generate weekly report'
    });
  }
}

// Get notifications
import fs from 'fs';
import path from 'path';

const prefsFile = path.join(process.cwd(), 'code', 'server', 'data', 'notification_prefs.json');
function readPrefsFile(){
  try{ const txt = fs.readFileSync(prefsFile,'utf-8'); return JSON.parse(txt); }catch{return null;}
}
function writePrefsFile(data:any){
  try{ fs.mkdirSync(path.dirname(prefsFile), { recursive:true }); fs.writeFileSync(prefsFile, JSON.stringify(data,null,2)); }catch{}
}

export function handleGetNotifications(req: Request, res: Response) {
  try {
    const { 
      limit = '20', 
      offset = '0', 
      severity, 
      category, 
      unreadOnly = 'false' 
    } = req.query;

    let filteredNotifications = [...notifications];

    // Apply filters
    if (severity && typeof severity === 'string') {
      filteredNotifications = filteredNotifications.filter(n => n.severity === severity);
    }

    if (category && typeof category === 'string') {
      filteredNotifications = filteredNotifications.filter(n => n.category === category);
    }

    if (unreadOnly === 'true') {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    }

    // Sort by timestamp (newest first)
    filteredNotifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Export formats
    const { format } = req.query as any;
    if (format === 'csv'){
      const headers = ['id','title','message','severity','category','timestamp','read','actionRequired'];
      const csv = [headers.join(',')].concat(filteredNotifications.map(n=> headers.map(h=> {
        const v = (n as any)[h];
        if (v === undefined || v === null) return '';
        const s = typeof v === 'string' ? v.replace(/"/g,'""') : String(v);
        return /[,"]/.test(s) ? `"${s}"` : s;
      }).join(','))).join('\n');
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition','attachment; filename="notifications.csv"');
      return res.send(csv);
    }

    // Apply pagination
    const limitNum = parseInt(limit as string, 10) || 20;
    const offsetNum = parseInt(offset as string, 10) || 0;
    const paginatedNotifications = filteredNotifications.slice(offsetNum, offsetNum + limitNum);

    // Calculate summary stats
    const summary = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      actionRequired: notifications.filter(n => n.actionRequired && !n.read).length,
      severityCounts: {
        error: notifications.filter(n => n.severity === 'error').length,
        warning: notifications.filter(n => n.severity === 'warning').length,
        info: notifications.filter(n => n.severity === 'info').length,
        success: notifications.filter(n => n.severity === 'success').length
      }
    };

    res.json({
      status: 'success',
      data: {
        notifications: paginatedNotifications,
        summary,
        pagination: {
          total: filteredNotifications.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredNotifications.length
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch notifications'
    });
  }
}

// Mark notification as read
export function handleMarkNotificationRead(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;
    const { read = true } = req.body;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        error: 'Notification not found'
      });
    }

    notification.read = read;

    res.json({
      status: 'success',
      message: `Notification marked as ${read ? 'read' : 'unread'}`,
      data: notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to update notification'
    });
  }
}

// Mark all notifications as read
export function handleMarkAllNotificationsRead(_req: Request, res: Response) {
  try {
    const updatedCount = notifications.filter(n => !n.read).length;
    notifications.forEach(n => { n.read = true; });

    res.json({
      status: 'success',
      message: `Marked ${updatedCount} notifications as read`,
      data: { updatedCount }
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to mark notifications as read'
    });
  }
}

// Get per-asset report
export function handleGetPerAssetReport(_req: Request, res: Response) {
  try {
    const report = generatePerAssetReport();

    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    console.error('Get per-asset report error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to generate per-asset report'
    });
  }
}

// Download backtest report
export function handleGetBacktestReport(_req: Request, res: Response) {
  try {
    // Simulate checking for backtest report availability
    const hasBacktest = Math.random() > 0.3; // 70% chance report exists

    if (!hasBacktest) {
      return res.status(404).json({
        status: 'error',
        error: 'No backtest report available. Please run a backtest first.'
      });
    }

    // Generate mock CSV content
    const csvContent = [
      'Date,Strategy,Benchmark,Returns,Drawdown,Sharpe,Trades,Win_Rate',
      ...Array.from({ length: 100 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (99 - i));
        const strategyReturn = (Math.random() - 0.4) * 5;
        const benchmarkReturn = (Math.random() - 0.5) * 3;
        const drawdown = -(Math.random() * 8);
        const sharpe = 1.2 + Math.random() * 1.5;
        const trades = Math.floor(Math.random() * 10);
        const winRate = 0.6 + Math.random() * 0.3;

        return `${date.toISOString().split('T')[0]},${strategyReturn.toFixed(2)},${benchmarkReturn.toFixed(2)},${(strategyReturn - benchmarkReturn).toFixed(2)},${drawdown.toFixed(2)},${sharpe.toFixed(2)},${trades},${winRate.toFixed(2)}`;
      })
    ].join('\n');

    // Set headers for file download
    const filename = `backtest-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent));

    res.send(csvContent);
  } catch (error) {
    console.error('Get backtest report error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to download backtest report'
    });
  }
}

// Export report data as CSV
export function handleExportReportCSV(req: Request, res: Response) {
  try {
    const { type = 'daily' } = req.query;

    let csvContent = '';
    let filename = '';

    if (type === 'daily') {
      const report = generateDailyReport();
      csvContent = [
        'Date,Returns,Benchmark,Performance',
        ...report.dailyReturnsData.map(item =>
          `${item.date},${item.returns},${item.benchmark},${(item.returns - item.benchmark).toFixed(2)}`
        )
      ].join('\n');
      filename = `daily-report-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'weekly') {
      const report = generateWeeklyReport();
      csvContent = [
        'Asset,Returns,Volatility,Allocation,Trades',
        ...report.weeklyAssetData.map(asset =>
          `${asset.asset},${asset.returns},${asset.volatility},${asset.allocation},${asset.trades}`
        )
      ].join('\n');
      filename = `weekly-report-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'per-asset') {
      const report = generatePerAssetReport();
      csvContent = [
        'Symbol,Name,Allocation,Current_Price,Daily_Change,Weekly_Change,Monthly_Change,Total_Return,Sharpe_Ratio,Volatility,Max_Drawdown,Trades,Avg_Hold_Time',
        ...report.assets.map(asset =>
          `${asset.symbol},${asset.name},${asset.allocation},${asset.currentPrice},${asset.dailyChange},${asset.weeklyChange},${asset.monthlyChange},${asset.totalReturn},${asset.sharpeRatio},${asset.volatility},${asset.maxDrawdown},${asset.trades},${asset.avgHoldTime}`
        )
      ].join('\n');
      filename = `per-asset-report-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid report type. Use daily, weekly, or per-asset.'
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent));

    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to export CSV'
    });
  }
}

// Notification preferences (mock in-memory)
let notificationPreferences: { supported_channels: string[]; channels: Record<string, boolean> } = readPrefsFile() || {
  supported_channels: ['email','slack','telegram'],
  channels: { email: true, slack: false, telegram: false }
};

export function handleGetNotificationPreferences(_req: Request, res: Response){
  res.json({ status:'success', data: notificationPreferences });
}

export function handleSaveNotificationPreferences(req: Request, res: Response){
  try{
    const { channels } = req.body || {};
    if (!channels || typeof channels !== 'object'){
      return res.status(400).json({ status:'error', error:'invalid payload' });
    }
    const next: Record<string, boolean> = {};
    for (const key of notificationPreferences.supported_channels){
      if (Object.prototype.hasOwnProperty.call(channels, key)){
        next[key] = Boolean(channels[key]);
      } else {
        next[key] = notificationPreferences.channels[key] || false;
      }
    }
    notificationPreferences = { ...notificationPreferences, channels: next };
    writePrefsFile(notificationPreferences);
    res.json({ status:'success', data: notificationPreferences });
  }catch(e){
    res.status(500).json({ status:'error', error:'failed to save preferences' });
  }
}

// Create new notification (for system use)
export function handleCreateNotification(req: Request, res: Response) {
  try {
    const {
      title,
      message,
      severity = 'info',
      category = 'system',
      actionRequired = false,
      metadata = {}
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        status: 'error',
        error: 'Title and message are required'
      });
    }

    const newNotification: Notification = {
      id: `notif_${Date.now()}`,
      title,
      message,
      severity,
      category,
      actionRequired,
      timestamp: new Date().toISOString(),
      read: false,
      metadata
    };

    notifications.unshift(newNotification);

    // Keep only the latest 100 notifications
    if (notifications.length > 100) {
      notifications = notifications.slice(0, 100);
    }

    res.status(201).json({
      status: 'success',
      message: 'Notification created successfully',
      data: newNotification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to create notification'
    });
  }
}
