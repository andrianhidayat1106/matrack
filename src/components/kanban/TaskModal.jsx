import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, AlignLeft, CheckCircle2, Trash2 } from 'lucide-react';

export const TaskModal = ({ isOpen, onClose, onSave, onDelete, initialTask, columns }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setColumnId(initialTask.column_id || (columns[0]?.id || ''));
      setPriority(initialTask.priority || 'medium');
      setDueDate(initialTask.due_date ? initialTask.due_date.substring(0, 10) : '');
    } else {
      setTitle('');
      setDescription('');
      setColumnId(columns[0]?.id || '');
      setPriority('medium');
      setDueDate('');
    }
  }, [initialTask, columns, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: initialTask?.id,
      title: title.trim(),
      description: description.trim(),
      column_id: columnId,
      priority,
      due_date: dueDate || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-pop-in">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              {initialTask ? 'Edit Task Card' : 'Create New Task Card'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Design app architecture..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Description / Notes</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add more details, links, or task specs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none leading-relaxed"
            />
          </div>

          {/* Two-column options: Column & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Column Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Column Status
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id} className="bg-slate-900">
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Priority Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Flag className="w-3.5 h-3.5 text-slate-400" />
              <span>Priority Level</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low', label: 'Low', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
                { id: 'medium', label: 'Medium', color: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
                { id: 'high', label: 'High', color: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
              ].map((lvl) => (
                <button
                  type="button"
                  key={lvl.id}
                  onClick={() => setPriority(lvl.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    priority === lvl.id
                      ? `${lvl.color} ring-2 ring-blue-500 font-bold shadow-md`
                      : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            {initialTask && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(initialTask.id)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Task</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                {initialTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
