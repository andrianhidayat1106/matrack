import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Flame, 
  Sparkles, 
  Cake, 
  CalendarDays, 
  Clock, 
  Layers, 
  Trash2, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getBoards, 
  createTask, 
  updateTask, 
  moveTask, 
  deleteTask,
  getCustomSchedules,
  saveCustomSchedule,
  deleteCustomSchedule,
  getNotes
} from '../../services/db';
import { TaskModal } from '../kanban/TaskModal';
import { UnifiedActivityStats } from './UnifiedActivityStats';

// 24 Hour Slots Helper
const HOURS_24 = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return `${h}:00`;
});

// Category Colors for "By Nama Aja"
const SCHEDULE_COLORS = [
  { id: 'emerald', name: 'Hijau (Pribadi/Kesehatan)', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  { id: 'amber', name: 'Kuning (Santai/Istirahat)', bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300', dot: 'bg-amber-400' },
  { id: 'blue', name: 'Biru (Kerja/Fokus)', bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300', dot: 'bg-blue-400' },
  { id: 'purple', name: 'Ungu (Belajar/Skill)', bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-300', dot: 'bg-purple-400' },
  { id: 'rose', name: 'Merah (Urgent/Penting)', bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-300', dot: 'bg-rose-400' },
];

export const JadwalView = ({ onNavigate }) => {
  const { user, updateProfile, refreshUserStats } = useAuth();

  // Collapsible toggle for Kotak Usia
  const [isAgeGridExpanded, setIsAgeGridExpanded] = useState(true);

  // Boards, tasks & notes state (cached for zero-lag instant display)
  const [boards, setBoards] = useState(() => {
    try {
      const saved = localStorage.getItem(`matrack_boards_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customSchedules, setCustomSchedules] = useState(() => {
    try {
      const saved = localStorage.getItem(`matrack_custom_schedules_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(`matrack_notes_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');

  // Active Day for Mobile View
  const [mobileSelectedDayIndex, setMobileSelectedDayIndex] = useState(null);

  // Weekly view state: week offset (0 = current week, -1 = previous, +1 = next)
  const [weekOffset, setWeekOffset] = useState(0);

  // Time segment filter: 'all', 'morning', 'afternoon', 'evening', 'night'
  const [timeSegmentFilter, setTimeSegmentFilter] = useState('all');

  // Task Modal state (for deep editing project tasks)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Birth date setting modal & state
  const [birthDateInput, setBirthDateInput] = useState(
    user?.birth_date || localStorage.getItem(`matrack_bday_${user?.id}`) || '2000-01-01'
  );
  const [isEditingBday, setIsEditingBday] = useState(false);
  const [hoveredDayCell, setHoveredDayCell] = useState(null);

  // -------------------------------------------------------------------------
  // 2-CHOICE ADD SCHEDULE MODAL ("By Nama Aja" vs "Tugas")
  // -------------------------------------------------------------------------
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
  const [scheduleChoiceType, setScheduleChoiceType] = useState('nama'); // 'nama' | 'tugas'

  // Form Fields
  const [customTitle, setCustomTitle] = useState('');
  const [customColor, setCustomColor] = useState('emerald');
  const [customNotes, setCustomNotes] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('08:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('09:00');

  // Selected Project & Task for 'tugas' choice
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [newQuickTaskTitle, setNewQuickTaskTitle] = useState('');

  // -------------------------------------------------------------------------
  // EDIT SCHEDULE MODAL STATE
  // -------------------------------------------------------------------------
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('emerald');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('08:00');
  const [editEndTime, setEditEndTime] = useState('09:00');

  // -------------------------------------------------------------------------
  // DRAG TO RESIZE & DRAG TO MOVE STATE
  // -------------------------------------------------------------------------
  const [dragState, setDragState] = useState(null);
  const justDraggedRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const nowDecimal = useMemo(() => {
    return currentTime.getHours() + currentTime.getMinutes() / 60;
  }, [currentTime]);

  // Load Boards, Custom Schedules and Notes
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [boardsData, schedulesData, notesData] = await Promise.all([
        getBoards(user.id),
        getCustomSchedules(user.id),
        getNotes(user.id),
      ]);
      setBoards(boardsData || []);
      setCustomSchedules(schedulesData || []);
      setNotes(notesData?.notes || []);
    } catch (err) {
      console.error('Failed to load schedule data', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Window listeners for Drag-to-Resize duration & Drag-to-Move
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e) => {
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientY === undefined) return;

      const deltaY = clientY - dragState.startY;
      // 64px = 1 hour, snap to 0.5 hour (30 mins)
      const rawDeltaHours = deltaY / 64;
      const snappedDeltaHours = Math.round(rawDeltaHours * 2) / 2;

      if (dragState.type === 'resize') {
        const newEndDecimal = Math.min(
          24,
          Math.max(dragState.initialStartDecimal + 0.5, dragState.initialEndDecimal + snappedDeltaHours)
        );
        setDragState((prev) => (prev ? { ...prev, currentEndDecimal: newEndDecimal } : null));
      } else if (dragState.type === 'move') {
        const duration = dragState.initialEndDecimal - dragState.initialStartDecimal;
        const newStartDecimal = Math.max(
          0,
          Math.min(24 - duration, dragState.initialStartDecimal + snappedDeltaHours)
        );
        const newEndDecimal = newStartDecimal + duration;
        setDragState((prev) =>
          prev ? { ...prev, currentStartDecimal: newStartDecimal, currentEndDecimal: newEndDecimal } : null
        );
      }
    };

    const handlePointerUp = async () => {
      if (!dragState || !user?.id) {
        setDragState(null);
        return;
      }

      const item = dragState.item;
      const startDec = dragState.currentStartDecimal;
      const endDec = dragState.currentEndDecimal;

      const hasChanged =
        startDec !== dragState.initialStartDecimal || endDec !== dragState.initialEndDecimal;

      if (hasChanged) {
        const formatHourMinute = (dec) => {
          const h = Math.floor(dec);
          const m = Math.round((dec - h) * 60);
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const newStartTime = formatHourMinute(startDec);
        const newEndTime = formatHourMinute(endDec);

        const updatedItem = {
          ...item.raw,
          start_time: newStartTime,
          end_time: newEndTime,
        };

        saveCustomSchedule(user.id, updatedItem);

        const taskId = item.taskId || item.raw?.task_id;
        if (taskId && item.raw?.date) {
          const [h, m] = newStartTime.split(':').map(Number);
          const [year, month, day] = item.raw.date.split('-');
          const dueDateTime = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), h, m);
          await updateTask(taskId, {
            due_date: dueDateTime.toISOString(),
          });
        }

        await loadData();
        refreshUserStats(user.id);
      }

      setDragState(null);
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 50);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragState, user?.id, loadData, refreshUserStats]);

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

      // Count tasks or activities on this date
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

    // Pad first week if starting day is not Monday
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

  /* ========================================================================
     WEEKLY 24-HOUR VIEW LOGIC
     ======================================================================== */
  const currentWeekDays = useMemo(() => {
    const today = new Date();
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

      // Format ISO string YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${dayStr}`;

      days.push({
        date: d,
        isoDate,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString('id-ID', { month: 'short' }),
        isToday,
      });
    }

    return days;
  }, [weekOffset]);

  // Default mobile selected day to Today's day index
  useEffect(() => {
    if (mobileSelectedDayIndex === null) {
      const todayIndex = currentWeekDays.findIndex((d) => d.isToday);
      setMobileSelectedDayIndex(todayIndex >= 0 ? todayIndex : 0);
    }
  }, [currentWeekDays, mobileSelectedDayIndex]);

  const weekRangeLabel = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const start = currentWeekDays[0].date;
    const end = currentWeekDays[6].date;
    return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [currentWeekDays]);

  // Filtered Hours according to time segment
  const displayedHours = useMemo(() => {
    switch (timeSegmentFilter) {
      case 'subuh':
        return HOURS_24.slice(0, 6); // 00:00 - 05:00
      case 'morning':
        return HOURS_24.slice(6, 12); // 06:00 - 11:00
      case 'afternoon':
        return HOURS_24.slice(12, 18); // 12:00 - 17:00
      case 'evening':
        return HOURS_24.slice(18, 24); // 18:00 - 23:00
      default:
        return HOURS_24; // 00:00 - 23:00 (Full 24h)
    }
  }, [timeSegmentFilter]);

  const segmentStartHour = useMemo(() => {
    return displayedHours?.length > 0 ? parseInt(displayedHours[0].split(':')[0], 10) : 0;
  }, [displayedHours]);

  const segmentEndHour = useMemo(() => {
    return displayedHours?.length > 0 ? parseInt(displayedHours[displayedHours.length - 1].split(':')[0], 10) + 1 : 24;
  }, [displayedHours]);

  // Combine Tasks & Custom Schedules into Continuous Multi-Hour Spanning Events
  // Calculates top, height, widthPct, and leftPct for side-by-side overlapping multi-tasks
  const positionedEventsByDay = useMemo(() => {
    const HOUR_HEIGHT = 64;

    // Helper to convert time string "08:30" or "08:00" to decimal hour
    const toDecimal = (tStr, defaultVal = 9.0) => {
      if (!tStr) return defaultVal;
      const [h, m] = tStr.split(':').map(Number);
      return (h || 0) + (m || 0) / 60;
    };

    const formatHourMinute = (dec) => {
      const h = Math.floor(dec);
      const m = Math.round((dec - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Prepare day map for the current week
    const dayMap = {};
    currentWeekDays.forEach((d) => {
      dayMap[d.isoDate] = [];
    });

    const processedTaskIds = new Set();

    // 1. Process Custom Schedules
    (customSchedules || []).forEach((sched) => {
      if (!sched.date || !dayMap[sched.date]) return;
      if (sched.task_id) {
        processedTaskIds.add(String(sched.task_id));
      }

      let sDec = toDecimal(sched.start_time, 9.0);
      let eDec = toDecimal(sched.end_time, sDec + 1.0);

      // Account for live drag preview if this item is being resized or moved
      if (dragState && String(dragState.item.id) === String(sched.id)) {
        sDec = dragState.currentStartDecimal;
        eDec = dragState.currentEndDecimal;
      }

      if (eDec <= sDec) {
        eDec = sDec + 0.5;
      }
      const rawDurationHours = Math.round((eDec - sDec) * 10) / 10;

      dayMap[sched.date].push({
        id: sched.id,
        taskId: sched.task_id,
        title: sched.title,
        type: sched.type || 'custom',
        start_time: formatHourMinute(sDec),
        end_time: formatHourMinute(eDec),
        color: sched.color || (sched.type === 'task' ? 'blue' : 'emerald'),
        notes: sched.notes,
        board_name: sched.board_name,
        board_id: sched.board_id,
        is_completed: Boolean(sched.is_completed),
        raw: sched,
        startDecimal: sDec,
        endDecimal: eDec,
        rawDurationHours,
      });
    });

    // 2. Process Project Tasks with due_date
    (allTasks || []).forEach((task) => {
      if (processedTaskIds.has(String(task.id))) return;
      if (selectedProjectFilter !== 'all' && String(task.board_id) !== String(selectedProjectFilter)) {
        return;
      }

      if (task.due_date) {
        const tDate = new Date(task.due_date);
        if (!isNaN(tDate.getTime())) {
          const year = tDate.getFullYear();
          const month = String(tDate.getMonth() + 1).padStart(2, '0');
          const dayStr = String(tDate.getDate()).padStart(2, '0');
          const isoDate = `${year}-${month}-${dayStr}`;

          if (dayMap[isoDate]) {
            const h = tDate.getHours();
            const m = tDate.getMinutes();
            let sDec = h + m / 60;
            let eDec = sDec + 1.0;

            if (dragState && String(dragState.item.id) === String(task.id)) {
              sDec = dragState.currentStartDecimal;
              eDec = dragState.currentEndDecimal;
            }

            if (eDec <= sDec) {
              eDec = sDec + 0.5;
            }
            const rawDurationHours = Math.round((eDec - sDec) * 10) / 10;

            const isDone =
              (task.column_name || '').toLowerCase().includes('selesai') ||
              (task.column_name || '').toLowerCase().includes('done');

            dayMap[isoDate].push({
              id: task.id,
              taskId: task.id,
              title: task.title,
              type: 'task',
              start_time: formatHourMinute(sDec),
              end_time: formatHourMinute(eDec),
              color: 'blue',
              board_name: task.board_name,
              board_id: task.board_id,
              priority: task.priority,
              is_completed: isDone,
              raw: task,
              startDecimal: sDec,
              endDecimal: eDec,
              rawDurationHours,
            });
          }
        }
      }
    });

    // For each day, calculate continuous position and cluster collisions
    const resultMap = {};

    Object.keys(dayMap).forEach((isoDate) => {
      const rawEvents = dayMap[isoDate];

      // Filter events visible within current time segment
      const visibleEvents = rawEvents
        .filter((ev) => ev.endDecimal > segmentStartHour && ev.startDecimal < segmentEndHour)
        .map((ev) => {
          const effectiveStart = Math.max(segmentStartHour, ev.startDecimal);
          const effectiveEnd = Math.min(segmentEndHour, ev.endDecimal);
          const duration = Math.max(0.5, effectiveEnd - effectiveStart);
          return {
            ...ev,
            effectiveStart,
            effectiveEnd,
            duration,
          };
        });

      // Sort by effectiveStart asc, then duration desc
      visibleEvents.sort((a, b) => {
        if (a.effectiveStart !== b.effectiveStart) {
          return a.effectiveStart - b.effectiveStart;
        }
        return b.duration - a.duration;
      });

      // Cluster overlapping events
      const clusters = [];
      let currentCluster = [];
      let clusterEnd = -1;

      visibleEvents.forEach((ev) => {
        if (currentCluster.length === 0) {
          currentCluster.push(ev);
          clusterEnd = ev.effectiveEnd;
        } else if (ev.effectiveStart < clusterEnd) {
          currentCluster.push(ev);
          clusterEnd = Math.max(clusterEnd, ev.effectiveEnd);
        } else {
          clusters.push(currentCluster);
          currentCluster = [ev];
          clusterEnd = ev.effectiveEnd;
        }
      });
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      // Assign horizontal slots per cluster
      const positioned = [];

      clusters.forEach((cluster) => {
        const colEnds = [];
        const clusterAssignments = [];

        cluster.forEach((ev) => {
          let colIdx = colEnds.findIndex((end) => end <= ev.effectiveStart);
          if (colIdx === -1) {
            colIdx = colEnds.length;
            colEnds.push(ev.effectiveEnd);
          } else {
            colEnds[colIdx] = ev.effectiveEnd;
          }
          clusterAssignments.push({ ev, colIdx });
        });

        const totalCols = Math.max(colEnds.length, 1);

        clusterAssignments.forEach(({ ev, colIdx }) => {
          const top = (ev.effectiveStart - segmentStartHour) * HOUR_HEIGHT;
          const height = Math.max(34, ev.duration * HOUR_HEIGHT);
          const widthPct = 100 / totalCols;
          const leftPct = colIdx * widthPct;

          positioned.push({
            ...ev,
            top,
            height,
            widthPct,
            leftPct,
            colIdx,
            totalCols,
          });
        });
      });

      resultMap[isoDate] = positioned;
    });

    return resultMap;
  }, [segmentStartHour, segmentEndHour, currentWeekDays, customSchedules, allTasks, selectedProjectFilter, dragState]);

  // Open the 2-choice Add Modal prefilled for a given day and hour
  const handleOpenAddModal = (isoDate = null, hourStr = null) => {
    const defaultDate = currentWeekDays.find((d) => d.isToday)?.isoDate || currentWeekDays[0]?.isoDate;
    setScheduleDate(isoDate || defaultDate);
    
    const currentHour = `${String(new Date().getHours()).padStart(2, '0')}:00`;
    const startHour = hourStr || currentHour;
    setScheduleStartTime(startHour);

    // Compute end hour (1 hour later)
    const hourNum = parseInt(startHour.split(':')[0], 10);
    const nextHourNum = (hourNum + 1) % 24;
    setScheduleEndTime(`${String(nextHourNum).padStart(2, '0')}:00`);

    setCustomTitle('');
    setCustomNotes('');
    setCustomColor('emerald');

    // Default to first board if available
    if (boards.length > 0) {
      setSelectedBoardId(boards[0].id);
      const firstTask = boards[0].columns?.flatMap((c) => c.tasks || [])?.[0];
      setSelectedTaskId(firstTask ? firstTask.id : '');
    } else {
      setSelectedBoardId('');
      setSelectedTaskId('');
    }

    setScheduleChoiceType('nama');
    setIsAddScheduleModalOpen(true);
  };

  // Open Edit Schedule Modal when clicking a container
  const handleOpenEditScheduleModal = (item) => {
    setEditingScheduleItem(item);
    setEditTitle(item.title || '');
    setEditColor(item.color || 'emerald');
    setEditNotes(item.notes || item.raw?.notes || '');
    setEditDate(item.raw?.date || item.date || currentWeekDays[0]?.isoDate);
    setEditStartTime(item.start_time || '08:00');
    setEditEndTime(item.end_time || '09:00');
    setIsEditScheduleModalOpen(true);
  };

  // Save changes from Edit Schedule Modal
  const handleSaveEditSchedule = async (e) => {
    if (e) e.preventDefault();
    if (!user?.id || !editingScheduleItem) return;

    const updatedItem = {
      ...editingScheduleItem.raw,
      title: editTitle.trim() || editingScheduleItem.title,
      date: editDate,
      start_time: editStartTime,
      end_time: editEndTime,
      color: editColor,
      notes: editNotes.trim(),
    };

    saveCustomSchedule(user.id, updatedItem);

    const taskId = editingScheduleItem.taskId || editingScheduleItem.raw?.task_id;
    if (taskId) {
      const [h, m] = (editStartTime || '09:00').split(':');
      const [year, month, day] = editDate.split('-');
      const dueDateTime = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(h, 10), parseInt(m, 10));
      await updateTask(taskId, {
        title: editTitle.trim(),
        due_date: dueDateTime.toISOString(),
      });
    }

    await loadData();
    refreshUserStats(user?.id);
    setIsEditScheduleModalOpen(false);
    setEditingScheduleItem(null);
  };

  // Delete item directly from Edit Schedule Modal
  const handleDeleteFromEditModal = async () => {
    if (!editingScheduleItem) return;
    await handleDeleteScheduleItem(editingScheduleItem);
    setIsEditScheduleModalOpen(false);
    setEditingScheduleItem(null);
  };

  // Drag-to-Resize Start Handler (Pulls the bottom of the card)
  const handleStartResize = (item, day, e) => {
    e.stopPropagation();
    e.preventDefault();
    justDraggedRef.current = true;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientY === undefined) return;

    setDragState({
      type: 'resize',
      item,
      startY: clientY,
      initialStartDecimal: item.startDecimal,
      initialEndDecimal: item.endDecimal,
      currentStartDecimal: item.startDecimal,
      currentEndDecimal: item.endDecimal,
      dayDate: day.isoDate,
    });
  };

  // Drag-to-Move Start Handler (Drags the card up/down)
  const handleStartMove = (item, day, e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('input')) return;

    const startY = e.clientY ?? e.touches?.[0]?.clientY;
    if (startY === undefined) return;

    let hasStarted = false;

    const onMove = (moveEv) => {
      const currentY = moveEv.clientY ?? moveEv.touches?.[0]?.clientY;
      if (currentY === undefined) return;

      if (!hasStarted && Math.abs(currentY - startY) > 8) {
        hasStarted = true;
        justDraggedRef.current = true;
        setDragState({
          type: 'move',
          item,
          startY,
          initialStartDecimal: item.startDecimal,
          initialEndDecimal: item.endDecimal,
          currentStartDecimal: item.startDecimal,
          currentEndDecimal: item.endDecimal,
          dayDate: day.isoDate,
        });
      }
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  // Render individual event card (spans full duration, side-by-side if overlapping)
  const renderEventCard = (item, day) => {
    const isCustom = item.type === 'custom';
    const colorObj =
      SCHEDULE_COLORS.find((c) => c.id === item.color) || SCHEDULE_COLORS[0];
    const isNarrow = (item.totalCols || 1) >= 3;
    const isTallCard = isNarrow ? item.height >= 120 : item.height >= 90;
    const isBeingDragged = dragState && String(dragState.item.id) === String(item.id);

    return (
      <div
        key={item.id}
        title={`${item.title} (${item.start_time} - ${item.end_time || ''})`}
        style={{
          position: 'absolute',
          top: `${item.top}px`,
          height: `${item.height}px`,
          left: `${item.leftPct}%`,
          width: `calc(${item.widthPct}% - 4px)`,
          zIndex: isBeingDragged ? 40 : 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (justDraggedRef.current) {
            justDraggedRef.current = false;
            return;
          }
          handleOpenEditScheduleModal(item);
        }}
        className={`pointer-events-auto rounded-2xl border transition-all shadow-md group/item overflow-hidden flex flex-col justify-between cursor-pointer select-none relative ${
          isNarrow ? 'p-1.5' : 'p-2'
        } ${
          isBeingDragged
            ? 'ring-2 ring-emerald-400 shadow-2xl scale-[1.01] bg-slate-900 border-emerald-400'
            : item.is_completed
            ? 'bg-slate-900/80 border-white/10 opacity-55'
            : isCustom
            ? `${colorObj.bg} ${colorObj.border} ${colorObj.text} backdrop-blur-md hover:border-white/30`
            : 'bg-blue-600/25 border-blue-500/40 text-blue-100 backdrop-blur-md hover:border-blue-400'
        }`}
      >
        {/* Floating Quick Actions on Hover (Absolute so they NEVER squeeze or crowd the task title) */}
        <div className="absolute top-1 right-1 z-30 flex items-center space-x-0.5 bg-slate-950/90 backdrop-blur-md rounded-lg p-0.5 border border-white/15 opacity-0 group-hover/item:opacity-100 transition-opacity shadow-lg">
          {/* Quick add another task at the same hour */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAddModal(day.isoDate, item.start_time);
            }}
            className="p-1 rounded-md hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-colors"
            title="Tambah task lain di jam yang sama"
          >
            <Plus className="w-3 h-3" />
          </button>

          {/* Route to Proyek Button (if task) */}
          {item.type === 'task' && onNavigate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('schedule');
              }}
              className="p-1 rounded-md hover:bg-blue-500/20 text-blue-300 hover:text-white transition-colors"
              title="Buka Halaman Proyek di Kanban"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {/* Delete Item Button */}
          <button
            onClick={(e) => handleDeleteScheduleItem(item, e)}
            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Hapus Jadwal"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Top Header Section: Drag handle + Title Priority + Checkbox */}
        <div
          onMouseDown={(e) => handleStartMove(item, day, e)}
          onTouchStart={(e) => handleStartMove(item, day, e)}
          className="cursor-grab active:cursor-grabbing min-w-0 flex-1 flex flex-col"
        >
          <div className="flex items-start gap-1 sm:gap-1.5 min-w-0">
            {/* Toggle Checkbox */}
            <button
              onClick={(e) => handleToggleDone(item, e)}
              className={`mt-0.5 shrink-0 transition-transform active:scale-90 ${
                item.is_completed
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
              title={item.is_completed ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
            >
              {item.is_completed ? (
                <CheckCircle2 className={`${isNarrow ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill-emerald-500/20`} />
              ) : (
                <Circle className={`${isNarrow ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              )}
            </button>

            {/* Prioritized Task Title Container */}
            <div className="min-w-0 flex-1">
              <h4
                className={`font-bold leading-tight break-words ${
                  isNarrow ? 'text-[11px] line-clamp-3' : 'text-xs leading-snug line-clamp-2'
                } ${item.is_completed ? 'line-through text-slate-500' : 'text-white'}`}
              >
                {item.title}
              </h4>

              {/* Time & Duration badge - subtle under title */}
              <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[9px] sm:text-[10px] text-slate-300 font-mono">
                <span className="font-semibold text-emerald-300 truncate">
                  {isNarrow ? item.start_time : `${item.start_time} - ${item.end_time || ''}`}
                </span>
                {!isNarrow && item.rawDurationHours > 1 && (
                  <span className="px-1 py-0.2 rounded bg-white/10 text-[9px] text-slate-300 shrink-0">
                    {item.rawDurationHours} Jam
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tall Card Extended Content (Notes / Board Name) */}
        {isTallCard && (
          <div className="mt-1 pb-2 text-[10px] sm:text-[11px] space-y-0.5">
            {item.board_name && (
              <div className="flex items-center space-x-1 text-blue-300 truncate">
                <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                <span className="truncate font-medium">{item.board_name}</span>
              </div>
            )}
            {item.notes && (
              <p className="text-slate-300 text-[9px] sm:text-[10px] line-clamp-1 italic bg-black/20 px-1 py-0.5 rounded">
                "{item.notes}"
              </p>
            )}
          </div>
        )}

        {/* Live Resizing Tooltip while dragging */}
        {isBeingDragged && dragState?.type === 'resize' && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[10px] font-black shadow-lg pointer-events-none z-30 whitespace-nowrap">
            Sampai {item.end_time} ({item.rawDurationHours} Jam)
          </div>
        )}

        {/* Interactive Bottom Drag-to-Resize Handle */}
        <div
          onMouseDown={(e) => handleStartResize(item, day, e)}
          onTouchStart={(e) => handleStartResize(item, day, e)}
          className="absolute bottom-0 inset-x-0 h-3.5 cursor-ns-resize flex items-center justify-center group/handle hover:bg-white/20 transition-colors z-20 rounded-b-2xl bg-white/[0.04]"
          title="Tarik ke bawah / atas untuk ubah jam selesai & durasi"
        >
          <div className={`${isNarrow ? 'w-5 h-0.5' : 'w-8 h-1'} rounded-full bg-white/40 group-hover/handle:bg-white transition-all group-hover/handle:w-10 shadow-sm`} />
        </div>
      </div>
    );
  };

  // Save Schedule Event (Choice 1: By Nama Aja vs Choice 2: Tugas Proyek)
  const handleSaveScheduleChoice = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (scheduleChoiceType === 'nama') {
      // 1. By Nama Aja (Aktivitas Bebas)
      if (!customTitle.trim()) return;

      const scheduleItem = {
        title: customTitle.trim(),
        date: scheduleDate,
        start_time: scheduleStartTime,
        end_time: scheduleEndTime,
        type: 'custom',
        color: customColor,
        notes: customNotes.trim(),
      };

      saveCustomSchedule(user.id, scheduleItem);
      await loadData();
      setIsAddScheduleModalOpen(false);
    } else {
      // 2. Tugas Proyek (Route ke Project / Task)
      let targetTask = null;

      if (selectedTaskId) {
        targetTask = allTasks.find((t) => String(t.id) === String(selectedTaskId));
      }

      if (!targetTask && newQuickTaskTitle.trim() && selectedBoardId) {
        // User wrote a new task title for the project
        const board = boards.find((b) => String(b.id) === String(selectedBoardId));
        const colId = board?.columns?.[0]?.id;
        if (colId) {
          targetTask = await createTask({
            user_id: user.id,
            column_id: colId,
            title: newQuickTaskTitle.trim(),
            priority: 'medium',
          });
        }
      }

      if (targetTask) {
        // Format due_date with exact date and start_time: YYYY-MM-DDTHH:mm:00
        const [h, m] = (scheduleStartTime || '09:00').split(':');
        const [year, month, day] = scheduleDate.split('-');
        const dueDateTime = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(h, 10), parseInt(m, 10));

        await updateTask(targetTask.id, {
          due_date: dueDateTime.toISOString(),
        });

        // Also save in custom schedule registry for rich time range representation
        saveCustomSchedule(user.id, {
          title: targetTask.title,
          date: scheduleDate,
          start_time: scheduleStartTime,
          end_time: scheduleEndTime,
          type: 'task',
          task_id: targetTask.id,
          board_id: targetTask.board_id || selectedBoardId,
          board_name: targetTask.board_name || boards.find((b) => String(b.id) === String(selectedBoardId))?.name || '',
          color: 'blue',
        });

        await loadData();
        refreshUserStats(user.id);
        setIsAddScheduleModalOpen(false);
      }
    }
  };

  // Delete an item from schedule
  const handleDeleteScheduleItem = async (item, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Hapus jadwal "${item.title}"?`)) return;

    if (item.type === 'custom') {
      deleteCustomSchedule(user.id, item.id);
    } else if (item.type === 'task') {
      // Remove from custom schedules if present
      deleteCustomSchedule(user.id, item.id);
      const taskId = item.taskId || item.id;
      if (taskId) {
        await updateTask(taskId, { due_date: null });
      }
    }
    await loadData();
    refreshUserStats(user?.id);
  };

  // Toggle item completion
  const handleToggleDone = async (item, e) => {
    if (e) e.stopPropagation();

    if (item.type === 'custom') {
      saveCustomSchedule(user.id, {
        ...item.raw,
        is_completed: !item.is_completed,
      });
      await loadData();
    } else if (item.type === 'task') {
      const taskId = item.taskId || item.id;
      const task = allTasks.find((t) => String(t.id) === String(taskId)) || item.raw;
      const boardId = task?.board_id || item.board_id;
      const board = boards.find((b) => String(b.id) === String(boardId));

      if (board && task?.id) {
        const cols = board.columns || [];
        const doneCol = cols.find(
          (c) => c.name.toLowerCase().includes('selesai') || c.name.toLowerCase().includes('done')
        ) || cols[cols.length - 1];
        const belumCol = cols.find(
          (c) => c.name.toLowerCase().includes('belum')
        ) || cols[0];

        const isDone = task.column_id === doneCol?.id;
        const targetColId = isDone ? belumCol?.id : doneCol?.id;

        if (targetColId) {
          await moveTask(task.id, targetColId, 0);
        }
      }

      // Also toggle status in custom schedules storage
      if (item.raw?.task_id || item.type === 'task') {
        saveCustomSchedule(user.id, {
          ...item.raw,
          is_completed: !item.is_completed,
        });
      }

      await loadData();
      refreshUserStats(user?.id);
    }
  };

  // Selected board's tasks for the modal dropdown
  const selectedBoardTasks = useMemo(() => {
    if (!selectedBoardId) return allTasks;
    const board = boards.find((b) => String(b.id) === String(selectedBoardId));
    if (!board) return [];
    return (board.columns || []).flatMap((c) => (c.tasks || []).map((t) => ({ ...t, column_name: c.name })));
  }, [boards, selectedBoardId, allTasks]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 text-slate-100 p-3 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* ============================================================= */}
      {/* SECTION 1: KOTAK USIA (365-Day GitHub Contribution Heatmap)    */}
      {/* ============================================================= */}
      {ageGridCalculation && (
        <section className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all">
          {/* Header Bar with Toggle & Action */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                    Kotak Usia 365 Hari: Level Up Menuju Umur {ageGridCalculation.nextAge}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                    Tinggal {ageGridCalculation.daysRemaining} Kotak Hari
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                  Siklus 1 tahun umur berjalan dari ulang tahun terakhir menuju level berikutnya.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditingBday(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all active:scale-95"
              >
                <Cake className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Atur Tanggal Lahir</span>
                <span className="sm:hidden">Lahir</span>
              </button>

              <button
                onClick={() => setIsAgeGridExpanded(!isAgeGridExpanded)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title={isAgeGridExpanded ? 'Ciutkan Kotak Usia' : 'Buka Kotak Usia'}
              >
                {isAgeGridExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Content */}
          {isAgeGridExpanded && (
            <div className="p-4 sm:p-6 space-y-4 animate-pop-in">
              {/* Quick Metrics & XP Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-medium">Umur Sekarang</span>
                  <div className="text-xl font-black text-white">
                    {ageGridCalculation.currentAge} <span className="text-xs font-normal text-slate-400">th</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/5">
                  <span className="text-[10px] text-orange-400 font-medium block">Level Up Berikutnya</span>
                  <div className="text-xl font-black text-orange-400">
                    {ageGridCalculation.nextAge} <span className="text-xs font-normal text-orange-300/80">th</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/5">
                  <span className="text-[10px] text-emerald-400 font-medium block">Kotak Terlewati</span>
                  <div className="text-xl font-black text-emerald-400">
                    {ageGridCalculation.daysPassed} <span className="text-xs font-normal text-slate-400">/ {ageGridCalculation.totalDaysInCycle}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-amber-500/20 bg-amber-500/5">
                  <span className="text-[10px] text-amber-300 font-medium block">Sisa Kotak Hari</span>
                  <div className="text-xl font-black text-amber-300">
                    {ageGridCalculation.daysRemaining} <span className="text-xs font-normal text-amber-400">Kotak</span>
                  </div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Kemajuan Tahun Umur {ageGridCalculation.currentAge}:</span>
                  </span>
                  <span className="font-extrabold text-amber-400 font-mono">
                    {ageGridCalculation.progressPct}% • {ageGridCalculation.daysRemaining} hari lagi menuju {ageGridCalculation.nextAge} th
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-orange-500 transition-all duration-700 shadow-sm"
                    style={{ width: `${ageGridCalculation.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Matrix Heatmap Container */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/5 mb-3">
                  <span className="font-semibold text-slate-300">
                    365 Kotak Hari (Setiap kotak = 1 Hari Menuju Umur {ageGridCalculation.nextAge})
                  </span>
                  <div className="flex items-center space-x-3 text-[10px]">
                    <div className="flex items-center space-x-1">
                      <div className="w-2.5 h-2.5 rounded bg-slate-900 border border-white/10" />
                      <span>Sisa Hari</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2.5 h-2.5 rounded bg-emerald-600 border border-emerald-500/40" />
                      <span>Terlewati</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2.5 h-2.5 rounded bg-amber-400 border border-amber-300 ring-1 ring-amber-400" />
                      <span>Hari Ini</span>
                    </div>
                  </div>
                </div>

                {/* Tooltip detail when hovered */}
                {hoveredDayCell && (
                  <div className="mb-2 p-2 rounded-xl bg-slate-950 border border-amber-500/30 text-xs flex items-center justify-between text-slate-200">
                    <span className="font-bold text-white">{hoveredDayCell.dateString}</span>
                    <div>
                      {hoveredDayCell.isToday ? (
                        <span className="text-amber-400 font-extrabold">⭐ Hari Ini</span>
                      ) : hoveredDayCell.isPast ? (
                        <span className="text-emerald-400">✓ Sudah Terlewati</span>
                      ) : (
                        <span className="text-amber-300 font-semibold">
                          ⏳ Sisa {ageGridCalculation.daysRemaining - (hoveredDayCell.index - ageGridCalculation.daysPassed)} kotak lagi
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 52-Week Horizontal Grid Matrix */}
                <div className="overflow-x-auto pb-2 no-scrollbar">
                  <div className="inline-flex gap-1">
                    <div className="flex flex-col justify-between py-0.5 pr-1.5 text-[9px] text-slate-500 font-mono select-none">
                      <span>Sen</span>
                      <span>Rab</span>
                      <span>Jum</span>
                      <span>Min</span>
                    </div>

                    {ageGridCalculation.weeks.map((week, wIndex) => (
                      <div key={wIndex} className="flex flex-col gap-1 shrink-0">
                        {week.map((cell, cIndex) => {
                          if (!cell) {
                            return <div key={`empty-${wIndex}-${cIndex}`} className="w-3 h-3 rounded-sm bg-transparent" />;
                          }

                          return (
                            <button
                              key={cell.date.toISOString()}
                              onMouseEnter={() => setHoveredDayCell(cell)}
                              onMouseLeave={() => setHoveredDayCell(null)}
                              onClick={() => setHoveredDayCell(cell)}
                              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm transition-all duration-200 ${
                                cell.isToday
                                  ? 'bg-amber-400 border border-amber-300 ring-2 ring-amber-400/60 scale-125 z-10'
                                  : cell.isPast
                                  ? 'bg-emerald-600/80 border border-emerald-500/30 hover:bg-emerald-500'
                                  : 'bg-slate-900 border border-white/10 hover:border-amber-400/60'
                              }`}
                              title={`${cell.dateString}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================= */}
      {/* SECTION 2: STATISTIK KEAKTIFAN TERPADU (Daily & Weekly)      */}
      {/* ============================================================= */}
      <UnifiedActivityStats
        boards={boards}
        customSchedules={customSchedules}
        notes={notes}
        ageGridCalculation={ageGridCalculation}
        currentWeekDays={currentWeekDays}
        onNavigate={onNavigate}
      />

      {/* ============================================================= */}
      {/* SECTION 3: JADWAL 24 JAM (Weekly 24-Hour Timetable)           */}
      {/* ============================================================= */}
      <section className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col flex-1">
        {/* Timetable Header Bar: Week Selector, Filter & Add Button */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Week Navigators */}
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

            {/* Date Range Label */}
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <span>{weekRangeLabel}</span>
                {weekOffset === 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Aktif
                  </span>
                )}
              </h2>
              <span className="text-[11px] text-slate-400">Jadwal 24 Jam Harian (00:00 - 23:00)</span>
            </div>
          </div>

          {/* Controls: Segment filter, Project filter & Add Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Time Segment Filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setTimeSegmentFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  timeSegmentFilter === 'all' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                24 Jam
              </button>
              <button
                onClick={() => setTimeSegmentFilter('morning')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  timeSegmentFilter === 'morning' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pagi (06-12)
              </button>
              <button
                onClick={() => setTimeSegmentFilter('afternoon')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  timeSegmentFilter === 'afternoon' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Siang (12-18)
              </button>
              <button
                onClick={() => setTimeSegmentFilter('evening')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  timeSegmentFilter === 'evening' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Malam (18-24)
              </button>
            </div>

            {/* Project Filter */}
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hidden md:block"
            >
              <option value="all">Semua Proyek ({boards.length})</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  Proyek: {b.name}
                </option>
              ))}
            </select>

            {/* Ke Proyek / Task Direct Route */}
            {onNavigate && (
              <button
                onClick={() => onNavigate('schedule')}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-xs font-semibold transition-all active:scale-95 shrink-0"
                title="Buka Halaman Proyek / Task"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Ke Proyek</span>
                <ExternalLink className="w-3 h-3 text-blue-400/80" />
              </button>
            )}

            {/* + TAMBAH JADWAL BUTTON */}
            <button
              onClick={() => {
                const todayIso = currentWeekDays.find((d) => d.isToday)?.isoDate || currentWeekDays[0]?.isoDate;
                const currentHour = `${String(new Date().getHours()).padStart(2, '0')}:00`;
                handleOpenAddModal(todayIso, currentHour);
              }}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Jadwal</span>
            </button>
          </div>
        </div>

        {/* Mobile Day Selector Pills (Visible only on small screens) */}
        <div className="lg:hidden flex items-center space-x-1.5 p-3 overflow-x-auto bg-slate-900/60 border-b border-white/5 no-scrollbar">
          {currentWeekDays.map((day, idx) => (
            <button
              key={day.isoDate}
              onClick={() => setMobileSelectedDayIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center space-x-1.5 transition-all ${
                mobileSelectedDayIndex === idx
                  ? 'bg-emerald-600 text-white font-bold shadow-md'
                  : day.isToday
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <span>{day.dayName}</span>
              <span className="font-mono text-[11px] opacity-80">{day.dayNumber}</span>
              {day.isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>

        {/* Continuous 24-Hour Timetable Grid */}
        <div className="flex-1 overflow-auto max-h-[750px] relative">
          {/* Table Header Row (Sticky top Days of the week) */}
          <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-white/10 flex text-xs font-semibold">
            {/* Time column header */}
            <div className="w-16 sm:w-20 p-2.5 text-center text-slate-500 border-r border-white/10 shrink-0 font-mono text-[11px]">
              Jam
            </div>

            {/* Desktop: 7 Day Columns */}
            <div className="hidden lg:grid grid-cols-7 flex-1 divide-x divide-white/5">
              {currentWeekDays.map((day) => (
                <div
                  key={day.isoDate}
                  className={`p-2.5 text-center transition-colors ${
                    day.isToday ? 'bg-emerald-500/10 text-emerald-300 font-bold' : 'text-slate-300'
                  }`}
                >
                  <div className="text-[11px] text-slate-400 font-medium">{day.dayName}</div>
                  <div className="flex items-center justify-center space-x-1 mt-0.5">
                    <span className="text-sm font-extrabold text-white">{day.dayNumber}</span>
                    <span className="text-[10px] text-slate-500">{day.monthName}</span>
                    {day.isToday && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: 1 Active Selected Day Column */}
            <div className="lg:hidden flex-1 p-2.5 text-center text-emerald-300 font-bold bg-emerald-500/10">
              {currentWeekDays[mobileSelectedDayIndex || 0]?.dayName},{' '}
              {currentWeekDays[mobileSelectedDayIndex || 0]?.dayNumber}{' '}
              {currentWeekDays[mobileSelectedDayIndex || 0]?.monthName}
              {currentWeekDays[mobileSelectedDayIndex || 0]?.isToday && ' (Hari Ini)'}
            </div>
          </div>

          {/* Table Body: Timetable Area with Time Gutter on the left and Day Columns */}
          <div className="flex relative" style={{ minHeight: `${displayedHours.length * 64}px` }}>
            {/* Left Time Gutter */}
            <div className="w-16 sm:w-20 border-r border-white/10 shrink-0 bg-slate-950/40 divide-y divide-white/5 font-mono text-xs text-slate-400 select-none">
              {displayedHours.map((hourStr) => (
                <div
                  key={hourStr}
                  className="h-[64px] p-2 text-center flex flex-col justify-start pt-2 hover:text-white transition-colors"
                >
                  <span>{hourStr}</span>
                </div>
              ))}
            </div>

            {/* Desktop: 7 Day Columns */}
            <div className="hidden lg:grid grid-cols-7 flex-1 divide-x divide-white/5 relative">
              {currentWeekDays.map((day) => {
                const dayPositionedEvents = positionedEventsByDay[day.isoDate] || [];

                return (
                  <div
                    key={day.isoDate}
                    className={`relative ${day.isToday ? 'bg-emerald-500/[0.015]' : ''}`}
                    style={{ height: `${displayedHours.length * 64}px` }}
                  >
                    {/* Background Hourly Clickable Grid */}
                    <div className="absolute inset-0 divide-y divide-white/5">
                      {displayedHours.map((hourStr) => (
                        <div
                          key={hourStr}
                          onClick={() => handleOpenAddModal(day.isoDate, hourStr)}
                          className="h-[64px] relative cursor-pointer hover:bg-white/[0.03] group/slot transition-colors"
                          title={`Klik untuk tambah jadwal ${day.dayName} jam ${hourStr}`}
                        >
                          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-10">
                            <span className="p-1 rounded-md bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[10px] flex items-center space-x-1">
                              <Plus className="w-3 h-3" />
                              <span>{hourStr}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Current time indicator line on today's column */}
                    {day.isToday && nowDecimal >= segmentStartHour && nowDecimal <= segmentEndHour && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${(nowDecimal - segmentStartHour) * 64}px` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/80 -ml-1 ring-2 ring-rose-400 animate-pulse" />
                        <div className="h-[2px] w-full bg-rose-500/90 shadow-sm shadow-rose-500/50" />
                      </div>
                    )}

                    {/* Events Layer: Absolutely positioned & continuous multi-hour spanning */}
                    <div className="absolute inset-0 pointer-events-none p-1">
                      {dayPositionedEvents.map((item) => renderEventCard(item, day))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: 1 Active Selected Day Column */}
            <div className="lg:hidden flex-1 relative">
              {(() => {
                const activeDay = currentWeekDays[mobileSelectedDayIndex || 0];
                if (!activeDay) return null;
                const dayPositionedEvents = positionedEventsByDay[activeDay.isoDate] || [];

                return (
                  <div
                    className="relative"
                    style={{ height: `${displayedHours.length * 64}px` }}
                  >
                    {/* Background Hourly Clickable Grid */}
                    <div className="absolute inset-0 divide-y divide-white/5">
                      {displayedHours.map((hourStr) => (
                        <div
                          key={hourStr}
                          onClick={() => handleOpenAddModal(activeDay.isoDate, hourStr)}
                          className="h-[64px] relative cursor-pointer hover:bg-white/[0.03] group/slot transition-colors"
                          title={`Klik untuk tambah jadwal jam ${hourStr}`}
                        >
                          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/slot:opacity-100 transition-opacity z-10">
                            <span className="p-1 rounded-md bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[10px] flex items-center space-x-1">
                              <Plus className="w-3 h-3" />
                              <span>{hourStr}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Current time indicator line if activeDay is today */}
                    {activeDay.isToday && nowDecimal >= segmentStartHour && nowDecimal <= segmentEndHour && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${(nowDecimal - segmentStartHour) * 64}px` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/80 -ml-1 ring-2 ring-rose-400 animate-pulse" />
                        <div className="h-[2px] w-full bg-rose-500/90 shadow-sm shadow-rose-500/50" />
                      </div>
                    )}

                    {/* Events Layer */}
                    <div className="absolute inset-0 pointer-events-none p-1">
                      {dayPositionedEvents.map((item) => renderEventCard(item, activeDay))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* MODAL: TAMBAH JADWAL 24 JAM (PILIHAN: NAMA AJA vs TUGAS)       */}
      {/* ============================================================= */}
      {isAddScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveScheduleChoice}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl animate-pop-in text-slate-100"
          >
            {/* Modal Title & 2-choice Switcher */}
            <div className="space-y-3 border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <span>Tambah Jadwal 24 Jam</span>
                </h3>
                <span className="text-xs text-slate-400">{scheduleDate}</span>
              </div>

              {/* 2 CHOICE TABS: 'By Nama Aja' vs 'Dari Tugas Proyek' */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScheduleChoiceType('nama')}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                    scheduleChoiceType === 'nama'
                      ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>✏️ By Nama Aja</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleChoiceType('tugas')}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                    scheduleChoiceType === 'tugas'
                      ? 'bg-blue-600 text-white shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>📌 Dari Tugas Proyek</span>
                </button>
              </div>
            </div>

            {/* CHOICE 1: BY NAMA AJA (Aktivitas Bebas) */}
            {scheduleChoiceType === 'nama' && (
              <div className="space-y-3.5 animate-pop-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Aktivitas / Kegiatan:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Tidur Siang, Olahraga, Belajar, Sarapan, Meeting..."
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Color Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Warna / Kategori:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SCHEDULE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCustomColor(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-2 border transition-all ${
                          customColor === c.id
                            ? `${c.bg} ${c.border} ${c.text} ring-1 ring-emerald-400`
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        <span>{c.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Catatan (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Keterangan tambahan..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* CHOICE 2: TUGAS PROYEK (Pilih Task dari Board atau Buat Baru) */}
            {scheduleChoiceType === 'tugas' && (
              <div className="space-y-3.5 animate-pop-in">
                {/* Route link banner to Project / Task */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-950/40 border border-blue-500/20 text-xs">
                  <div className="flex items-center space-x-2 text-blue-300">
                    <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Tugas tersambung ke Kanban Proyek</span>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddScheduleModalOpen(false);
                        onNavigate('schedule');
                      }}
                      className="flex items-center space-x-1 text-xs font-bold text-blue-400 hover:text-blue-200 hover:underline"
                    >
                      <span>Buka Halaman Proyek</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Select Board */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Pilih Proyek:
                  </label>
                  <select
                    value={selectedBoardId}
                    onChange={(e) => {
                      setSelectedBoardId(e.target.value);
                      setSelectedTaskId('');
                    }}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        Proyek: {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Task */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Pilih Tugas yang Ingin Dijadwalkan:
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {selectedBoardTasks.length} task tersedia
                    </span>
                  </div>
                  {selectedBoardTasks.length > 0 ? (
                    <select
                      value={selectedTaskId}
                      onChange={(e) => {
                        setSelectedTaskId(e.target.value);
                        const t = allTasks.find((item) => String(item.id) === String(e.target.value));
                        if (t) setCustomTitle(t.title);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Tugas dari Proyek Ini --</option>
                      {selectedBoardTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.column_name || 'Tugas'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400">
                      Belum ada tugas di proyek ini. Anda bisa langsung buat tugas baru di bawah.
                    </div>
                  )}
                </div>

                {/* Or Quick Create Task */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Atau buat tugas baru di proyek ini (nambah dari sini):
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik judul tugas baru langsung..."
                    value={newQuickTaskTitle}
                    onChange={(e) => setNewQuickTaskTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tugas baru akan otomatis masuk ke board proyek yang dipilih dan langsung terpasang di jadwal ini.
                  </p>
                </div>
              </div>
            )}

            {/* COMMON FIELDS: Tanggal & Jam (Start & End) */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tanggal:
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Jam Mulai:
                  </label>
                  <select
                    value={scheduleStartTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setScheduleStartTime(newStart);
                      const [sh] = newStart.split(':').map(Number);
                      const [eh] = scheduleEndTime.split(':').map(Number);
                      if (eh <= sh) {
                        const nextH = (sh + 1) % 24;
                        setScheduleEndTime(`${String(nextH).padStart(2, '0')}:00`);
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-mono"
                  >
                    {HOURS_24.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Jam Selesai:
                  </label>
                  <select
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-mono"
                  >
                    {HOURS_24.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10"
              >
                Batal
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 ${
                  scheduleChoiceType === 'nama'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
              >
                Simpan ke Jadwal 24 Jam
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: EDIT JADWAL (Ubah Waktu, Judul, Warna, dsb)            */}
      {/* ============================================================= */}
      {isEditScheduleModalOpen && editingScheduleItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditSchedule}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl animate-pop-in text-slate-100"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">Edit Jadwal Kegiatan</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{editDate}</span>
            </div>

            {/* Linked Task Banner if connected */}
            {editingScheduleItem.type === 'task' && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-950/40 border border-blue-500/20 text-xs">
                <div className="flex items-center space-x-2 text-blue-300">
                  <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Tersambung ke Proyek: <strong className="text-white">{editingScheduleItem.board_name || 'Proyek'}</strong>
                  </span>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditScheduleModalOpen(false);
                      onNavigate('schedule');
                    }}
                    className="flex items-center space-x-1 text-xs font-bold text-blue-400 hover:text-blue-200 hover:underline"
                  >
                    <span>Buka Proyek</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Jadwal / Kegiatan:
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Color Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kategori Warna:
              </label>
              <div className="flex flex-wrap gap-2">
                {SCHEDULE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setEditColor(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-2 border transition-all ${
                      editColor === c.id
                        ? `${c.bg} ${c.border} ${c.text} ring-1 ring-emerald-400 font-bold`
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span>{c.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date, Start Time, End Time */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tanggal:
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Jam Mulai:
                </label>
                <select
                  value={editStartTime}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setEditStartTime(newStart);
                    const [sh] = newStart.split(':').map(Number);
                    const [eh] = editEndTime.split(':').map(Number);
                    if (eh <= sh) {
                      const nextH = (sh + 1) % 24;
                      setEditEndTime(`${String(nextH).padStart(2, '0')}:00`);
                    }
                  }}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono cursor-pointer"
                >
                  {HOURS_24.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Jam Selesai:
                </label>
                <select
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono cursor-pointer"
                >
                  {HOURS_24.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Catatan (Opsional):
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Tambahkan catatan jadwal..."
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleDeleteFromEditModal}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center space-x-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Jadwal</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ATUR TANGGAL LAHIR                                     */}
      {/* ------------------------------------------------------------- */}
      {isEditingBday && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  Untuk menghitung siklus 365 kotak hari menuju umur berikutnya.
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

      {/* Task Modal for deep task editing */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={async (taskPayload) => {
          if (taskPayload.id) {
            await updateTask(taskPayload.id, taskPayload);
          } else {
            await createTask({ ...taskPayload, user_id: user.id });
          }
          await loadData();
          setIsTaskModalOpen(false);
          setEditingTask(null);
          refreshUserStats(user?.id);
        }}
        onDelete={async (taskId) => {
          await deleteTask(taskId);
          await loadData();
          setIsTaskModalOpen(false);
          setEditingTask(null);
          refreshUserStats(user?.id);
        }}
        initialTask={editingTask}
        targetColumnId={allAvailableColumns[0]?.id}
        columns={allAvailableColumns}
      />
    </div>
  );
};
