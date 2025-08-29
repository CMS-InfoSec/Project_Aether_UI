import { Request, Response } from 'express';

// Types
interface LLMQuestion {
  question: string;
}

interface Trade {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
}

interface LLMContext {
  trades: Trade[];
  strategy: string;
  regime: string;
  sentiment: string;
  documents: [string, string][]; // [snippet, citation_id]
}

interface LLMResponse {
  answer: string;
  context: LLMContext;
}

// Mock data for demonstration
const mockTrades: Trade[] = [
  {
    id: 'trade_001',
    symbol: 'BTC/USDT',
    action: 'buy',
    amount: 0.5,
    price: 43250.00,
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'trade_002',
    symbol: 'ETH/USDT',
    action: 'sell',
    amount: 2.1,
    price: 2680.50,
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'trade_003',
    symbol: 'BTC/USDT',
    action: 'buy',
    amount: 0.25,
    price: 43100.00,
    timestamp: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 'trade_004',
    symbol: 'ADA/USDT',
    action: 'sell',
    amount: 1000,
    price: 0.48,
    timestamp: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: 'trade_005',
    symbol: 'ETH/USDT',
    action: 'buy',
    amount: 1.5,
    price: 2650.25,
    timestamp: new Date(Date.now() - 18000000).toISOString()
  }
];

const mockDocuments: [string, string][] = [
  ["Market analysis shows increased volatility in crypto markets with Bitcoin testing resistance at $43,000 level...", "doc_ma_001"],
  ["Trading strategy recommendation: Consider DCA approach during current market consolidation phase...", "doc_ts_002"],
  ["Risk management protocol activated: Portfolio exposure reduced by 15% due to elevated VIX levels...", "doc_rm_003"],
  ["Sentiment analysis indicates bearish sentiment in social media with fear & greed index at 25...", "doc_sa_004"]
];

// Rate limiting tracking (in production, use Redis or similar)
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // Max requests per user per hour
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds

// Simulate OpenAI API responses based on question content
function generateMockAnswer(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('portfolio') || lowerQuestion.includes('position')) {
    return `Based on your current portfolio analysis, you have active positions in BTC, ETH, and ADA. Your portfolio is currently balanced with 60% in major cryptocurrencies and 40% in altcoins. Recent trades show a focus on Bitcoin accumulation during the dip. Consider maintaining current allocation while monitoring support levels.`;
  }
  
  if (lowerQuestion.includes('market') || lowerQuestion.includes('price')) {
    return `Current market conditions show consolidation with Bitcoin testing the $43,000 resistance level. Market sentiment is cautiously bearish with the fear & greed index at 25. Technical indicators suggest potential for either breakout above $44,000 or retest of $41,000 support. Volume patterns indicate institutional accumulation.`;
  }
  
  if (lowerQuestion.includes('strategy') || lowerQuestion.includes('trading')) {
    return `Your current trading strategy is focused on momentum-based entries with risk management protocols. The system recommends a DCA approach during consolidation phases. Recent performance shows 12% gains over the past month with a 0.8 Sharpe ratio. Consider reducing position sizes if volatility exceeds 15% daily.`;
  }
  
  if (lowerQuestion.includes('risk') || lowerQuestion.includes('hedge')) {
    return `Risk management analysis shows your current exposure is within acceptable parameters. Portfolio beta is 1.2 relative to BTC. Hedge ratio is at 25% USDT allocation. Consider increasing hedge positions if market uncertainty persists. Stop-loss levels are appropriately set at 8% below entry points.`;
  }
  
  if (lowerQuestion.includes('sentiment') || lowerQuestion.includes('news')) {
    return `Current market sentiment analysis from social media and news sources indicates mixed signals. Fear & greed index at 25 suggests oversold conditions. Key developments include institutional adoption news and regulatory clarity. On-chain metrics show accumulation by long-term holders.`;
  }
  
  // Default response
  return `I've analyzed your question using the latest market data and your trading history. Based on current conditions and your portfolio context, I recommend monitoring key support and resistance levels while maintaining your current risk management protocols. Your recent trading performance has been solid with consistent gains. Please let me know if you'd like me to elaborate on any specific aspect.`;
}

// Check rate limit for user
function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit window
    rateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, resetTime: userLimit.resetTime };
  }
  
  userLimit.count++;
  return { allowed: true };
}

// POST /llm/ask - Ask LLM a question
export function handleAskLLM(req: Request, res: Response) {
  const { question } = req.body as LLMQuestion;
  const userId = req.query.userId as string || 'user_001'; // In production, get from auth
  
  // Input validation
  if (!question || typeof question !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Question is required and must be a string'
    });
  }
  
  if (question.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Question cannot be empty'
    });
  }
  
  if (question.length > 500) {
    return res.status(400).json({
      status: 'error',
      message: 'Question must be 500 characters or less'
    });
  }
  
  // Check rate limiting
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetIn = Math.ceil((rateCheck.resetTime! - Date.now()) / 60000); // Minutes
    return res.status(429).json({
      status: 'error',
      message: `Rate limit exceeded. Try again in ${resetIn} minutes.`,
      resetTime: rateCheck.resetTime
    });
  }
  
  // Simulate processing delay
  setTimeout(() => {
    try {
      // In production, this would:
      // 1. Query Weaviate for relevant documents
      // 2. Gather user's recent trades and strategy context
      // 3. Call OpenAI API with context and question
      // 4. Return structured response
      
      // Mock context gathering
      const context: LLMContext = {
        trades: mockTrades.slice(0, 5), // Last 5 trades
        strategy: 'Momentum DCA Strategy v2.1',
        regime: 'Consolidation Phase',
        sentiment: 'Cautiously Bearish',
        documents: mockDocuments
      };
      
      // Generate mock answer
      const answer = generateMockAnswer(question);
      
      const response: LLMResponse = {
        answer,
        context
      };
      
      console.log(`LLM question from ${userId}: "${question.substring(0, 50)}..."`);
      
      res.json({
        status: 'success',
        data: response
      });
      
    } catch (error) {
      console.error('LLM request failed:', error);
      res.status(502).json({
        status: 'error',
        message: 'LLM request failed. Please try again.'
      });
    }
  }, 1000 + Math.random() * 2000); // 1-3 second delay to simulate processing
}

// GET /llm/status - Get LLM service status (for debugging)
export function handleLLMStatus(_req: Request, res: Response) {
  res.json({
    status: 'success',
    data: {
      service: 'active',
      model: 'gpt-4-turbo',
      rateLimits: {
        maxPerHour: RATE_LIMIT_MAX,
        windowMs: RATE_LIMIT_WINDOW
      },
      features: [
        'Question answering',
        'Context retrieval',
        'Document search',
        'Trading analysis'
      ]
    }
  });
}

// DELETE /llm/rate-limit/:userId - Reset rate limit for user (admin only)
export function handleResetRateLimit(req: Request, res: Response) {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'User ID is required'
    });
  }
  
  rateLimits.delete(userId);
  
  console.log(`Rate limit reset for user: ${userId}`);
  
  res.json({
    status: 'success',
    message: `Rate limit reset for user ${userId}`
  });
}
