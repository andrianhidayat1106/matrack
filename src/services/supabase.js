import { createClient } from '@supabase/supabase-js';

// Default Supabase project configuration (can be overridden via localStorage or .env)
const defaultUrl = import.meta.env.VITE_SUPABASE_URL || 'https://edqekrnxvuyhbfljdfpi.supabase.co';
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

const getStoredConfig = () => {
  try {
    const customUrl = localStorage.getItem('matrack_supabase_url');
    const customKey = localStorage.getItem('matrack_supabase_key');
    return {
      url: customUrl || defaultUrl,
      key: customKey || defaultKey,
    };
  } catch {
    return { url: defaultUrl, key: defaultKey };
  }
};

let currentConfig = getStoredConfig();

export let supabase = createClient(currentConfig.url, currentConfig.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const updateSupabaseClient = (url, key) => {
  if (url) localStorage.setItem('matrack_supabase_url', url);
  if (key) localStorage.setItem('matrack_supabase_key', key);
  
  const activeUrl = url || currentConfig.url;
  const activeKey = key || currentConfig.key;
  
  supabase = createClient(activeUrl, activeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  
  return supabase;
};

export const getSupabaseConfig = () => {
  return getStoredConfig();
};
