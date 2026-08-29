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
  Columns
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { TaskModal } from './TaskModal';

export const TrelloKanban = () => {
  const { refreshUserStats } = useAuth();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, low, medium, high
  const [dateFilter, setDateFilter] = useState('all'); // all, today, upcoming, overdue

  // Modals & Inline Inputs
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [targetColumnForNewTask, setTargetColumnForNewTask] = useState(null);

  // Column Creation / Editing
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  // Fetch Board and its Columns & Tasks
  const fetchBoardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/boards');
      if (res.data.boards && res.data.boards.length > 0) {
        const primaryBoard = res.data.boards[0];
        setBoard(primaryBoard);
        setColumns(primaryBoard.columns || []);
      }
    } catch (err) {
      console.error('Failed to fetch boards', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, []);

  // Filter Tasks Helper
  const filterTask = (task) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    // 2. Priority Filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    // 3. Due Date Filter
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

  // Drag and Drop Handler
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColId = parseInt(source.droppableId);
    const destColId = parseInt(destination.droppableId);
    const taskId = parseInt(draggableId);

    // Optimistic UI update
    const newColumns = [...columns];
    const sourceColIndex = newColumns.findIndex((c) => c.id === sourceColId);
    const destColIndex = newColumns.findIndex((c) => c.id === destColId);

    const sourceCol = { ...newColumns[sourceColIndex], tasks: [...newColumns[sourceColIndex].tasks] };
    const destCol = sourceColId === destColId ? sourceCol : { ...newColumns[destColIndex], tasks: [...newColumns[destColIndex].tasks] };

    const [movedTask] = sourceCol.tasks.splice(source.index, 1);
    movedTask.column_id = destColId;
    destCol.tasks.splice(destination.index, 0, movedTask);

    newColumns[sourceColIndex] = sourceCol;
    if (sourceColId !== destColId) {
      newColumns[destColIndex] = destCol;
    }

    setColumns(newColumns);

    // API Call to persist move
    try {
      await api.patch(`/tasks/${taskId}/move`, {
        target_column_id: destColId,
        target_position: destination.index,
      });
      refreshUserStats();
    } catch (err) {
      console.error('Failed to move task on server', err);
      // Revert on error
      fetchBoardData();
    }
  };

  // Open modal to create task in specific column
  const handleOpenCreateTask = (columnId) => {
    setEditingTask(null);
    setTargetColumnForNewTask(columnId);
    setIsTaskModalOpen(true);
  };

  // Open modal to edit existing task
  const handleOpenEditTask = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (taskData) => {
    try {
      if (taskData.id) {
        // Update
        const res = await api.put(`/tasks/${taskData.id}`, taskData);
        setColumns((prev) =>
          prev.map((col) => {
            if (col.id === res.data.task.column_id) {
              return {
                ...col,
                tasks: col.tasks.map((t) => (t.id === taskData.id ? res.data.task : t)),
              };
            } else {
              return {
                ...col,
                tasks: col.tasks.filter((t) => t.id !== taskData.id),
              };
            }
          })
        );
      } else {
        // Create
        const res = await api.post('/tasks', {
          ...taskData,
          column_id: taskData.column_id || targetColumnForNewTask || columns[0]?.id,
        });

        setColumns((prev) =>
          prev.map((col) => {
            if (col.id === res.data.task.column_id) {
              return { ...col, tasks: [...col.tasks, res.data.task] };
            }
            return col;
          })
        );
      }
      setIsTaskModalOpen(false);
      refreshUserStats();
    } catch (err) {
      console.error('Failed to save task', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }))
      );
      setIsTaskModalOpen(false);
      refreshUserStats();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  // Column Actions: Add
  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColumnName.trim() || !board) return;

    try {
      const res = await api.post('/columns', {
        board_id: board.id,
        name: newColumnName.trim(),
      });
      setColumns((prev) => [...prev, { ...res.data.column, tasks: [] }]);
      setNewColumnName('');
      setShowAddColumn(false);
    } catch (err) {
      console.error('Failed to add column', err);
    }
  };

  // Column Actions: Rename
  const handleRenameColumn = async (colId) => {
    if (!editingColumnName.trim()) return;
    try {
      await api.put(`/columns/${colId}`, { name: editingColumnName.trim() });
      setColumns((prev) =>
        prev.map((c) => (c.id === colId ? { ...c, name: editingColumnName.trim() } : c))
      );
      setEditingColumnId(null);
    } catch (err) {
      console.error('Failed to rename column', err);
    }
  };

  // Column Actions: Delete
  const handleDeleteColumn = async (colId) => {
    if (!window.confirm('Delete this column and all of its tasks?')) return;
    try {
      await api.delete(`/columns/${colId}`);
      setColumns((prev) => prev.filter((c) => c.id !== colId));
      refreshUserStats();
    } catch (err) {
      console.error('Failed to delete column', err);
    }
  };

  // Date styling helper
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
          <span>{formatted} (Overdue)</span>
        </span>
      );
    }

    if (isToday) {
      return (
        <span className="flex items-center space-x-1 text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
          <Clock className="w-2.5 h-2.5" />
          <span>Due Today</span>
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

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* Top Filter & Action Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Search & Quick Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Priority:</span>
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
                {p}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Due:</span>
            {['all', 'today', 'upcoming', 'overdue'].map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  dateFilter === d
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Add Column / Add Task Action */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenCreateTask(columns[0]?.id)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Kanban Board Container (Horizontal Scroll) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            Loading Kanban Board...
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex items-start space-x-4 h-full">
              {columns.map((column) => {
                const filteredTasks = (column.tasks || []).filter(filterTask);

                return (
                  <div
                    key={column.id}
                    className="w-80 shrink-0 max-h-full flex flex-col rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-xl"
                  >
                    {/* Column Header */}
                    <div className="p-4 pb-2 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        {editingColumnId === column.id ? (
                          <input
                            type="text"
                            value={editingColumnName}
                            onChange={(e) => setEditingColumnName(e.target.value)}
                            onBlur={() => handleRenameColumn(column.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameColumn(column.id);
                              if (e.key === 'Escape') setEditingColumnId(null);
                            }}
                            autoFocus
                            className="w-full px-2 py-0.5 rounded-lg bg-slate-950 border border-blue-500 text-xs font-bold text-white focus:outline-none"
                          />
                        ) : (
                          <h3
                            onClick={() => {
                              setEditingColumnId(column.id);
                              setEditingColumnName(column.name);
                            }}
                            className="font-bold text-xs uppercase tracking-wider text-slate-200 cursor-pointer hover:text-blue-400 transition-colors truncate"
                            title="Click to rename"
                          >
                            {column.name}
                          </h3>
                        )}

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-400">
                          {filteredTasks.length}
                        </span>
                      </div>

                      {/* Column Actions */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenCreateTask(column.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Add task in this column"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteColumn(column.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Droppable Task Cards Area */}
                    <Droppable droppableId={String(column.id)}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[150px] transition-colors rounded-b-3xl ${
                            snapshot.isDraggingOver ? 'bg-blue-500/5' : ''
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
                                      : 'bg-slate-950/70 hover:bg-slate-800/80 border-white/10 hover:border-white/20 shadow-md'
                                  }`}
                                >
                                  {/* Badges row: Priority & Due Date */}
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    {getPriorityBadge(task.priority)}
                                    {getDueDateBadge(task.due_date)}
                                  </div>

                                  {/* Title */}
                                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white leading-snug">
                                    {task.title}
                                  </h4>

                                  {/* Description Snippet */}
                                  {task.description && (
                                    <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed font-normal">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {/* Quick "+ Add card" button at bottom */}
                          <button
                            onClick={() => handleOpenCreateTask(column.id)}
                            className="w-full py-2 px-3 rounded-xl border border-dashed border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add card</span>
                          </button>
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}

              {/* Add New Column Tile */}
              <div className="w-80 shrink-0">
                {showAddColumn ? (
                  <form
                    onSubmit={handleAddColumn}
                    className="p-4 rounded-3xl bg-slate-900 border border-white/10 space-y-3 shadow-xl animate-pop-in"
                  >
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      New Column Status
                    </h4>
                    <input
                      type="text"
                      placeholder="e.g. In Review, Blocked, Done..."
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowAddColumn(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/30"
                      >
                        Add Column
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowAddColumn(true)}
                    className="w-full p-4 rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 text-slate-400 hover:text-blue-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Column</span>
                  </button>
                )}
              </div>
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Task Modal for Creation & Details */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        columns={columns}
      />
    </div>
  );
};
