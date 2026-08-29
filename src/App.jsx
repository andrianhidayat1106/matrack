import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TopHeader } from './components/layout/TopHeader';
import { AppLauncherGrid } from './components/odoo/AppLauncherGrid';
import { AppleNotes } from './components/notes/AppleNotes';
import { TrelloKanban } from './components/kanban/TrelloKanban';
import { AccountSettings } from './components/settings/AccountSettings';
import { AuthModal } from './components/auth/AuthModal';

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('odoo'); // 'odoo', 'notes', 'schedule', 'settings'

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

      {/* Main Module Content Area */}
      <main className="flex-1">
        {currentView === 'odoo' && (
          <AppLauncherGrid onOpenApp={(appId) => setCurrentView(appId)} />
        )}
        {currentView === 'notes' && <AppleNotes />}
        {currentView === 'schedule' && <TrelloKanban />}
        {currentView === 'settings' && <AccountSettings />}
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
