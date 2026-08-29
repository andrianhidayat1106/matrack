import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Server, 
  Layers, 
  Cpu, 
  Check, 
  Copy,
  Sparkles,
  Key,
  Save
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, getSupabaseConfig } from '../../services/supabase';

export const AccountSettings = () => {
  const { user, stats, updateProfile, configureSupabase } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Supabase direct connection settings
  const config = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(config.url);
  const [supabaseKey, setSupabaseKey] = useState(config.key);
  const [testStatus, setTestStatus] = useState(null); // 'testing', 'success', 'error'
  const [supabaseSaved, setSupabaseSaved] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = { name, email };
      if (password.trim()) {
        payload.password = password;
      }
      await updateProfile(payload);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setPassword('');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupabaseConfig = (e) => {
    e.preventDefault();
    configureSupabase(supabaseUrl, supabaseKey);
    setSupabaseSaved(true);
    setTimeout(() => setSupabaseSaved(false), 2500);
  };

  const handleTestDatabase = async () => {
    setTestStatus('testing');
    try {
      const { data, error } = await supabase.from('notes').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        setTestStatus('error');
      } else {
        setTestStatus('success');
      }
    } catch {
      setTestStatus('error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 p-6 sm:p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Account & Supabase Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal profile and direct Supabase database client credentials.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center space-x-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Profile & Supabase Form */}
          <div className="md:col-span-2 space-y-6">
            {/* User Profile Card */}
            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-5">
              <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Profile Information</h3>
                  <p className="text-xs text-slate-400">Update your account name and email address</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>New Password (leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Supabase Client Settings Card */}
            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Direct Supabase Client Settings</h3>
                    <p className="text-xs text-slate-400">Pure Serverless Frontend ➡️ Supabase Cloud</p>
                  </div>
                </div>

                <button
                  onClick={handleTestDatabase}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors flex items-center space-x-1.5"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Test Client</span>
                </button>
              </div>

              {testStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                    testStatus === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : testStatus === 'testing'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Supabase connection & tables responding normally.</span>
                    </>
                  ) : testStatus === 'testing' ? (
                    <span>Testing Supabase query...</span>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Check your Supabase URL & Anon Key or network connection.</span>
                    </>
                  )}
                </div>
              )}

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xxxxxxxxxxxxxxxx.supabase.co"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-1.5"
                  >
                    {supabaseSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    <span>{supabaseSaved ? 'Saved!' : 'Save Supabase Config'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Stats & Workspace Info */}
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Productivity Stats</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total Notes</span>
                  <span className="text-sm font-bold text-amber-400">{stats?.notes_count || 0}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Pinned Notes</span>
                  <span className="text-sm font-bold text-amber-300">{stats?.pinned_notes_count || 0}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total Tasks</span>
                  <span className="text-sm font-bold text-blue-400">{stats?.tasks_total || 0}</span>
                </div>
              </div>
            </div>

            {/* Architecture Details */}
            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Serverless Architecture</span>
              </h3>

              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span><strong>Hosting:</strong> Vercel (Frontend only)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span><strong>Database:</strong> Supabase (Direct SDK)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span><strong>Notes:</strong> Apple Notes 3-Column</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span><strong>Schedule:</strong> Trello Kanban DnD</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
