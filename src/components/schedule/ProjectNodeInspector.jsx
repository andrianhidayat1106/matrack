import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ArrowRight, 
  Calendar,
  AlertCircle,
  Flag,
  Check,
  RotateCcw
} from 'lucide-react';

export const ProjectNodeInspector = ({
  project,
  onClose,
  onRenameProject,
  onDeleteProject,
  onOpenTaskModal,
  onMoveTaskStatus,
  onDeleteTask
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project?.name || '');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'belum', 'progress', 'selesai'
  const [quickNewTaskTitle, setQuickNewTaskTitle] = useState('');
  const [quickTaskColId, setQuickTaskColId] = useState('');

  if (!project) return null;

  // Calculate metrics
  const columns = project.columns || [];
  const belumCol = columns.find(c => c.name.toLowerCase().includes('belum')) || columns[0];
  const progressCol = columns.find(c => c.name.toLowerCase().includes('masih') || c.name.toLowerCase().includes('progress')) || columns[1];
  const selesaiCol = columns.find(c => c.name.toLowerCase().includes('selesai') || c.name.toLowerCase().includes('done')) || columns[2];

  const allTasks = columns.flatMap(c => (c.tasks || []).map(t => ({ ...t, column_name: c.name, column_id: c.id })));
  const doneTasks = (selesaiCol?.tasks || []);
  const inProgressTasks = (progressCol?.tasks || []);
  const pendingTasks = (belumCol?.tasks || []);

  const totalCount = allTasks.length;
  const doneCount = doneTasks.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleSaveTitle = (e) => {
    e.preventDefault();
    if (editedTitle.trim()) {
      onRenameProject(project.id, editedTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const handleQuickAddTask = (e) => {
    e.preventDefault();
    if (!quickNewTaskTitle.trim()) return;
    const targetCol = quickTaskColId || belumCol?.id || columns[0]?.id;
    onOpenTaskModal({
      prefillTitle: quickNewTaskTitle.trim(),
      prefillColumnId: targetCol
    });
    setQuickNewTaskTitle('');
  };

  return (
    <div className="fixed inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] z-50 flex flex-col bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl animate-pop-in text-slate-100">
      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400">
              Pengaturan Node Proyek
            </span>
            <p className="text-xs text-slate-400">Obsidian Mind Map Inspector</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Tutup Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Project Title & Rename */}
        <div className="space-y-2">
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} className="flex items-center space-x-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-blue-500 text-sm font-bold text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2">
                <span>{project.name}</span>
                <button
                  onClick={() => {
                    setEditedTitle(project.name);
                    setIsEditingTitle(true);
                  }}
                  className="p-1 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-white/5 transition-colors"
                  title="Ubah Nama Proyek"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </h2>

              <button
                onClick={() => onDeleteProject(project.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="Hapus Proyek"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Progress & Stats Cards */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Tingkat Kemajuan Proyek:</span>
            <span className="font-extrabold text-emerald-400">{progressPct}%</span>
          </div>

          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPct === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="block text-[10px] text-amber-300 font-medium">Belum</span>
              <span className="text-sm font-extrabold text-white">{pendingTasks.length}</span>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="block text-[10px] text-blue-300 font-medium">Berjalan</span>
              <span className="text-sm font-extrabold text-white">{inProgressTasks.length}</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="block text-[10px] text-emerald-300 font-medium">Selesai</span>
              <span className="text-sm font-extrabold text-white">{doneTasks.length}</span>
            </div>
          </div>
        </div>

        {/* Quick Add Task Form */}
        <form onSubmit={handleQuickAddTask} className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Tambah Tugas Cepat ke Proyek Ini:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ketik judul tugas baru..."
              value={quickNewTaskTitle}
              onChange={(e) => setQuickNewTaskTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!quickNewTaskTitle.trim()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center space-x-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </form>

        {/* Task Columns Filter Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Daftar Tugas Node ({totalCount})
            </h3>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-white/5 text-[11px] font-medium space-x-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('belum')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${
                activeTab === 'belum'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Belum ({pendingTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${
                activeTab === 'progress'
                  ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Proses ({inProgressTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('selesai')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap text-center ${
                activeTab === 'selesai'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Selesai ({doneTasks.length})
            </button>
          </div>

          {/* Tasks List with 1-click status transitions */}
          <div className="space-y-2.5">
            {allTasks
              .filter((t) => {
                if (activeTab === 'belum') return t.column_id === belumCol?.id;
                if (activeTab === 'progress') return t.column_id === progressCol?.id;
                if (activeTab === 'selesai') return t.column_id === selesaiCol?.id;
                return true;
              })
              .map((task) => {
                const isDone = task.column_id === selesaiCol?.id;
                const isInProgress = task.column_id === progressCol?.id;

                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-white/5 hover:border-white/20 transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isDone
                                ? 'bg-emerald-400'
                                : isInProgress
                                ? 'bg-blue-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <h4
                            onClick={() => onOpenTaskModal({ task })}
                            className={`text-xs font-semibold cursor-pointer hover:text-blue-400 transition-colors truncate ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-200'
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 pl-4">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Edit modal trigger */}
                      <button
                        onClick={() => onOpenTaskModal({ task })}
                        className="p-1 text-slate-500 hover:text-white rounded-lg transition-colors shrink-0"
                        title="Edit Tugas Lengkap"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Footer: Quick status transition buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                      <div className="flex items-center space-x-1 text-slate-500">
                        {task.due_date && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        {!isDone && selesaiCol && (
                          <button
                            onClick={() => onMoveTaskStatus(task.id, selesaiCol.id)}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium flex items-center space-x-1"
                            title="Tandai Selesai"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>Selesai</span>
                          </button>
                        )}

                        {!isInProgress && !isDone && progressCol && (
                          <button
                            onClick={() => onMoveTaskStatus(task.id, progressCol.id)}
                            className="px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-medium flex items-center space-x-1"
                            title="Mulai Kerjakan"
                          >
                            <ArrowRight className="w-2.5 h-2.5" />
                            <span>Kerjakan</span>
                          </button>
                        )}

                        {isDone && belumCol && (
                          <button
                            onClick={() => onMoveTaskStatus(task.id, belumCol.id)}
                            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center space-x-1"
                            title="Kembalikan ke Belum"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Batal</span>
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {allTasks.length === 0 && (
              <div className="py-8 text-center space-y-2 border border-dashed border-white/10 rounded-2xl">
                <p className="text-xs text-slate-500">Belum ada tugas di proyek ini.</p>
                <button
                  onClick={() => onOpenTaskModal({ prefillColumnId: belumCol?.id })}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 text-xs font-semibold hover:bg-blue-600/30 border border-blue-500/30"
                >
                  + Tambah Tugas Pertama
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
