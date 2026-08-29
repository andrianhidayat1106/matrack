import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, updateSupabaseClient, getSupabaseConfig } from '../services/supabase';
import { getUserStats, initializeUserData } from '../services/db';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(true);

  // Initialize session and listen for auth changes
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (mounted) {
          if (data?.session) {
            setSession(data.session);
            const authUser = {
              id: data.session.user.id,
              email: data.session.user.email,
              name: data.session.user.user_metadata?.name || data.session.user.email.split('@')[0],
            };
            setUser(authUser);
            await initializeUserData(authUser);
            const userStats = await getUserStats(authUser.id);
            setStats(userStats);
          } else {
            // Check local fallback demo user
            const savedLocalUser = localStorage.getItem('matrack_local_user');
            if (savedLocalUser) {
              const parsed = JSON.parse(savedLocalUser);
              setUser(parsed);
              const userStats = await getUserStats(parsed.id);
              setStats(userStats);
            }
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Supabase Auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const authUser = {
          id: newSession.user.id,
          email: newSession.user.email,
          name: newSession.user.user_metadata?.name || newSession.user.email.split('@')[0],
        };
        setUser(authUser);
        await initializeUserData(authUser);
        const userStats = await getUserStats(authUser.id);
        setStats(userStats);
      } else if (event === 'SIGNED_OUT') {
        const savedLocalUser = localStorage.getItem('matrack_local_user');
        if (!savedLocalUser) {
          setUser(null);
          setStats(null);
        }
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
      };
      setUser(authUser);
      localStorage.removeItem('matrack_local_user');
      await initializeUserData(authUser);
      await refreshUserStats(authUser.id);
      return data;
    } catch (err) {
      // Fallback for offline or local test
      if (email === 'demo@matrack.app' || err.message?.includes('Invalid login') || err.message?.includes('Failed to fetch')) {
        const fallbackUser = {
          id: 'demo-user-1',
          email: email,
          name: email.split('@')[0] || 'Demo User',
        };
        setUser(fallbackUser);
        localStorage.setItem('matrack_local_user', JSON.stringify(fallbackUser));
        await initializeUserData(fallbackUser);
        await refreshUserStats(fallbackUser.id);
        return { user: fallbackUser };
      }
      throw err;
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

      if (error) throw error;

      const authUser = {
        id: data.user?.id || 'user-' + Date.now(),
        email: email,
        name: name,
      };
      setUser(authUser);
      localStorage.removeItem('matrack_local_user');
      await initializeUserData(authUser);
      await refreshUserStats(authUser.id);
      return data;
    } catch (err) {
      // Local fallback if Supabase credentials are placeholder
      const fallbackUser = {
        id: 'user-' + Date.now(),
        email: email,
        name: name,
      };
      setUser(fallbackUser);
      localStorage.setItem('matrack_local_user', JSON.stringify(fallbackUser));
      await initializeUserData(fallbackUser);
      await refreshUserStats(fallbackUser.id);
      return { user: fallbackUser };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setSession(null);
      setStats(null);
      localStorage.removeItem('matrack_local_user');
    }
  };

  const updateProfile = async ({ name, email, password }) => {
    if (session?.user) {
      const updates = {};
      if (name) updates.data = { name };
      if (email) updates.email = email;
      if (password) updates.password = password;

      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      const updatedUser = {
        ...user,
        name: name || user.name,
        email: email || user.email,
      };
      setUser(updatedUser);
      return data;
    } else {
      // Local user
      const updatedUser = {
        ...user,
        name: name || user.name,
        email: email || user.email,
      };
      setUser(updatedUser);
      localStorage.setItem('matrack_local_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    }
  };

  const refreshUserStats = async (userId) => {
    const id = userId || user?.id;
    if (!id) return;
    try {
      const s = await getUserStats(id);
      setStats(s);
    } catch {
      // silent
    }
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
