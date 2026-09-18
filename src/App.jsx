import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TopHeader } from './components/layout/TopHeader';
import { AppLauncherGrid } from './components/odoo/AppLauncherGrid';
import { AppleNotes } from './components/notes/AppleNotes';
import { JadwalView } from './components/jadwal/JadwalView';
import { ScheduleView } from './components/schedule/ScheduleView';
import { AccountSettings } from './components/settings/AccountSettings';
import { AuthModal } from './components/auth/AuthModal';

class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Module render crash captured:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xl">
            !
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Gagal Membuka Halaman</h3>
            <p className="text-xs text-slate-400 max-w-md">
              {this.state.error?.message || 'Terjadi kendala saat merender modul ini.'}
            </p>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30"
            >
              Coba Buka Lagi
            </button>
            <button
              onClick={() => this.props.onReset?.()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              Kembali ke Launcher
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('odoo'); // 'odoo', 'notes', 'jadwal', 'schedule', 'settings'

  // Keyboard shortcut listener for fast Odoo navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape returns to Odoo Launcher
      if (e.key === 'Escape' && currentView !== 'odoo') {
        setCurrentView('odoo');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-slate-400 font-medium">Loading Matrack Workspace...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Top Header Bar (With Odoo Launcher Grid button in top-left) */}
      <TopHeader currentView={currentView} onNavigate={setCurrentView} />

      {/* Main Module Content Area protected by Error Boundary */}
      <main className="flex-1 pb-16 md:pb-0">
        <ModuleErrorBoundary key={currentView} onReset={() => setCurrentView('odoo')}>
          {currentView === 'odoo' && (
            <AppLauncherGrid onOpenApp={(appId) => setCurrentView(appId)} />
          )}
          {currentView === 'notes' && <AppleNotes />}
          {currentView === 'jadwal' && <JadwalView onNavigate={setCurrentView} />}
          {currentView === 'schedule' && <ScheduleView />}
          {currentView === 'settings' && <AccountSettings />}
        </ModuleErrorBoundary>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
