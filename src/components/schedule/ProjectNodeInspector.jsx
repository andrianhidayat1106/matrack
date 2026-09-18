import React, { useState, useEffect } from 'react';
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
  RotateCcw,
  FileText,
  FileEdit,
  ExternalLink
} from 'lucide-react';
import { getNotesForProject, createNote, deleteNote } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

export const ProjectNodeInspector = ({
  project,
  onClose,
  onRenameProject,
  onDeleteProject,
  onOpenTaskModal,
  onMoveTaskStatus,
  onDeleteTask
}) => {
  const { user } = useAuth();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project?.name || '');
  const [mainTab, setMainTab] = useState('tasks'); // 'tasks' | 'notes'
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'belum', 'progress', 'selesai'
  const [quickNewTaskTitle, setQuickNewTaskTitle] = useState('');
  const [quickTaskColId, setQuickTaskColId] = useState('');

  // Project Notes state
  const [projectNotes, setProjectNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);

  useEffect(() => {
    if (user?.id && project?.name) {
      loadProjectNotes();
    }
  }, [user?.id, project?.name]);

  const loadProjectNotes = async () => {
    if (!user?.id || !project?.name) return;
    setLoadingNotes(true);
    try {
      const list = await getNotesForProject(user.id, project.name);
      setProjectNotes(list || []);
    } catch (err) {
      console.error('Failed to load project notes', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleCreateProjectNote = async (e) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !user?.id) return;

    try {
      const created = await createNote(user.id, {
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        folder: project.name,
      });

      if (created) {
        setProjectNotes((prev) => [created, ...prev]);
        setNewNoteTitle('');
        setNewNoteContent('');
        setShowAddNoteForm(false);
        setExpandedNoteId(created.id);
      }
    } catch (err) {
      console.error('Failed to create note in project', err);
    }
  };

  const handleDeleteProjectNote = async (noteId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Hapus catatan proyek ini?')) return;
    try {
      await deleteNote(noteId, false);
      setProjectNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (expandedNoteId === noteId) setExpandedNoteId(null);
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

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

        {/* Inspector Main View Switcher: Tasks vs Project Notes */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMainTab('tasks')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              mainTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tugas ({totalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('notes')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              mainTab === 'notes'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Catatan ({projectNotes.length})</span>
          </button>
        </div>

        {mainTab === 'tasks' ? (
          <>
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

              {/* Tasks List */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {allTasks
                  .filter((t) => {
                    if (activeTab === 'all') return true;
                    if (activeTab === 'belum') return belumCol?.tasks?.some((bt) => bt.id === t.id);
                    if (activeTab === 'progress')
                      return progressCol?.tasks?.some((pt) => pt.id === t.id);
                    if (activeTab === 'selesai')
                      return selesaiCol?.tasks?.some((st) => st.id === t.id);
                    return true;
                  })
                  .map((task) => {
                    const isDone = selesaiCol?.tasks?.some((st) => st.id === task.id);
                    const isInProgress = progressCol?.tasks?.some((pt) => pt.id === task.id);

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isDone
                            ? 'bg-slate-950/40 border-white/5 opacity-70'
                            : 'bg-slate-950/80 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            onClick={() => onOpenTaskModal({ task })}
                            className="flex-1 cursor-pointer"
                          >
                            <h4
                              className={`text-xs font-semibold ${
                                isDone ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-2 text-[10px]">
                              <span
                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                  task.priority === 'high'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : task.priority === 'medium'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}
                              >
                                {task.priority || 'medium'}
                              </span>
                              {task.due_date && (
                                <span className="text-slate-400 flex items-center space-x-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 text-xs shrink-0">
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
          </>
        ) : (
          /* ============================================================== */
          /* Catatan Khusus Proyek (Project-Specific Notes)                  */
          /* ============================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Catatan Khusus Proyek Ini</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tersinkronisasi otomatis dengan folder <span className="font-semibold text-white">{project.name}</span> di Apple Notes
                </p>
              </div>

              <button
                onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Catatan</span>
              </button>
            </div>

            {/* Add Note Inline Form */}
            {showAddNoteForm && (
              <form
                onSubmit={handleCreateProjectNote}
                className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 animate-pop-in"
              >
                <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Tulis Catatan Baru untuk {project.name}</span>
                </div>
                <input
                  type="text"
                  placeholder="Judul Catatan..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <textarea
                  placeholder="Isi catatan proyek (ide, spesifikasi, log kemajuan)..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddNoteForm(false)}
                    className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!newNoteTitle.trim()}
                    className="px-3.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-40"
                  >
                    Simpan Catatan
                  </button>
                </div>
              </form>
            )}

            {/* Notes List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {loadingNotes ? (
                <div className="py-6 text-center text-xs text-slate-500">Memuat catatan proyek...</div>
              ) : projectNotes.length === 0 ? (
                <div className="py-8 text-center space-y-2 border border-dashed border-white/10 rounded-2xl">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Belum ada catatan untuk proyek <span className="font-semibold text-white">{project.name}</span>.</p>
                  <button
                    onClick={() => setShowAddNoteForm(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 border border-amber-500/30"
                  >
                    + Buat Catatan Pertama
                  </button>
                </div>
              ) : (
                projectNotes.map((note) => {
                  const isExpanded = expandedNoteId === note.id;
                  const cleanPreview = (note.content || '').replace(/[#*`_~\[\]]/g, '').trim();

                  return (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-white/10 hover:border-amber-500/30 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                          className="flex-1 cursor-pointer"
                        >
                          <h4 className="text-xs font-bold text-amber-200 hover:text-amber-100 flex items-center space-x-1.5">
                            <span>{note.title || 'Untitled Note'}</span>
                            {note.is_pinned && <span className="text-[10px] text-amber-400">📌</span>}
                          </h4>
                          {!isExpanded && cleanPreview && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                              {cleanPreview}
                            </p>
                          )}
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center space-x-2">
                            <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="text-amber-400/80 font-mono">
                              {isExpanded ? 'Klik untuk tutup' : 'Klik untuk membaca'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => handleDeleteProjectNote(note.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Full Note Content */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-white/5 text-xs text-slate-300 space-y-2 bg-slate-900/60 p-2.5 rounded-lg whitespace-pre-wrap font-mono leading-relaxed">
                          {note.content || <span className="text-slate-500 italic">Tidak ada teks isi.</span>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
