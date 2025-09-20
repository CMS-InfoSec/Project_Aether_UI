import { RequestHandler } from "express";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  supabase_degraded?: boolean;
}

export interface AuthResponse extends TokenPair {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'user' | 'founder';
  };
}

export interface RefreshRequest {
  refresh_token: string;
}

// Mock user database
export const mockUsers = [
  { id: '1', email: 'admin@projectaether.com', password: 'admin123', role: 'admin' as const },
  { id: '2', email: 'user@projectaether.com', password: 'user123', role: 'user' as const },
  { id: '3', email: 'founder@projectaether.com', password: 'founder123', role: 'founder' as const },
];

// In-memory refresh token store (rotation)
const refreshStore = new Map<string, string>(); // refresh -> userId

// Login failure buckets (per ip+email) with lockout
type FailRecord = { count: number; locked_until?: number };
const failBuckets = new Map<string, FailRecord>();
const LOCKOUT_THRESHOLD = 5; // attempts
const LOCKOUT_WINDOW_MS = 5 * 60_000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: any = null;

function bucketKey(req: Request, email: string) {
  const ip = (req.headers['x-forwarded-for'] as string) || (req.socket && (req.socket.remoteAddress || 'local')) || 'local';
  return `${ip}::${email.toLowerCase()}`;
}

function startCleanupLoop() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of failBuckets.entries()) {
      if (v.locked_until && v.locked_until < now) { failBuckets.delete(k); }
    }
  }, CLEANUP_INTERVAL_MS);
}
startCleanupLoop();

function create_access_token(userId: string) { return `access_${userId}_${Date.now()}`; }
function create_refresh_token(userId: string) { return `refresh_${userId}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function decode_token(token: string) {
  if (!token.startsWith('access_')) return null; const parts = token.split('_'); return { userId: parts[1] };
}

function supabaseDegraded() { return !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY; }
function testTokensEnabled() { return String(process.env.ENABLE_TEST_TOKENS || '').toLowerCase() === 'true'; }

export const handleLogin: RequestHandler = (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;
    if (!email || !password) return res.status(400).json({ status:'error', code:400, detail:'Email and password are required' });

    const key = bucketKey(req, email);
    const rec = failBuckets.get(key);
    const now = Date.now();
    if (rec?.locked_until && rec.locked_until > now) {
      const retry = Math.ceil((rec.locked_until - now)/1000);
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({ status:'error', code:429, detail:'Locked out due to repeated failures' });
    }

    // Allow test tokens in dev
    if (testTokensEnabled() && password === 'test') {
      const u = mockUsers[0];
      const access_token = create_access_token(u.id);
      const refresh_token = create_refresh_token(u.id); refreshStore.set(refresh_token, u.id);
      return res.json({ access_token, refresh_token, user: { id: u.id, email: u.email, role: u.role } });
    }

    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      const n = (rec?.count || 0) + 1; const locked = n >= LOCKOUT_THRESHOLD ? now + LOCKOUT_WINDOW_MS : undefined;
      failBuckets.set(key, { count: n, locked_until: locked });
      return res.status(401).json({ status:'error', code:401, detail:'Invalid credentials' });
    }

    failBuckets.delete(key);

    const access_token = create_access_token(user.id);
    const refresh_token = create_refresh_token(user.id); refreshStore.set(refresh_token, user.id);
    const response: AuthResponse = {
      access_token,
      refresh_token,
      user: { id: user.id, email: user.email, role: user.role }
    };
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status:'error', code:500, detail:'Internal server error' });
  }
};

export const handleRefresh: RequestHandler = (req, res) => {
  try {
    const { refresh_token } = req.body as RefreshRequest;
    if (!refresh_token) return res.status(400).json({ status:'error', code:400, detail:'Missing refresh token' });

    const uid = refreshStore.get(refresh_token);
    if (!uid) return res.status(401).json({ status:'error', code:401, detail:'Invalid refresh token' });

    // Rotate token
    refreshStore.delete(refresh_token);

    if (supabaseDegraded()) {
      return res.status(503).json({ status:'error', code:503, detail:'Supabase degraded', details:{ supabase_degraded: true } });
    }

    const access_token = create_access_token(uid);
    const new_refresh = create_refresh_token(uid); refreshStore.set(new_refresh, uid);
    const pair: TokenPair = { access_token, refresh_token: new_refresh };
    res.json(pair);
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ status:'error', code:500, detail:'Internal server error' });
  }
};

export const handleLogout: RequestHandler = (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = Array.isArray(auth) ? auth[0] : auth;
  // Best-effort: nothing to invalidate in mock
  res.json({ status:'success', detail:'Logged out' });
};

export const handleMe: RequestHandler = (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const token = Array.isArray(auth) ? auth[0] : auth;
    let accessToken = '';
    if (token && token.toLowerCase().startsWith('bearer ')) accessToken = token.slice(7);

    // Support test tokens in dev
    if (testTokensEnabled() && accessToken === 'TEST_ACCESS') {
      const u = mockUsers[0];
      return res.json({ id: u.id, email: u.email, role: u.role, access_token: 'TEST_ACCESS' });
    }

    let user = mockUsers[0];
    const decoded = accessToken ? decode_token(accessToken) : null;
    if (decoded) {
      const found = mockUsers.find(u => u.id === decoded.userId);
      if (found) user = found;
    }
    // Normalize founder to admin
    const role = user.role === 'founder' ? 'admin' : user.role;
    res.json({ id: user.id, email: user.email, role, access_token: accessToken || create_access_token(user.id) });
  } catch (e) {
    res.status(500).json({ status:'error', code:500, detail:'Failed to resolve user' });
  }
};

// Password reset stubs (delegate to supabase in real impl)
export const handleResetRequest: RequestHandler = (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ status:'error', code:400, detail:'Email required' });
  return res.status(202).json({ status:'accepted' });
};
export const handleResetConfirm: RequestHandler = (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ status:'error', code:400, detail:'Missing token or password' });
  return res.json({ status:'success' });
};
