import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Flame, 
  Sparkles, 
  Cake, 
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getBoards, createTask, updateTask, moveTask, deleteTask } from '../../services/db';
import { TaskModal } from '../kanban/TaskModal';

export const JadwalView = () => {
  const { user, updateProfile, refreshUserStats } = useAuth();

  // Active sub-menu tab: 'weekly' (Tampilan Per Minggu) or 'age_grid' (1 Tahun Sebelum Umur Naik Tingkat)
  const [activeSubTab, setActiveSubTab] = useState('weekly');

  // Boards & tasks state
  const [boards, setBoards] = useState([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [prefillDate, setPrefillDate] = useState(null);
  const [prefillColId, setPrefillColId] = useState(null);

  // Weekly view state: week offset (0 = current week, -1 = previous, +1 = next)
  const [weekOffset, setWeekOffset] = useState(0);

  // Birth date setting modal & state
  const [birthDateInput, setBirthDateInput] = useState(
    user?.birth_date || localStorage.getItem(`matrack_bday_${user?.id}`) || '2000-01-01'
  );
  const [isEditingBday, setIsEditingBday] = useState(false);
  const [hoveredDayCell, setHoveredDayCell] = useState(null);

  // Fetch boards data
  const loadBoards = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getBoards(user.id);
      setBoards(data || []);
    } catch (err) {
      console.error('Failed to load boards for schedule', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    if (user?.birth_date) {
      setBirthDateInput(user.birth_date);
    }
  }, [user?.birth_date]);

  // Extract all tasks across all boards
  const allTasks = useMemo(() => {
    const list = [];
    (boards || []).forEach((b) => {
      (b.columns || []).forEach((c) => {
        (c.tasks || []).forEach((t) => {
          list.push({
            ...t,
            board_id: b.id,
            board_name: b.name,
            column_id: c.id,
            column_name: c.name,
          });
        });
      });
    });
    return list;
  }, [boards]);

  // Flatten available columns for the Task Modal
  const allAvailableColumns = useMemo(() => {
    return boards.flatMap((b) =>
      (b.columns || []).map((c) => ({
        id: c.id,
        name: `${b.name} → ${c.name}`,
      }))
    );
  }, [boards]);

  // Handle task status toggle (Check / Uncheck)
  const handleToggleTaskDone = async (task) => {
    const board = boards.find((b) => String(b.id) === String(task.board_id));
    if (!board) return;

    const cols = board.columns || [];
    const doneCol = cols.find(
      (c) => c.name.toLowerCase().includes('selesai') || c.name.toLowerCase().includes('done')
    ) || cols[cols.length - 1];
    const belumCol = cols.find(
      (c) => c.name.toLowerCase().includes('belum')
    ) || cols[0];

    const isDone = task.column_id === doneCol?.id;
    const targetColId = isDone ? belumCol?.id : doneCol?.id;

    if (!targetColId) return;

    try {
      await moveTask(task.id, targetColId, 0);
      await loadBoards();
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to toggle task completion', err);
    }
  };

  // Save / Update Task
  const handleSaveTask = async (taskPayload) => {
    if (!user?.id) return;
    try {
      if (taskPayload.id) {
        await updateTask(taskPayload.id, taskPayload);
      } else {
        await createTask({
          ...taskPayload,
          user_id: user.id,
        });
      }
      await loadBoards();
      setIsTaskModalOpen(false);
      setEditingTask(null);
      refreshUserStats(user.id);
    } catch (err) {
      console.error('Failed to save task in Jadwal', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Hapus tugas ini?')) return;
    try {
      await deleteTask(taskId);
      await loadBoards();
      setIsTaskModalOpen(false);
      setEditingTask(null);
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  // Open Task modal for specific date
  const handleOpenAddTaskForDate = (dateObj) => {
    setEditingTask(null);
    setPrefillDate(dateObj.toISOString());
    const firstCol = boards[0]?.columns?.[0]?.id || null;
    setPrefillColId(firstCol);
    setIsTaskModalOpen(true);
  };

  // Save birth date
  const handleSaveBirthDate = async (e) => {
    if (e) e.preventDefault();
    if (!birthDateInput) return;

    try {
      localStorage.setItem(`matrack_bday_${user?.id}`, birthDateInput);
      await updateProfile({ birth_date: birthDateInput });
      setIsEditingBday(false);
    } catch (err) {
      console.error('Failed to save birth date', err);
    }
  };

  /* ========================================================================
     WEEKLY VIEW LOGIC
     ======================================================================== */
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    // Adjust by weekOffset
    const baseDate = new Date(today);
    baseDate.setDate(today.getDate() + weekOffset * 7);

    // Find Monday of this week (0 = Sunday, 1 = Monday)
    const currentDay = baseDate.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();

      days.push({
        date: d,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString('id-ID', { month: 'short' }),
        isToday,
      });
    }

    return days;
  }, [weekOffset]);

  const weekRangeLabel = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const start = currentWeekDays[0].date;
    const end = currentWeekDays[6].date;
    return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [currentWeekDays]);

  // Tasks in current week
  const weekTasksByDay = useMemo(() => {
    const map = {};
    currentWeekDays.forEach((d) => {
      map[d.date.toDateString()] = [];
    });

    allTasks.forEach((task) => {
      if (selectedProjectFilter !== 'all' && String(task.board_id) !== String(selectedProjectFilter)) {
        return;
      }

      if (task.due_date) {
        const tDate = new Date(task.due_date).toDateString();
        if (map[tDate]) {
          map[tDate].push(task);
        }
      }
    });

    return map;
  }, [allTasks, currentWeekDays, selectedProjectFilter]);

  // Weekly metrics
  const weeklyMetrics = useMemo(() => {
    let total = 0;
    let completed = 0;

    Object.values(weekTasksByDay).forEach((list) => {
      list.forEach((t) => {
        total++;
        const cName = (t.column_name || '').toLowerCase();
        if (cName.includes('selesai') || cName.includes('done')) {
          completed++;
        }
      });
    });

    const pending = total - completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, pct };
  }, [weekTasksByDay]);

  /* ========================================================================
     KOTAK USIA (1 TAHUN MENUJU LEVEL UP UMUR) - GITHUB CONTRIBUTION HEATMAP
     ======================================================================== */
  const effectiveBirthDate = user?.birth_date || birthDateInput || '2000-01-01';

  const ageGridCalculation = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const bday = new Date(effectiveBirthDate);
    if (isNaN(bday.getTime())) {
      return null;
    }

    const birthMonth = bday.getMonth();
    const birthDay = bday.getDate();
    const birthYear = bday.getFullYear();

    // Birthday in current calendar year
    const currentYearBday = new Date(now.getFullYear(), birthMonth, birthDay);
    currentYearBday.setHours(0, 0, 0, 0);

    let previousBday;
    let nextBday;

    if (now >= currentYearBday) {
      // Already had birthday this calendar year
      previousBday = currentYearBday;
      nextBday = new Date(now.getFullYear() + 1, birthMonth, birthDay);
    } else {
      // Has not had birthday this year yet
      previousBday = new Date(now.getFullYear() - 1, birthMonth, birthDay);
      nextBday = currentYearBday;
    }
    previousBday.setHours(0, 0, 0, 0);
    nextBday.setHours(0, 0, 0, 0);

    const currentAge = previousBday.getFullYear() - birthYear;
    const nextAge = currentAge + 1;

    // Total days in this 1-year age cycle
    const oneDayMs = 1000 * 60 * 60 * 24;
    const totalDaysInCycle = Math.round((nextBday - previousBday) / oneDayMs);
    const daysPassed = Math.floor((now - previousBday) / oneDayMs);
    const daysRemaining = Math.max(0, Math.ceil((nextBday - now) / oneDayMs));
    const progressPct = Math.min(100, Math.max(0, Math.round((daysPassed / totalDaysInCycle) * 100)));

    // Generate daily cells
    const cells = [];
    for (let i = 0; i < totalDaysInCycle; i++) {
      const cellDate = new Date(previousBday);
      cellDate.setDate(previousBday.getDate() + i);
      cellDate.setHours(0, 0, 0, 0);

      const isToday = cellDate.toDateString() === now.toDateString();
      const isPast = cellDate < now;
      const isFuture = cellDate > now;

      // Count tasks completed on this date
      const tasksOnDate = allTasks.filter((t) => {
        if (!t.due_date && !t.updated_at) return false;
        const taskDate = new Date(t.due_date || t.updated_at).toDateString();
        return taskDate === cellDate.toDateString();
      });

      cells.push({
        index: i + 1,
        date: cellDate,
        dateString: cellDate.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        isToday,
        isPast,
        isFuture,
        tasksCount: tasksOnDate.length,
        dayOfWeek: (cellDate.getDay() + 6) % 7, // 0 = Monday, 6 = Sunday
      });
    }

    // Organize cells into weekly columns (GitHub-style matrix: 7 rows x ~52 cols)
    const weeks = [];
    let currentWeek = [];

    // Pad first week if the starting day isn't Monday
    const firstDayOfWeek = cells[0]?.dayOfWeek || 0;
    for (let p = 0; p < firstDayOfWeek; p++) {
      currentWeek.push(null);
    }

    cells.forEach((cell) => {
      currentWeek.push(cell);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return {
      currentAge,
      nextAge,
      previousBday,
      nextBday,
      totalDaysInCycle,
      daysPassed,
      daysRemaining,
      progressPct,
      cells,
      weeks,
    };
  }, [effectiveBirthDate, allTasks]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 text-slate-100 relative">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Sub-Tab Switcher Bar                             */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-3">
          {/* Main Sub-menu Switcher Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('weekly')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
                activeSubTab === 'weekly'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>📅 Jadwal Mingguan</span>
            </button>

            <button
              onClick={() => setActiveSubTab('age_grid')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
                activeSubTab === 'age_grid'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/30 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>🟩 Kotak Usia (Level Up)</span>
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {activeSubTab === 'weekly' ? (
            <>
              {/* Project Filter */}
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hidden sm:block"
              >
                <option value="all">Semua Proyek ({boards.length})</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    Proyek: {b.name}
                  </option>
                ))}
              </select>

              {/* Quick Add Task Button */}
              <button
                onClick={() => handleOpenAddTaskForDate(new Date())}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Jadwal</span>
              </button>
            </>
          ) : (
            /* Kotak Usia Action: Edit Birth Date */
            <button
              onClick={() => setIsEditingBday(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all active:scale-95"
            >
              <Cake className="w-4 h-4 text-amber-400" />
              <span>Atur Tanggal Lahir</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 1: JADWAL MINGGUAN (Weekly View)                      */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'weekly' && (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Week Navigator & Metrics Header */}
          <div className="glass-card p-4 sm:p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Week Navigation */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Minggu Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-1 text-xs font-bold text-slate-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Minggu Ini
                </button>
                <button
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Minggu Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>{weekRangeLabel}</span>
                  {weekOffset === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Aktif
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Tinjau dan checklist target harian Anda sepanjang minggu ini.
                </p>
              </div>
            </div>

            {/* Week Summary Stats */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="px-3 py-2 rounded-2xl bg-slate-950 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Total Jadwal</span>
                <span className="text-sm font-extrabold text-white">{weeklyMetrics.total}</span>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[10px] text-emerald-300 block font-medium">Selesai</span>
                <span className="text-sm font-extrabold text-emerald-400">{weeklyMetrics.completed}</span>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                <span className="text-[10px] text-blue-300 block font-medium">Progres</span>
                <span className="text-sm font-extrabold text-blue-400">{weeklyMetrics.pct}%</span>
              </div>
            </div>
          </div>

          {/* 7 Days Columns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 items-start">
            {currentWeekDays.map((day) => {
              const dayTasks = weekTasksByDay[day.date.toDateString()] || [];

              return (
                <div
                  key={day.date.toISOString()}
                  className={`rounded-3xl p-3 sm:p-3.5 flex flex-col min-h-[380px] border transition-all ${
                    day.isToday
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/60 border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5">
                    <div>
                      <span
                        className={`text-xs font-bold block ${
                          day.isToday ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {day.dayName}
                      </span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-sm font-extrabold text-white">{day.dayNumber}</span>
                        <span className="text-[11px] text-slate-500">{day.monthName}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {day.isToday && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black uppercase tracking-wider">
                          Hari Ini
                        </span>
                      )}
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-400 font-mono">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tasks in this day */}
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[320px] pr-0.5">
                    {dayTasks.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center text-center p-3 border border-dashed border-white/5 rounded-2xl">
                        <p className="text-[11px] text-slate-600">Tidak ada jadwal</p>
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                        const isDone =
                          (task.column_name || '').toLowerCase().includes('selesai') ||
                          (task.column_name || '').toLowerCase().includes('done');

                        return (
                          <div
                            key={task.id}
                            className={`p-2.5 rounded-2xl border transition-all space-y-1.5 group ${
                              isDone
                                ? 'bg-slate-950/40 border-white/5 opacity-60'
                                : 'bg-slate-950/80 border-white/10 hover:border-emerald-500/30'
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              {/* 1-click Checkbox */}
                              <button
                                onClick={() => handleToggleTaskDone(task)}
                                className={`mt-0.5 shrink-0 transition-transform active:scale-90 ${
                                  isDone ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                                }`}
                                title={isDone ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 fill-emerald-500/20" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>

                              {/* Task Title & edit modal */}
                              <div
                                onClick={() => {
                                  setEditingTask(task);
                                  setIsTaskModalOpen(true);
                                }}
                                className="flex-1 cursor-pointer min-w-0"
                              >
                                <h4
                                  className={`text-xs font-medium leading-snug line-clamp-2 ${
                                    isDone ? 'line-through text-slate-500' : 'text-slate-200 hover:text-white'
                                  }`}
                                >
                                  {task.title}
                                </h4>
                              </div>
                            </div>

                            {/* Badges: Project tag & priority */}
                            <div className="flex items-center justify-between text-[9px] pt-1 border-t border-white/5">
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 font-medium truncate max-w-[80px]">
                                {task.board_name}
                              </span>
                              <span
                                className={`px-1 py-0.2 rounded font-semibold ${
                                  task.priority === 'high'
                                    ? 'text-rose-400'
                                    : task.priority === 'medium'
                                    ? 'text-amber-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {task.priority || 'medium'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Task for this Day button */}
                  <button
                    onClick={() => handleOpenAddTaskForDate(day.date)}
                    className="mt-2.5 w-full py-1.5 px-2 rounded-xl bg-white/5 hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 2: KOTAK USIA (GitHub Contribution Grid 365 Hari)    */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'age_grid' && ageGridCalculation && (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full animate-pop-in">
          {/* Hero Banner: Countdown Kotak Hari Menuju Umur Baru */}
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 glass-card border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-orange-500/10 shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Siklus 1 Tahun Menuju Level Up Umur</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  Tinggal{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                    {ageGridCalculation.daysRemaining} Kotak Hari
                  </span>{' '}
                  Menuju Umur {ageGridCalculation.nextAge}!
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                  Setiap kotak di bawah mewakili 1 hari perjalanan hidup Anda dalam rentang umur{' '}
                  <span className="font-bold text-amber-300">{ageGridCalculation.currentAge} tahun</span> menuju{' '}
                  <span className="font-bold text-orange-400">{ageGridCalculation.nextAge} tahun</span>. Rayakan tiap hari yang terlewati dengan produktivitas nyata.
                </p>
              </div>

              {/* Countdown Highlight Card */}
              <div className="flex items-center space-x-4 bg-slate-950/80 p-4 sm:p-5 rounded-3xl border border-amber-500/30 shadow-xl self-start md:self-auto shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex flex-col items-center justify-center font-black shadow-lg shadow-amber-500/20">
                  <span className="text-xl leading-none">{ageGridCalculation.daysRemaining}</span>
                  <span className="text-[9px] uppercase tracking-wider">Hari</span>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Target Ulang Tahun:</div>
                  <div className="text-sm font-bold text-white font-mono">
                    {ageGridCalculation.nextBday.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-[11px] text-amber-400 mt-0.5 font-semibold">
                    Level Up ke Umur {ageGridCalculation.nextAge} 🚀
                  </div>
                </div>
              </div>
            </div>

            {/* Background ambient lighting */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Gamified Level-Up Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">Level Umur Sekarang</span>
              <div className="text-2xl font-black text-white flex items-center space-x-2">
                <span>{ageGridCalculation.currentAge}</span>
                <span className="text-xs font-semibold text-slate-400">th</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Siklus berjalan</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">Target Level Berikutnya</span>
              <div className="text-2xl font-black text-orange-400 flex items-center space-x-2">
                <span>{ageGridCalculation.nextAge}</span>
                <span className="text-xs font-semibold text-orange-300/80">th</span>
              </div>
              <span className="text-[10px] text-amber-400/80 block font-medium">Level Up Umur</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">Kotak Hari Terlewati</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center space-x-2">
                <span>{ageGridCalculation.daysPassed}</span>
                <span className="text-xs font-semibold text-slate-400">/ {ageGridCalculation.totalDaysInCycle}</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Kotak terisi</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">Sisa Kotak Hari</span>
              <div className="text-2xl font-black text-amber-400 flex items-center space-x-2">
                <span>{ageGridCalculation.daysRemaining}</span>
                <span className="text-xs font-semibold text-amber-300">Kotak</span>
              </div>
              <span className="text-[10px] text-amber-500 block font-semibold">{ageGridCalculation.progressPct}% selesai</span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Progress XP Menuju Umur {ageGridCalculation.nextAge}:</span>
              </span>
              <span className="font-extrabold text-amber-400 font-mono">
                {ageGridCalculation.progressPct}% ({ageGridCalculation.daysPassed} / {ageGridCalculation.totalDaysInCycle} Hari)
              </span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-orange-500 transition-all duration-700 shadow-md shadow-amber-500/30"
                style={{ width: `${ageGridCalculation.progressPct}%` }}
              />
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* THE GITHUB CONTRIBUTION HEATMAP GRID (365 DAYS)           */}
          {/* --------------------------------------------------------- */}
          <div className="glass-card p-5 sm:p-7 rounded-3xl border border-white/10 space-y-4 shadow-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Grid 365 Kotak Hari: Umur {ageGridCalculation.currentAge} → {ageGridCalculation.nextAge}
                </h3>
              </div>

              {/* Legend */}
              <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                <span className="text-slate-500">Keterangan:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-slate-900 border border-white/10" />
                  <span>Sisa Kotak</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-emerald-600/70 border border-emerald-500/40" />
                  <span>Terlewati</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-amber-400 border border-amber-300 ring-2 ring-amber-400/40 animate-pulse" />
                  <span>Hari Ini</span>
                </div>
              </div>
            </div>

            {/* Interactive Tooltip Card on Hover */}
            {hoveredDayCell ? (
              <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs flex items-center justify-between text-slate-200 animate-pop-in">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white">{hoveredDayCell.dateString}</span>
                  <span>•</span>
                  <span className="text-slate-400">Hari ke-{hoveredDayCell.index} dari {ageGridCalculation.totalDaysInCycle}</span>
                </div>
                <div>
                  {hoveredDayCell.isToday ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                      ⭐ Hari Ini (Aktif)
                    </span>
                  ) : hoveredDayCell.isPast ? (
                    <span className="text-emerald-400 font-semibold">
                      ✓ Sudah Terlewati {hoveredDayCell.tasksCount > 0 ? `(${hoveredDayCell.tasksCount} tugas selesai)` : ''}
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold">
                      ⏳ Sisa {ageGridCalculation.daysRemaining - (hoveredDayCell.index - ageGridCalculation.daysPassed)} kotak hari lagi
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-white/5 text-xs text-slate-500 text-center">
                Arahkan kursor atau sentuh kotak untuk melihat rincian tanggal dan status sisa hari.
              </div>
            )}

            {/* Matrix Heatmap Container with smooth horizontal scroll */}
            <div className="overflow-x-auto pb-4 pt-1 no-scrollbar">
              <div className="inline-flex gap-1.5">
                {/* Day Labels along the left */}
                <div className="flex flex-col justify-between py-0.5 pr-2 text-[10px] text-slate-500 font-mono select-none">
                  <span>Sen</span>
                  <span>Sel</span>
                  <span>Rab</span>
                  <span>Kam</span>
                  <span>Jum</span>
                  <span>Sab</span>
                  <span>Min</span>
                </div>

                {/* Week Columns */}
                {ageGridCalculation.weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-1.5 shrink-0">
                    {week.map((cell, cIndex) => {
                      if (!cell) {
                        return (
                          <div
                            key={`empty-${wIndex}-${cIndex}`}
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md bg-transparent"
                          />
                        );
                      }

                      return (
                        <button
                          key={cell.date.toISOString()}
                          onMouseEnter={() => setHoveredDayCell(cell)}
                          onMouseLeave={() => setHoveredDayCell(null)}
                          onClick={() => setHoveredDayCell(cell)}
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md transition-all duration-200 relative ${
                            cell.isToday
                              ? 'bg-amber-400 border border-amber-300 ring-2 ring-amber-400/50 scale-125 z-20 shadow-md shadow-amber-400/40'
                              : cell.isPast
                              ? cell.tasksCount > 0
                                ? 'bg-emerald-400 border border-emerald-300 hover:scale-125 z-10'
                                : 'bg-emerald-600/80 border border-emerald-500/40 hover:bg-emerald-500 hover:scale-125 z-10'
                              : 'bg-slate-900/90 border border-white/10 hover:border-amber-400/50 hover:bg-slate-800'
                          }`}
                          title={`${cell.dateString}: ${cell.isToday ? 'Hari Ini' : cell.isPast ? 'Sudah Terlewati' : 'Belum Terlewati'}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Motivational Footer */}
            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <span className="flex items-center space-x-1.5 text-amber-300/80">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Jadikan setiap kotak hari penuh arti dan progres nyata!</span>
              </span>

              <div className="flex items-center space-x-2">
                <span>Tanggal Lahir Terdaftar:</span>
                <span className="font-bold text-white font-mono">{effectiveBirthDate}</span>
                <button
                  onClick={() => setIsEditingBday(true)}
                  className="text-amber-400 hover:underline text-xs"
                >
                  (Ubah)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: Atur Tanggal Lahir                                     */}
      {/* ------------------------------------------------------------- */}
      {isEditingBday && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBirthDate}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-pop-in text-slate-100"
          >
            <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Atur Tanggal Lahir</h3>
                <p className="text-xs text-slate-400">
                  Untuk menghitung siklus 1 tahun kotak-kotak GitHub menuju umur berikutnya.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Tanggal Lahir Anda:
              </label>
              <input
                type="date"
                value={birthDateInput}
                onChange={(e) => setBirthDateInput(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 space-y-1">
              <p>💡 <strong className="text-slate-200">Bagaimana sistem bekerja?</strong></p>
              <p>
                Sistem akan membuat 365 kotak hari dalam siklus umur berjalan Anda. Hari-hari yang sudah terlewati akan berwarna hijau, hari ini berkedip emas, dan sisa kotak akan menghitung mundur hari menuju ulang tahun berikutnya!
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditingBday(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                Simpan Tanggal Lahir
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Full Task Modal for Weekly Scheduling                         */}
      {/* ------------------------------------------------------------- */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask || (prefillDate ? { due_date: prefillDate } : null)}
        targetColumnId={prefillColId || allAvailableColumns[0]?.id}
        columns={allAvailableColumns}
      />
    </div>
  );
};
