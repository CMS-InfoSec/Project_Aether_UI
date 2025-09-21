import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiFetch, { setTokenRefresher } from '@/lib/apiClient';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  access_token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTokenRefresher(refreshToken);
    const token = localStorage.getItem('access_token');
    if (token) { fetchMe(); } else { setIsLoading(false); }
  }, []);

  const fetchMe = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const me = await res.json();
        setUser({ id: me.id, email: me.email, role: me.role, access_token: me.access_token });
      } else {
        localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); setUser(null);
      }
    } catch { setUser(null); } finally { setIsLoading(false); }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiFetch('/api/auth/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }), noAuth: true });
      if (!response.ok) return false;
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      await fetchMe();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally { setIsLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) return false;
      const response = await apiFetch('/api/auth/refresh', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ refresh_token: refresh }), noAuth: true });
      if (response.status === 503) { return true; }
      if (!response.ok) { logout(); return false; }
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      await fetchMe();
      return true;
    } catch { logout(); return false; }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
