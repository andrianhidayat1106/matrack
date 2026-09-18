import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CalendarDays,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Activity,
  Award
} from 'lucide-react';

export const UnifiedActivityStats = ({
  boards = [],
  customSchedules = [],
  notes = [],
  ageGridCalculation = null,
  currentWeekDays = [],
  onNavigate
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Timeframe: 'daily' | 'weekly'
  const [timeframe, setTimeframe] = useState('weekly');
  
  // Feature source filter: 'all' | 'jadwal' | 'proyek' | 'notes'
  const [sourceFilter, setSourceFilter] = useState('all');

  // Status filter: 'all' | 'completed' | 'pending'
  const [statusFilter, setStatusFilter] = useState('all');

  // Daily mode selected date (defaults to today ISO)
  const todayIso = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [selectedDailyDate, setSelectedDailyDate] = useState(todayIso);

  // Flatten all tasks from all boards
  const allTasks = useMemo(() => {
    const list = [];
    (boards || []).forEach((b) => {
      (b.columns || []).forEach((c) => {
        (c.tasks || []).forEach((t) => {
          const isDone =
            (c.name || '').toLowerCase().includes('selesai') ||
            (c.name || '').toLowerCase().includes('done');
          list.push({
            ...t,
            board_id: b.id,
            board_name: b.name,
            column_id: c.id,
            column_name: c.name,
            is_completed: isDone,
          });
        });
      });
    });
    return list;
  }, [boards]);

  // Determine active date range based on timeframe
  const activeDateSet = useMemo(() => {
    if (timeframe === 'daily') {
      return new Set([selectedDailyDate]);
    }
    // Weekly mode: all 7 days of current week
    return new Set(currentWeekDays.map((d) => d.isoDate));
  }, [timeframe, selectedDailyDate, currentWeekDays]);

  // Filtered Activities across all 3 primary features
  const activityItems = useMemo(() => {
    const items = [];

    // 1. JADWAL 24 JAM ACTIVITIES
    (customSchedules || []).forEach((s) => {
      if (!s.date || !activeDateSet.has(s.date)) return;

      // Calculate duration in hours
      let durationHours = 1;
      if (s.start_time && s.end_time) {
        const [sh, sm] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        const start = sh + (sm || 0) / 60;
        const end = eh + (em || 0) / 60;
        if (end > start) {
          durationHours = Math.round((end - start) * 10) / 10;
        }
      }

      const startTimeClean = (s.start_time || '00:00').substring(0, 5);
      const parsedTime = new Date(`${s.date}T${startTimeClean}:00`);
      const validTimestamp = isNaN(parsedTime.getTime()) ? new Date() : parsedTime;

      items.push({
        id: `sched-${s.id}`,
        rawId: s.id,
        feature: 'jadwal',
        featureName: 'Jadwal 24 Jam',
        featureColor: 'emerald',
        title: s.title || 'Aktivitas Jadwal',
        date: s.date,
        time: s.start_time ? `${s.start_time} - ${s.end_time || ''}` : 'Terjadwal',
        durationHours,
        is_completed: Boolean(s.is_completed),
        metadata: s.notes || (s.board_name ? `Proyek: ${s.board_name}` : 'Aktivitas'),
        timestamp: validTimestamp,
      });
    });

    // 2. PROYEK / KANBAN TASKS ACTIVITIES
    allTasks.forEach((t) => {
      const relevantDateStr = t.due_date || t.updated_at || t.created_at;
      if (!relevantDateStr) return;

      const d = new Date(relevantDateStr);
      if (isNaN(d.getTime())) return;
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!activeDateSet.has(iso)) return;

      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      items.push({
        id: `task-${t.id}`,
        rawId: t.id,
        feature: 'proyek',
        featureName: 'Tugas Proyek',
        featureColor: 'blue',
        title: t.title,
        date: iso,
        time: timeStr,
        durationHours: 1,
        is_completed: Boolean(t.is_completed),
        metadata: `${t.board_name} → ${t.column_name}`,
        board_id: t.board_id,
        timestamp: d,
      });
    });

    // 3. CATATAN / NOTES ACTIVITIES
    (notes || []).forEach((n) => {
      if (n.is_trash) return;
      const relevantDateStr = n.updated_at || n.created_at;
      if (!relevantDateStr) return;

      const d = new Date(relevantDateStr);
      if (isNaN(d.getTime())) return;
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!activeDateSet.has(iso)) return;

      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      items.push({
        id: `note-${n.id}`,
        rawId: n.id,
        feature: 'notes',
        featureName: 'Catatan',
        featureColor: 'amber',
        title: n.title || 'Catatan Tanpa Judul',
        date: iso,
        time: timeStr,
        durationHours: 0.5,
        is_completed: true,
        metadata: `Folder: ${n.folder || 'Notes'}`,
        timestamp: d,
      });
    });

    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp - a.timestamp);
    return items;
  }, [customSchedules, allTasks, notes, activeDateSet]);

  // Filtered by source & status
  const displayedActivities = useMemo(() => {
    return activityItems.filter((item) => {
      if (sourceFilter !== 'all' && item.feature !== sourceFilter) return false;
      if (statusFilter === 'completed' && !item.is_completed) return false;
      if (statusFilter === 'pending' && item.is_completed) return false;
      return true;
    });
  }, [activityItems, sourceFilter, statusFilter]);

  // Aggregate Metrics
  const statsMetrics = useMemo(() => {
    const totalItems = activityItems.length;
    const completedItems = activityItems.filter((i) => i.is_completed).length;
    const pendingItems = totalItems - completedItems;

    // Feature breakdown
    const jadwalItems = activityItems.filter((i) => i.feature === 'jadwal');
    const jadwalDone = jadwalItems.filter((i) => i.is_completed).length;
    const totalJadwalHours = jadwalItems.reduce((acc, i) => acc + (i.durationHours || 1), 0);
    const completedJadwalHours = jadwalItems
      .filter((i) => i.is_completed)
      .reduce((acc, i) => acc + (i.durationHours || 1), 0);

    const proyekItems = activityItems.filter((i) => i.feature === 'proyek');
    const proyekDone = proyekItems.filter((i) => i.is_completed).length;

    const notesItems = activityItems.filter((i) => i.feature === 'notes');

    // Activity Score (XP Calculation)
    const activityXP =
      proyekDone * 15 +
      Math.round(completedJadwalHours * 10) +
      notesItems.length * 10 +
      pendingItems * 3;

    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      completedItems,
      pendingItems,
      completionRate,
      activityXP,
      jadwalItemsCount: jadwalItems.length,
      jadwalDoneCount: jadwalDone,
      totalJadwalHours,
      completedJadwalHours,
      proyekItemsCount: proyekItems.length,
      proyekDoneCount: proyekDone,
      notesItemsCount: notesItems.length,
    };
  }, [activityItems]);

  // 7-Day breakdown for Weekly chart
  const weeklyDayBreakdown = useMemo(() => {
    return currentWeekDays.map((day) => {
      const dayActivities = activityItems.filter((i) => i.date === day.isoDate);
      const jadwalCount = dayActivities.filter((i) => i.feature === 'jadwal').length;
      const proyekCount = dayActivities.filter((i) => i.feature === 'proyek').length;
      const notesCount = dayActivities.filter((i) => i.feature === 'notes').length;
      const total = dayActivities.length;

      return {
        dayName: day.dayName,
        dayNumber: day.dayNumber,
        isoDate: day.isoDate,
        isToday: day.isToday,
        jadwalCount,
        proyekCount,
        notesCount,
        total,
      };
    });
  }, [currentWeekDays, activityItems]);

  const maxWeeklyCount = useMemo(() => {
    const maxVal = Math.max(...weeklyDayBreakdown.map((d) => d.total), 1);
    return maxVal;
  }, [weeklyDayBreakdown]);

  // Format date readable
  const formattedSelectedDailyDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDailyDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDailyDate;
    }
  }, [selectedDailyDate]);

  // Navigate Daily Date
  const handleShiftDailyDate = (deltaDays) => {
    const [y, m, d] = selectedDailyDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + deltaDays);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDailyDate(`${newY}-${newM}-${newD}`);
  };

  return (
    <section className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/70 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-blue-500/20 shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                Statistik Keaktifan Terpadu
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/30 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Semua Fitur Terhubung</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
              Analisis terintegrasi dari Jadwal 24 Jam, Tugas Proyek Kanban, Catatan, dan Kotak Usia.
            </p>
          </div>
        </div>

        {/* Controls: Timeframe switch, date picker & expand toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe switch */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setTimeframe('daily')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                timeframe === 'daily'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Per Hari
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                timeframe === 'weekly'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Per Minggu
            </button>
          </div>

          {/* Daily Date Controller */}
          {timeframe === 'daily' && (
            <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-xl border border-white/10 text-xs text-slate-300">
              <button
                onClick={() => handleShiftDailyDate(-1)}
                className="p-1 hover:text-white rounded hover:bg-white/10"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={selectedDailyDate}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              />
              <button
                onClick={() => handleShiftDailyDate(1)}
                className="p-1 hover:text-white rounded hover:bg-white/10"
                title="Hari Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {selectedDailyDate !== todayIso && (
                <button
                  onClick={() => setSelectedDailyDate(todayIso)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold hover:bg-cyan-500/30"
                >
                  Hari Ini
                </button>
              )}
            </div>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? 'Ciutkan Statistik' : 'Buka Statistik'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6 animate-pop-in">
          {/* Active Period Label */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-200">
                Periode:{' '}
                {timeframe === 'daily'
                  ? formattedSelectedDailyDate
                  : `Minggu Ini (${currentWeekDays[0]?.monthName || ''} ${currentWeekDays[0]?.dayNumber} - ${currentWeekDays[6]?.monthName || ''} ${currentWeekDays[6]?.dayNumber})`}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Jadwal</span>
              </span>
              <span className="flex items-center space-x-1 text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Tugas Proyek</span>
              </span>
              <span className="flex items-center space-x-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Catatan</span>
              </span>
            </div>
          </div>

          {/* SECTION A: KEY METRIC CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Skor Keaktifan (XP) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-cyan-300 font-semibold flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Skor Keaktifan</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  +{statsMetrics.activityXP} XP
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-white">{statsMetrics.activityXP}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Tingkat Penyelesaian: <span className="text-cyan-400 font-bold">{statsMetrics.completionRate}%</span>
                </div>
              </div>
            </div>

            {/* 2. Jadwal 24 Jam */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-emerald-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-300 font-semibold flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Jadwal & Jam Fokus</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {statsMetrics.jadwalDoneCount}/{statsMetrics.jadwalItemsCount} Selesai
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-white">
                  {statsMetrics.completedJadwalHours}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    / {statsMetrics.totalJadwalHours} Jam
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        statsMetrics.totalJadwalHours > 0
                          ? Math.round((statsMetrics.completedJadwalHours / statsMetrics.totalJadwalHours) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Tugas Proyek (Kanban) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-blue-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-blue-300 font-semibold flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tugas Proyek</span>
                </span>
                <span className="text-[10px] text-blue-400 font-mono font-bold">
                  {statsMetrics.proyekDoneCount}/{statsMetrics.proyekItemsCount} Selesai
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-white">
                  {statsMetrics.proyekDoneCount}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    / {statsMetrics.proyekItemsCount} Task
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        statsMetrics.proyekItemsCount > 0
                          ? Math.round((statsMetrics.proyekDoneCount / statsMetrics.proyekItemsCount) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Catatan & Ide */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-300 font-semibold flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Catatan Aktif</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  {notes.length} Total
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-white">
                  {statsMetrics.notesItemsCount}{' '}
                  <span className="text-xs font-normal text-slate-400">diperbarui</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {ageGridCalculation
                    ? `Level ${ageGridCalculation.currentAge} th • Sisa ${ageGridCalculation.daysRemaining} hari`
                    : 'Tersambung ke Kotak Usia'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: WEEKLY VISUAL BAR CHART */}
          {timeframe === 'weekly' && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">
                  Aktivitas 7 Hari Mingguan (Distribusi Lintas Fitur)
                </span>
                <span className="text-[10px] text-slate-500">
                  Klik hari untuk melihat jadwal hari tersebut
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-2">
                {weeklyDayBreakdown.map((d) => {
                  const heightPct = maxWeeklyCount > 0 ? Math.round((d.total / maxWeeklyCount) * 100) : 0;
                  const clampedHeight = Math.max(heightPct, d.total > 0 ? 15 : 4);

                  return (
                    <div
                      key={d.isoDate}
                      onClick={() => {
                        setSelectedDailyDate(d.isoDate);
                        setTimeframe('daily');
                      }}
                      className={`flex flex-col items-center cursor-pointer group p-2 rounded-xl transition-all ${
                        d.isToday ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-white/5'
                      }`}
                      title={`${d.dayName}, ${d.dayNumber}: ${d.total} total aktivitas (${d.jadwalCount} Jadwal, ${d.proyekCount} Proyek, ${d.notesCount} Catatan)`}
                    >
                      {/* Bar Container */}
                      <div className="h-24 w-full flex items-end justify-center bg-slate-900/60 rounded-lg p-1 relative overflow-hidden">
                        <div
                          className="w-full rounded-md transition-all duration-500 flex flex-col justify-end overflow-hidden"
                          style={{ height: `${clampedHeight}%` }}
                        >
                          {/* Segment Jadwal */}
                          {d.jadwalCount > 0 && (
                            <div
                              className="w-full bg-emerald-500/80 hover:bg-emerald-400 transition-colors"
                              style={{ height: `${(d.jadwalCount / (d.total || 1)) * 100}%` }}
                            />
                          )}
                          {/* Segment Proyek */}
                          {d.proyekCount > 0 && (
                            <div
                              className="w-full bg-blue-500/80 hover:bg-blue-400 transition-colors"
                              style={{ height: `${(d.proyekCount / (d.total || 1)) * 100}%` }}
                            />
                          )}
                          {/* Segment Catatan */}
                          {d.notesCount > 0 && (
                            <div
                              className="w-full bg-amber-500/80 hover:bg-amber-400 transition-colors"
                              style={{ height: `${(d.notesCount / (d.total || 1)) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Day Label */}
                      <div className="mt-2 text-center">
                        <div
                          className={`text-[11px] font-bold ${
                            d.isToday ? 'text-cyan-300' : 'text-slate-300 group-hover:text-white'
                          }`}
                        >
                          {d.dayName.slice(0, 3)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {d.total > 0 ? `${d.total} item` : '-'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION C: FILTERABLE ACTIVITY FEED */}
          <div className="space-y-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-slate-400 mr-1 flex items-center space-x-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter Fitur:</span>
                </span>

                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    sourceFilter === 'all'
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({activityItems.length})
                </button>

                <button
                  onClick={() => setSourceFilter('jadwal')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all ${
                    sourceFilter === 'jadwal'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Jadwal ({statsMetrics.jadwalItemsCount})</span>
                </button>

                <button
                  onClick={() => setSourceFilter('proyek')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all ${
                    sourceFilter === 'proyek'
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Proyek ({statsMetrics.proyekItemsCount})</span>
                </button>

                <button
                  onClick={() => setSourceFilter('notes')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all ${
                    sourceFilter === 'notes'
                      ? 'bg-amber-600 text-white font-bold shadow-sm'
                      : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Catatan ({statsMetrics.notesItemsCount})</span>
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] ${
                    statusFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  Selesai
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>

            {/* List of Activities */}
            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {displayedActivities.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/40 border border-white/5 text-center text-xs text-slate-500">
                  Tidak ada aktivitas ditemukan pada filter periode ini.
                </div>
              ) : (
                displayedActivities.map((act) => {
                  const badgeColorClass =
                    act.feature === 'jadwal'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : act.feature === 'proyek'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                  return (
                    <div
                      key={act.id}
                      className="p-2.5 sm:p-3 rounded-2xl bg-slate-950/70 border border-white/5 hover:border-white/15 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        {/* Status Icon */}
                        {act.is_completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white truncate">
                              {act.title}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold border ${badgeColorClass} shrink-0`}
                            >
                              {act.featureName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-400">
                            <span>{act.date}</span>
                            <span>•</span>
                            <span>{act.time}</span>
                            {act.metadata && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[150px] sm:max-w-[250px]">
                                  {act.metadata}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Direct Link button */}
                      {onNavigate && (
                        <button
                          onClick={() => {
                            if (act.feature === 'proyek') onNavigate('schedule');
                            else if (act.feature === 'notes') onNavigate('notes');
                          }}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
                          title="Buka Fitur Terkait"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
