import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setTokens, clearTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    loadMe();
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [loadMe]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: u, accessToken, refreshToken } = res.data.data;
    setTokens({ accessToken, refreshToken });
    setUser(u);
    return u;
  };

  const signup = async (payload) => {
    const res = await api.post('/auth/signup', payload);
    const { user: u, accessToken, refreshToken } = res.data.data;
    setTokens({ accessToken, refreshToken });
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      const rt = localStorage.getItem('refresh_token');
      if (rt) await api.post('/auth/logout', { refreshToken: rt });
    } catch {
      // ignore
    }
    clearTokens();
    setUser(null);
  };

  const updateUser = (u) => setUser(u);

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
