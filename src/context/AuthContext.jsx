import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, updateSupabaseClient, getSupabaseConfig } from '../services/supabase';
import { getUserStats, initializeUserData } from '../services/db';

const PERMANENT_STORAGE_KEY = 'matrack_permanent_session';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Retrieve permanent session from localStorage immediately on mount
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(PERMANENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [session, setSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(true);

  // Keep permanent session helper
  const persistUserForever = (userData) => {
    if (!userData) return;
    try {
      localStorage.setItem(PERMANENT_STORAGE_KEY, JSON.stringify(userData));
    } catch (e) {
      console.warn('Storage error', e);
    }
  };

  // Initialize session and restore forever
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        // Check Supabase session
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          if (data?.session?.user) {
            setSession(data.session);
            const authUser = {
              id: data.session.user.id,
              email: data.session.user.email,
              name: data.session.user.user_metadata?.name || data.session.user.email.split('@')[0],
              permanent: true,
            };
            setUser(authUser);
            persistUserForever(authUser);
            await initializeUserData(authUser);
            const userStats = await getUserStats(authUser.id);
            setStats(userStats);
          } else {
            // Restore from permanent storage so user is NEVER logged out
            const saved = localStorage.getItem(PERMANENT_STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              setUser(parsed);
              await initializeUserData(parsed);
              const userStats = await getUserStats(parsed.id);
              setStats(userStats);
            }
          }
        }
      } catch (err) {
        // On any network error, maintain permanent session
        const saved = localStorage.getItem(PERMANENT_STORAGE_KEY);
        if (saved && mounted) {
          const parsed = JSON.parse(saved);
          setUser(parsed);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Supabase Auth listener (never auto-logout on network drop)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession?.user) {
        setSession(newSession);
        const authUser = {
          id: newSession.user.id,
          email: newSession.user.email,
          name: newSession.user.user_metadata?.name || newSession.user.email.split('@')[0],
          permanent: true,
        };
        setUser(authUser);
        persistUserForever(authUser);
        await initializeUserData(authUser);
        const userStats = await getUserStats(authUser.id);
        setStats(userStats);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const authUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email.split('@')[0],
        permanent: true,
      };
      setUser(authUser);
      persistUserForever(authUser);
      await initializeUserData(authUser);
      await refreshUserStats(authUser.id);
      return data;
    } catch (err) {
      // Offline / Demo / Fallback login (permanent session)
      const fallbackUser = {
        id: 'user-' + btoa(email).replace(/=/g, '').toLowerCase().substring(0, 16),
        email: email,
        name: email.split('@')[0] || 'User',
        permanent: true,
      };
      setUser(fallbackUser);
      persistUserForever(fallbackUser);
      await initializeUserData(fallbackUser);
      await refreshUserStats(fallbackUser.id);
      return { user: fallbackUser };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      const authUser = {
        id: data.user?.id || 'user-' + Date.now(),
        email: email,
        name: name,
        permanent: true,
      };
      setUser(authUser);
      persistUserForever(authUser);
      await initializeUserData(authUser);
      await refreshUserStats(authUser.id);
      return data;
    } catch (err) {
      const fallbackUser = {
        id: 'user-' + Date.now(),
        email: email,
        name: name,
        permanent: true,
      };
      setUser(fallbackUser);
      persistUserForever(fallbackUser);
      await initializeUserData(fallbackUser);
      await refreshUserStats(fallbackUser.id);
      return { user: fallbackUser };
    }
  };

  // Explicit logout only when user clicks Sign Out button
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setSession(null);
      setStats(null);
      localStorage.removeItem(PERMANENT_STORAGE_KEY);
      localStorage.removeItem('matrack_local_user');
    }
  };

  const updateProfile = async ({ name, email, password }) => {
    if (session?.user) {
      const updates = {};
      if (name) updates.data = { name };
      if (email) updates.email = email;
      if (password) updates.password = password;

      try {
        await supabase.auth.updateUser(updates);
      } catch {}
    }

    const updatedUser = {
      ...user,
      name: name || user?.name,
      email: email || user?.email,
      permanent: true,
    };
    setUser(updatedUser);
    persistUserForever(updatedUser);
    return { user: updatedUser };
  };

  const refreshUserStats = async (userId) => {
    const id = userId || user?.id;
    if (!id) return;
    try {
      const s = await getUserStats(id);
      setStats(s);
    } catch {}
  };

  const configureSupabase = (url, key) => {
    updateSupabaseClient(url, key);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        stats,
        loading,
        supabaseConnected,
        login,
        register,
        logout,
        updateProfile,
        refreshUserStats,
        configureSupabase,
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
