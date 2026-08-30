import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutGrid, 
  FileText, 
  Kanban, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  ChevronDown, 
  Database,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MatrackLogo } from '../common/MatrackLogo';

export const TopHeader = ({ currentView, onNavigate }) => {
  const { user, logout, stats, supabaseConnected } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModuleTitle = () => {
    switch (currentView) {
      case 'notes':
        return { name: 'Apple Notes', icon: FileText, color: 'text-amber-400' };
      case 'schedule':
        return { name: 'Kanban Schedule', icon: Kanban, color: 'text-blue-400' };
      case 'settings':
        return { name: 'Settings & Supabase', icon: Settings, color: 'text-purple-400' };
      default:
        return { name: 'App Launcher', icon: LayoutGrid, color: 'text-emerald-400' };
    }
  };

  const moduleInfo = getModuleTitle();
  const ModuleIcon = moduleInfo.icon;

  return (
    <header className="h-14 border-b border-white/10 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Odoo App Launcher Icon + Breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onNavigate('odoo')}
          title="Return to Odoo App Switcher"
          className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
            currentView === 'odoo'
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/20'
              : 'text-slate-300 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 hidden sm:block" />

        {/* Brand & Module Breadcrumb */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onNavigate('odoo')}
            className="hover:opacity-80 transition-opacity flex items-center"
          >
            <MatrackLogo size="sm" showText={true} />
          </button>
          {currentView !== 'odoo' && (
            <>
              <span className="text-slate-600 text-xs">/</span>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-slate-200">
                <ModuleIcon className={`w-3.5 h-3.5 ${moduleInfo.color}`} />
                <span>{moduleInfo.name}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Quick shortcuts, Backend indicator & Profile Menu */}
      <div className="flex items-center space-x-3">
        {/* Quick Module Switchers (Desktop) */}
        {currentView !== 'odoo' && (
          <div className="hidden md:flex items-center bg-slate-900/90 rounded-lg p-1 border border-white/5 space-x-1">
            <button
              onClick={() => onNavigate('notes')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center space-x-1.5 ${
                currentView === 'notes'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
            <button
              onClick={() => onNavigate('schedule')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center space-x-1.5 ${
                currentView === 'schedule'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </button>
          </div>
        )}

        {/* Database / Supabase indicator */}
        <div 
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/10 text-[11px] text-slate-300"
          title={supabaseConnected ? "API & Supabase connection healthy" : "Offline / Connecting"}
        >
          <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <Database className="w-3 h-3 text-slate-400" />
          <span className="font-mono">{supabaseConnected ? 'Supabase Ready' : 'Connecting...'}</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all active:scale-95"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-semibold text-xs flex items-center justify-center shadow-inner">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-medium text-slate-200 hidden sm:inline max-w-[100px] truncate">
              {user?.name || 'Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl p-2 z-50 animate-pop-in">
              <div className="px-3 py-2.5 border-b border-white/10">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                {stats && (
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px] bg-slate-950/60 p-2 rounded-lg border border-white/5">
                    <div>
                      <span className="text-slate-400 block">Notes:</span>
                      <span className="text-amber-400 font-semibold">{stats.notes_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tasks:</span>
                      <span className="text-blue-400 font-semibold">{stats.tasks_completed || 0}/{stats.tasks_total || 0} done</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-purple-400" />
                  <span>Settings & Supabase</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('odoo');
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <LayoutGrid className="w-4 h-4 text-emerald-400" />
                  <span>Odoo App Launcher</span>
                </button>
              </div>

              <div className="border-t border-white/10 pt-1">
                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
