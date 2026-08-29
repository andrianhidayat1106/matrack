import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Kanban, 
  Settings, 
  Search, 
  Sparkles, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Pin,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MatrackLogo } from '../common/MatrackLogo';

export const AppLauncherGrid = ({ onOpenApp }) => {
  const { user, stats } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const apps = [
    {
      id: 'notes',
      name: 'Notes',
      subtitle: 'Apple-style Rich Text & Markdown Notes',
      icon: FileText,
      gradient: 'from-amber-500 to-orange-600',
      badgeText: stats ? `${stats.notes_count || 0} Notes` : 'Notes',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Organize personal thoughts, ideas, lists, and pinned docs with instant auto-save.',
      hotkey: 'N',
    },
    {
      id: 'schedule',
      name: 'Schedule',
      subtitle: 'Trello-style Kanban Task Boards',
      icon: Kanban,
      gradient: 'from-blue-600 to-cyan-500',
      badgeText: stats ? `${stats.tasks_pending || 0} Pending Tasks` : 'Kanban',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      description: 'Drag & drop task management, due date tracking, priority tags, and agile workflow columns.',
      hotkey: 'S',
    },
    {
      id: 'settings',
      name: 'Settings',
      subtitle: 'Account & Supabase Database Config',
      icon: Settings,
      gradient: 'from-purple-600 to-pink-600',
      badgeText: 'Config',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      description: 'Manage profile, customize credentials, test PostgreSQL Supabase connection, and API status.',
      hotkey: 'G',
    },
  ];

  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Background Decorative Glow Elements */}
      <div className="absolute top-[-10%] left-[20%] w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[15%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Section: Greeting, Live Clock & App Search */}
      <div className="max-w-5xl mx-auto w-full space-y-8 z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 mb-1">
              <MatrackLogo size="sm" showText={true} />
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold">
                v2.0 Serverless
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {getGreeting()}, <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">{user?.name || 'User'}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Pilih modul aplikasi produktivitas harian Anda di bawah ini.
            </p>
          </div>

          {/* Clock Widget */}
          <div className="glass-card px-5 py-3 rounded-2xl flex items-center space-x-4 border border-white/10 shadow-xl self-start md:self-auto">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-white font-mono tracking-wider">{formattedTime}</div>
              <div className="text-xs text-slate-400 flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar for Odoo Apps */}
        <div className="relative max-w-xl mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search applications (Notes, Schedule, Settings)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/80 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-xl transition-all shadow-lg shadow-black/30"
          />
        </div>

        {/* Odoo App Grid (Main Navigation Tiles) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {filteredApps.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => onOpenApp(app.id)}
                className="group relative text-left p-6 rounded-3xl glass-card hover:bg-slate-800/80 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 active:scale-[0.99] flex flex-col justify-between"
              >
                {/* Top of card */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    {/* App Icon Tile */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${app.gradient} flex items-center justify-center text-white shadow-lg shadow-black/40 group-hover:rotate-3 group-hover:scale-110 transition-all duration-300`}>
                      <Icon className="w-8 h-8 drop-shadow-md" />
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${app.badgeColor}`}>
                      {app.badgeText}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors flex items-center justify-between">
                    <span>{app.name}</span>
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-1 mb-3">
                    {app.subtitle}
                  </p>
                  <p className="text-xs text-slate-400/90 leading-relaxed">
                    {app.description}
                  </p>
                </div>

                {/* Bottom of card: Launch indicator */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                  <span className="flex items-center space-x-1">
                    <span>Open {app.name}</span>
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center transition-all">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Productivity Insight Widget */}
        {stats && (
          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Daily Productivity Status</h4>
                <p className="text-xs text-slate-400">
                  You have <span className="text-blue-400 font-medium">{stats.tasks_pending || 0} active tasks</span> on your Kanban board and <span className="text-amber-400 font-medium">{stats.notes_count || 0} notes</span> saved.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                onClick={() => onOpenApp('notes')}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 border border-white/10 transition-colors"
              >
                + New Note
              </button>
              <button
                onClick={() => onOpenApp('schedule')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-lg shadow-blue-600/30 transition-all"
              >
                View Kanban
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-slate-600 mt-10 z-10">
        Matrack v1.0 • Odoo App Switcher Architecture • Laravel 11 & React Supabase
      </div>
    </div>
  );
};
