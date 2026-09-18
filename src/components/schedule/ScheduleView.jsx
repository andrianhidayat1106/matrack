import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Kanban, 
  Plus, 
  Search, 
  Filter, 
  FolderPlus, 
  Layers, 
  Sparkles,
  Database,
  ArrowRight
} from 'lucide-react';
import { 
  getBoards, 
  createProjectGroup, 
  updateProjectGroup, 
  deleteProjectGroup, 
  createTask, 
  updateTask, 
  moveTask, 
  deleteTask 
} from '../../services/db';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { ObsidianBrainGraph } from './ObsidianBrainGraph';
import { ProjectNodeInspector } from './ProjectNodeInspector';
import { TrelloKanban } from '../kanban/TrelloKanban';
import { TaskModal } from '../kanban/TaskModal';

export const ScheduleView = () => {
  const { user, refreshUserStats } = useAuth();
  const [boards, setBoards] = useState(() => {
    try {
      const saved = localStorage.getItem(`matrack_boards_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  // View mode: 'graph' (Obsidian Brain Map) or 'kanban' (Trello Board)
  const [viewMode, setViewMode] = useState('graph');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Inspector & Modal states
  const [selectedProject, setSelectedProject] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [targetColumnId, setTargetColumnId] = useState(null);

  // Add Project modal/inline
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Fetch boards data from Supabase / localStorage
  const fetchBoardData = async (showSpinner = false) => {
    if (!user?.id) return;
    try {
      if (showSpinner) setLoading(true);
      const data = await getBoards(user.id);
      setBoards(data || []);
      // If a project was selected in the inspector, update its reference
      if (selectedProject) {
        const updated = (data || []).find(b => String(b.id) === String(selectedProject.id));
        if (updated) setSelectedProject(updated);
      }
    } catch (err) {
      console.error('Failed to fetch schedule boards', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchBoardData(true);

    const channelName = `realtime-schedule-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchBoardData(false);
        refreshUserStats(user.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, () => {
        fetchBoardData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, () => {
        fetchBoardData(false);
      })
      .subscribe();

    const handleSync = () => {
      fetchBoardData(false);
      refreshUserStats(user.id);
    };

    window.addEventListener('focus', handleSync);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleSync);
    };
  }, [user?.id]);

  // Project Actions
  const handleCreateProject = async (e) => {
    if (e) e.preventDefault();
    const name = newProjectName.trim() || 'Proyek Baru';
    if (!user?.id) return;

    try {
      const created = await createProjectGroup(user.id, name);
      if (created) {
        setBoards(prev => [...prev, created]);
        setSelectedProject(created); // Open inspector for the newly created project
      }
      setNewProjectName('');
      setShowAddProjectModal(false);
      refreshUserStats(user.id);
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  const handleRenameProject = async (boardId, newName) => {
    try {
      await updateProjectGroup(boardId, newName);
      setBoards(prev =>
        prev.map(b => (String(b.id) === String(boardId) ? { ...b, name: newName } : b))
      );
      if (selectedProject && String(selectedProject.id) === String(boardId)) {
        setSelectedProject(prev => ({ ...prev, name: newName }));
      }
    } catch (err) {
      console.error('Failed to rename project', err);
    }
  };

  const handleDeleteProject = async (boardId) => {
    if (!window.confirm('Hapus proyek ini beserta seluruh tugasnya dari pemetaan otak?')) return;
    try {
      await deleteProjectGroup(boardId);
      setBoards(prev => prev.filter(b => String(b.id) !== String(boardId)));
      if (selectedProject && String(selectedProject.id) === String(boardId)) {
        setSelectedProject(null);
      }
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  // Task Actions
  const handleOpenTaskModal = ({ task = null, prefillColumnId = null, prefillTitle = '' } = {}) => {
    setEditingTask(task ? { ...task } : (prefillTitle ? { title: prefillTitle } : null));
    setTargetColumnId(prefillColumnId || (selectedProject?.columns?.[0]?.id) || null);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskPayload) => {
    if (!user?.id) return;

    try {
      if (taskPayload.id) {
        // Update existing task
        await updateTask(taskPayload.id, taskPayload);
      } else {
        // Create new task
        await createTask({
          ...taskPayload,
          user_id: user.id
        });
      }

      await fetchBoardData(false);
      setIsTaskModalOpen(false);
      setEditingTask(null);
      refreshUserStats(user.id);
    } catch (err) {
      console.error('Failed to save task', err);
    }
  };

  const handleMoveTaskStatus = async (taskId, destinationColumnId) => {
    try {
      await moveTask(taskId, destinationColumnId, 0);
      await fetchBoardData(false);
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to move task status', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Hapus kartu tugas ini?')) return;
    try {
      await deleteTask(taskId);
      await fetchBoardData(false);
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  // Flatten all available columns for the TaskModal dropdown
  const allAvailableColumns = boards.flatMap(b =>
    (b.columns || []).map(c => ({
      id: c.id,
      name: `${b.name} → ${c.name}`
    }))
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 text-slate-100 relative">
      {/* ------------------------------------------------------------- */}
      {/* Top Schedule Controls & View Switcher Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        {/* Left: View Switcher (Obsidian Brain Map vs Kanban) */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'graph'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>🧠 Brain Graph</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>📋 Kanban Boards</span>
            </button>
          </div>
        </div>

        {/* Center/Right: Search, Priority Filter & New Project Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-40 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari dalam grafik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Priority filter */}
          <div className="hidden sm:flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-[11px]">
            {['all', 'high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2 py-0.5 rounded-lg capitalize transition-colors ${
                  priorityFilter === p
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'all' ? 'Semua' : p}
              </button>
            ))}
          </div>

          {/* Add Project Button */}
          <button
            onClick={() => setShowAddProjectModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Proyek Baru</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main View Area: Obsidian Brain Graph OR Trello Kanban */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 relative">
        {loading && boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Memuat Pemetaan Proyek & Jadwal...</span>
          </div>
        ) : viewMode === 'graph' ? (
          <ObsidianBrainGraph
            boards={boards}
            searchQuery={searchQuery}
            priorityFilter={priorityFilter}
            onSelectProject={(project) => setSelectedProject(project)}
            onSelectTask={(task, project) => {
              handleOpenTaskModal({ task });
            }}
            onCreateProject={() => setShowAddProjectModal(true)}
          />
        ) : (
          <TrelloKanban />
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Slide-over Project Inspector (Obsidian Node Setting Panel) */}
      {/* ------------------------------------------------------------- */}
      {selectedProject && (
        <ProjectNodeInspector
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onOpenTaskModal={handleOpenTaskModal}
          onMoveTaskStatus={handleMoveTaskStatus}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* Full Task Modal for Deep Editing */}
      {/* ------------------------------------------------------------- */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        targetColumnId={targetColumnId}
        columns={allAvailableColumns}
      />

      {/* ------------------------------------------------------------- */}
      {/* Add New Project Modal */}
      {/* ------------------------------------------------------------- */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full animate-pop-in space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Buat Node Proyek Baru</h3>
            </div>
            <p className="text-xs text-slate-400">
              Proyek ini akan otomatis terhubung ke Otak Pemetaan dan memiliki 3 status kolom (Belum, Masih Dilakukan, Selesai).
            </p>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <input
                type="text"
                placeholder="Nama proyek (contoh: Website E-Commerce, Skripsi...)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
                >
                  Buat Proyek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
