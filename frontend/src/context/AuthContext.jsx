import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('matrack_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('matrack_token') || null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  // Check health and current user info
  const checkAuth = async () => {
    try {
      // Ping check
      await api.get('/ping');
      setBackendOnline(true);

      const savedToken = localStorage.getItem('matrack_token');
      if (savedToken) {
        const res = await api.get('/me');
        setUser(res.data.user);
        setStats(res.data.stats);
        localStorage.setItem('matrack_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setBackendOnline(false);
      }
      if (err.response?.status === 401) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('matrack_token');
        localStorage.removeItem('matrack_user');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    const { user: authUser, token: authToken } = res.data;
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem('matrack_token', authToken);
    localStorage.setItem('matrack_user', JSON.stringify(authUser));
    await refreshUserStats();
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/register', { name, email, password });
    const { user: authUser, token: authToken } = res.data;
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem('matrack_token', authToken);
    localStorage.setItem('matrack_user', JSON.stringify(authUser));
    await refreshUserStats();
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      setStats(null);
      localStorage.removeItem('matrack_token');
      localStorage.removeItem('matrack_user');
    }
  };

  const updateProfile = async (data) => {
    const res = await api.put('/profile', data);
    setUser(res.data.user);
    localStorage.setItem('matrack_user', JSON.stringify(res.data.user));
    return res.data;
  };

  const refreshUserStats = async () => {
    try {
      const res = await api.get('/me');
      setStats(res.data.stats);
      setUser(res.data.user);
    } catch {
      // Silent error
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        stats,
        loading,
        backendOnline,
        login,
        register,
        logout,
        updateProfile,
        refreshUserStats,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
