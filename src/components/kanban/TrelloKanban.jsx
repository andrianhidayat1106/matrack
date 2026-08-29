import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  AlertCircle, 
  CheckCircle2, 
  Flag,
  Trash2,
  Edit2,
  Columns,
  Layers,
  FolderPlus,
  TrendingUp,
  ChevronDown,
  CheckCircle
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
import { useAuth } from '../../context/AuthContext';
import { TaskModal } from './TaskModal';

export const TrelloKanban = () => {
  const { user, refreshUserStats } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, low, medium, high
  const [dateFilter, setDateFilter] = useState('all'); // all, today, upcoming, overdue

  // Modals & Inline Inputs
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [targetColumnForNewTask, setTargetColumnForNewTask] = useState(null);

  // Add Project Group Row Modal/State
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Fetch Boards (Each Board = 1 Project Row with 3 Columns)
  const fetchBoardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getBoards(user.id);
      setBoards(data || []);
    } catch (err) {
      console.error('Failed to fetch boards', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [user]);

  // Filter Tasks Helper
  const filterTask = (task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    if (dateFilter !== 'all') {
      if (!task.due_date) return false;
      const today = new Date().toISOString().substring(0, 10);
      const taskDate = task.due_date.substring(0, 10);

      if (dateFilter === 'today' && taskDate !== today) return false;
      if (dateFilter === 'overdue' && taskDate >= today) return false;
      if (dateFilter === 'upcoming' && taskDate <= today) return false;
    }

    return true;
  };

  // Drag and Drop Handler across all boards and columns
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColId = String(source.droppableId);
    const destColId = String(destination.droppableId);
    const taskId = String(draggableId);

    let movedTask = null;

    // 1. Remove from source column
    const step1Boards = boards.map((b) => ({
      ...b,
      columns: (b.columns || []).map((col) => {
        if (String(col.id) === sourceColId) {
          const remaining = (col.tasks || []).filter((t) => {
            if (String(t.id) === taskId) {
              movedTask = { ...t, column_id: destColId };
              return false;
            }
            return true;
          });
          return { ...col, tasks: remaining };
        }
        return col;
      }),
    }));

    if (!movedTask) return;

    // 2. Add to destination column at exact destination index
    const finalBoards = step1Boards.map((b) => ({
      ...b,
      columns: (b.columns || []).map((col) => {
        if (String(col.id) === destColId) {
          const list = [...(col.tasks || [])];
          list.splice(destination.index, 0, movedTask);
          return { ...col, tasks: list };
        }
        return col;
      }),
    }));

    // 3. Immediately render updated state
    setBoards(finalBoards);

    // 4. Persist to storage & database
    try {
      await moveTask(taskId, destColId, destination.index);
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to persist move task', err);
    }
  };

  // Create Project Group (Automatic 3 columns on a new line)
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    try {
      const created = await createProjectGroup(user.id, newGroupName.trim());
      if (created) {
        setBoards((prev) => [...prev, created]);
      }
      setNewGroupName('');
      setShowAddGroup(false);
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  // Rename Project Group
  const handleRenameGroup = async (boardId) => {
    if (!editingGroupName.trim()) return;
    try {
      await updateProjectGroup(boardId, editingGroupName.trim());
      setBoards((prev) =>
        prev.map((b) =>
          String(b.id) === String(boardId) ? { ...b, name: editingGroupName.trim() } : b
        )
      );
      setEditingGroupId(null);
    } catch (err) {
      console.error('Failed to rename group', err);
    }
  };

  // Delete Project Group
  const handleDeleteGroup = async (boardId) => {
    if (!window.confirm('Hapus baris proyek ini beserta seluruh tugasnya?')) return;
    try {
      await deleteProjectGroup(boardId);
      setBoards((prev) => prev.filter((b) => String(b.id) !== String(boardId)));
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to delete group', err);
    }
  };

  // Task Modal Handlers
  const handleOpenCreateTask = (columnId) => {
    setEditingTask(null);
    setTargetColumnForNewTask(columnId);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    if (!user) return;
    try {
      if (taskData.id) {
        // Update existing task
        const updated = await updateTask(taskData.id, taskData);
        
        // Update local UI state
        setBoards((prev) => {
          let updatedTaskObj = null;

          // 1. Remove old task instance
          const stripped = prev.map((b) => ({
            ...b,
            columns: (b.columns || []).map((col) => {
              const remaining = (col.tasks || []).filter((t) => {
                if (String(t.id) === String(taskData.id)) {
                  updatedTaskObj = { ...t, ...taskData, ...updated };
                  return false;
                }
                return true;
              });
              return { ...col, tasks: remaining };
            }),
          }));

          if (!updatedTaskObj) {
            updatedTaskObj = { id: taskData.id, ...taskData, ...updated };
          }

          // 2. Insert into column
          const destColId = String(taskData.column_id || updatedTaskObj.column_id);
          return stripped.map((b) => ({
            ...b,
            columns: (b.columns || []).map((col) => {
              if (String(col.id) === destColId) {
                return {
                  ...col,
                  tasks: [updatedTaskObj, ...(col.tasks || [])],
                };
              }
              return col;
            }),
          }));
        });
      } else {
        // Create new task
        const targetCol = taskData.column_id || targetColumnForNewTask;
        const created = await createTask({
          ...taskData,
          user_id: user.id,
          column_id: targetCol,
          position: 0,
        });

        if (created) {
          setBoards((prev) =>
            prev.map((b) => ({
              ...b,
              columns: (b.columns || []).map((col) => {
                if (String(col.id) === String(targetCol)) {
                  return { ...col, tasks: [created, ...(col.tasks || [])] };
                }
                return col;
              }),
            }))
          );
        }
      }
      setIsTaskModalOpen(false);
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to save task', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      setBoards((prev) =>
        prev.map((b) => ({
          ...b,
          columns: (b.columns || []).map((col) => ({
            ...col,
            tasks: (col.tasks || []).filter((t) => t.id !== taskId),
          })),
        }))
      );
      setIsTaskModalOpen(false);
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  // Get all columns for task modal select dropdown
  const allAvailableColumns = boards.flatMap((b) =>
    (b.columns || []).map((c) => ({
      id: c.id,
      name: `${b.name} → ${c.name}`,
    }))
  );

  // Column header badge & color styling
  const getColumnStyle = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('selesai') || lower.includes('done')) {
      return {
        pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-950/10',
        dot: 'bg-emerald-400',
      };
    }
    if (lower.includes('masih') || lower.includes('progress') || lower.includes('doing')) {
      return {
        pill: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        border: 'border-blue-500/20',
        bg: 'bg-blue-950/10',
        dot: 'bg-blue-400',
      };
    }
    // Default: Belum / To Do
    return {
      pill: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      border: 'border-amber-500/20',
      bg: 'bg-amber-950/10',
      dot: 'bg-amber-400',
    };
  };

  // Priority & Date helpers
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">High</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Low</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Medium</span>;
    }
  };

  const getDueDateBadge = (dueDateString) => {
    if (!dueDateString) return null;
    const today = new Date().toISOString().substring(0, 10);
    const dateStr = dueDateString.substring(0, 10);
    const isOverdue = dateStr < today;
    const isToday = dateStr === today;

    const formatted = new Date(dueDateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });

    if (isOverdue) {
      return (
        <span className="flex items-center space-x-1 text-[10px] font-semibold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
          <AlertCircle className="w-2.5 h-2.5" />
          <span>{formatted} (Terlewat)</span>
        </span>
      );
    }

    if (isToday) {
      return (
        <span className="flex items-center space-x-1 text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
          <Clock className="w-2.5 h-2.5" />
          <span>Hari Ini</span>
        </span>
      );
    }

    return (
      <span className="flex items-center space-x-1 text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
        <Calendar className="w-2.5 h-2.5" />
        <span>{formatted}</span>
      </span>
    );
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 text-slate-100 pb-16 overflow-y-auto">
      {/* ------------------------------------------------------------- */}
      {/* Top Filter & Quick Controls Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        {/* Left: Search & Quick Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Prioritas:</span>
            {['all', 'high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  priorityFilter === p
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {p === 'all' ? 'Semua' : p}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Tenggat:</span>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'today', label: 'Hari Ini' },
              { id: 'upcoming', label: 'Mendatang' },
              { id: 'overdue', label: 'Terlewat' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  dateFilter === d.id
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Add New Project Group Row Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddGroup(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Tambah Baris / Proyek Baru</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Multi-Row Project Lanes (1 Project = 3 Columns on New Line) */}
      {/* ------------------------------------------------------------- */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
        {loading && boards.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            Memuat papan jadwal...
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            {boards.map((board) => {
              // Calculate progress
              const allBoardTasks = (board.columns || []).flatMap((c) => c.tasks || []);
              const doneTasks = (board.columns || [])
                .filter((c) => c.name.toLowerCase().includes('selesai') || c.name.toLowerCase().includes('done'))
                .flatMap((c) => c.tasks || []);
              const progressPct = allBoardTasks.length > 0 
                ? Math.round((doneTasks.length / allBoardTasks.length) * 100) 
                : 0;

              return (
                <div
                  key={board.id}
                  className="rounded-3xl bg-slate-900/80 border border-white/10 p-6 shadow-2xl backdrop-blur-xl space-y-5"
                >
                  {/* Row Header: Project Title, Progress & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                        <Layers className="w-5 h-5" />
                      </div>

                      {editingGroupId === board.id ? (
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onBlur={() => handleRenameGroup(board.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameGroup(board.id);
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                          autoFocus
                          className="px-3 py-1 rounded-xl bg-slate-950 border border-blue-500 text-sm font-bold text-white focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <h3
                            onClick={() => {
                              setEditingGroupId(board.id);
                              setEditingGroupName(board.name);
                            }}
                            className="text-base font-extrabold text-white tracking-tight cursor-pointer hover:text-blue-400 transition-colors flex items-center space-x-2"
                            title="Klik untuk mengubah nama proyek"
                          >
                            <span>{board.name}</span>
                            <Edit2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                          </h3>
                        </div>
                      )}
                    </div>

                    {/* Progress Indicator & Delete Row Button */}
                    <div className="flex items-center space-x-4">
                      {/* Progress bar */}
                      <div className="flex items-center space-x-3 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-white/5 text-xs">
                        <span className="text-slate-400">Progress:</span>
                        <span className="font-bold text-emerald-400">{doneTasks.length}/{allBoardTasks.length} Selesai</span>
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-slate-400 text-[11px]">{progressPct}%</span>
                      </div>

                      {/* Delete Project Row */}
                      {boards.length > 1 && (
                        <button
                          onClick={() => handleDeleteGroup(board.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Hapus baris proyek ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3 Columns Grid for this Project Row: Belum, Masih Dilakukan, Selesai */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(board.columns || []).map((column) => {
                      const filteredTasks = (column.tasks || []).filter(filterTask);
                      const style = getColumnStyle(column.name);

                      return (
                        <div
                          key={column.id}
                          className={`rounded-2xl border ${style.border} ${style.bg} p-4 flex flex-col justify-between min-h-[220px] transition-all`}
                        >
                          {/* Column Title & Add Button */}
                          <div>
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                  {column.name}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.pill}`}>
                                  {filteredTasks.length}
                                </span>
                              </div>

                              <button
                                onClick={() => handleOpenCreateTask(column.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                title={`Tambah tugas di kolom ${column.name}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Droppable Task List */}
                            <Droppable droppableId={String(column.id)}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`space-y-2.5 min-h-[100px] transition-colors rounded-xl ${
                                    snapshot.isDraggingOver ? 'bg-blue-500/10 p-1' : ''
                                  }`}
                                >
                                  {filteredTasks.map((task, index) => (
                                    <Draggable
                                      key={task.id}
                                      draggableId={String(task.id)}
                                      index={index}
                                    >
                                      {(dragProvided, dragSnapshot) => (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          {...dragProvided.dragHandleProps}
                                          onClick={() => handleOpenEditTask(task)}
                                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer group select-none ${
                                            dragSnapshot.isDragging
                                              ? 'bg-slate-800 border-blue-500 shadow-2xl scale-105 rotate-1 z-50'
                                              : 'bg-slate-950/80 hover:bg-slate-850 border-white/10 hover:border-white/20 shadow-md'
                                          }`}
                                        >
                                          {/* Badges row: Priority & Due Date */}
                                          <div className="flex items-center justify-between gap-2 mb-2">
                                            {getPriorityBadge(task.priority)}
                                            {getDueDateBadge(task.due_date)}
                                          </div>

                                          {/* Title */}
                                          <h5 className="text-xs font-semibold text-slate-200 group-hover:text-white leading-snug">
                                            {task.title}
                                          </h5>

                                          {/* Description Snippet */}
                                          {task.description && (
                                            <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                              {task.description}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>

                          {/* Inline "+ Tambah tugas" button */}
                          <button
                            onClick={() => handleOpenCreateTask(column.id)}
                            className="w-full mt-3 py-2 px-3 rounded-xl border border-dashed border-white/10 hover:border-white/20 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah kartu {column.name}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </DragDropContext>
        )}

        {/* Add New Project Row Button at Bottom */}
        {showAddGroup ? (
          <form
            onSubmit={handleCreateGroup}
            className="p-6 rounded-3xl bg-slate-900 border border-blue-500/40 shadow-2xl space-y-4 max-w-lg mx-auto animate-pop-in"
          >
            <div className="flex items-center space-x-2">
              <FolderPlus className="w-5 h-5 text-blue-400" />
              <h4 className="text-sm font-bold text-white">
                Tambah Baris Proyek Baru (Otomatis 3 Kolom)
              </h4>
            </div>
            <p className="text-xs text-slate-400">
              Baris baru ini akan otomatis memiliki 3 status kolom: <strong>Belum</strong>, <strong>Masih Dilakukan</strong>, dan <strong>Selesai</strong>.
            </p>
            <input
              type="text"
              placeholder="Nama Baris / Proyek (misal: Sprint 2, Pekerjaan Kantor, Target Q3)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddGroup(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all"
              >
                Buat Baris Baru
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddGroup(true)}
            className="w-full py-5 rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 text-slate-400 hover:text-blue-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>+ Tambah Baris / Proyek Baru (Otomatis 3 Kolom: Belum, Masih Dilakukan, Selesai)</span>
          </button>
        )}
      </div>

      {/* Task Modal for Creation & Details */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        targetColumnId={targetColumnForNewTask}
        columns={allAvailableColumns}
      />
    </div>
  );
};
