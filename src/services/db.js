import { supabase } from './supabase';

// Local storage cache helpers (for instant UI & offline fallback)
const getLocalData = (key, defaultVal = []) => {
  try {
    const raw = localStorage.getItem(`matrack_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setLocalData = (key, val) => {
  try {
    localStorage.setItem(`matrack_${key}`, JSON.stringify(val));
  } catch {}
};

/**
 * Standard 3 columns creator helper
 */
export const createDefault3Columns = (boardId) => {
  return [
    {
      id: `col-belum-${boardId}`,
      board_id: boardId,
      name: 'Belum',
      position: 0,
      tasks: [],
    },
    {
      id: `col-progress-${boardId}`,
      board_id: boardId,
      name: 'Masih Dilakukan',
      position: 1,
      tasks: [],
    },
    {
      id: `col-selesai-${boardId}`,
      board_id: boardId,
      name: 'Selesai',
      position: 2,
      tasks: [],
    },
  ];
};

/**
 * Initialize starter data in Supabase Cloud for new users
 */
export const initializeUserData = async (user) => {
  if (!user || !user.id) return;
  const userId = String(user.id);
  const userKey = `boards_${userId}`;
  const notesKey = `notes_${userId}`;

  try {
    // 1. Check if user already has boards in Supabase
    const { data: existingBoards, error: bErr } = await supabase
      .from('boards')
      .select('id')
      .eq('user_id', userId);

    if (!bErr && (!existingBoards || existingBoards.length === 0)) {
      // Create initial board in Supabase
      const { data: newBoard, error: createBErr } = await supabase
        .from('boards')
        .insert([{ user_id: userId, name: 'Jadwal Utama' }])
        .select()
        .single();

      if (!createBErr && newBoard) {
        // Insert standard 3 columns in Supabase
        const { data: cols, error: cErr } = await supabase
          .from('columns')
          .insert([
            { board_id: newBoard.id, name: 'Belum', position: 0 },
            { board_id: newBoard.id, name: 'Masih Dilakukan', position: 1 },
            { board_id: newBoard.id, name: 'Selesai', position: 2 },
          ])
          .select()
          .order('position', { ascending: true });

        if (!cErr && cols && cols.length === 3) {
          // Insert starter tasks linked to real Supabase column IDs
          await supabase.from('tasks').insert([
            {
              column_id: cols[0].id,
              user_id: userId,
              title: 'Jelajahi Fitur Matrack Schedule 📅',
              description: 'Tiap baris proyek otomatis memiliki 3 status kolom (Belum, Masih Dilakukan, Selesai). Anda bisa drag & drop kartu tugas.',
              priority: 'high',
              due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
              position: 0,
            },
            {
              column_id: cols[1].id,
              user_id: userId,
              title: 'Sesuaikan Target & Catatan Harian',
              description: 'Buat catatan baru di Apple Notes dan atur daftar tugas di sini.',
              priority: 'medium',
              due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
              position: 0,
            },
            {
              column_id: cols[2].id,
              user_id: userId,
              title: 'Akun Matrack Siap Digunakan',
              description: 'Berhasil terhubung ke Supabase Cloud.',
              priority: 'low',
              due_date: new Date().toISOString(),
              position: 0,
            },
          ]);
        }
      }
    }

    // 2. Check if user already has notes in Supabase
    const { data: existingNotes, error: nErr } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', userId);

    if (!nErr && (!existingNotes || existingNotes.length === 0)) {
      await supabase.from('notes').insert([
        {
          user_id: userId,
          title: 'Selamat Datang di Matrack Notes 📝',
          content: "# Selamat Datang di Matrack Notes!\n\nRuang kerja catatan pribadi bergaya Apple Notes dengan auto-save instan dan sinkronisasi realtime.\n\n### Fitur Utama:\n- **Auto-save Instan:** Ketik dengan bebas tanpa takut hilang.\n- **Pin Catatan Penting:** Sematkan ide utama di bagian teratas.\n- **Odoo Launcher:** Klik ikon 9-titik di pojok kiri atas kapan saja untuk berpindah aplikasi!\n\nSemoga hari Anda produktif!",
          folder: 'Notes',
          is_pinned: true,
          is_archived: false,
          is_trash: false,
        },
      ]);
    }
  } catch (err) {
    console.warn('Error during cloud initialization, fallback local:', err);
  }
};

/* ==========================================================================
   NOTES CRUD (Apple Notes Module)
   ========================================================================== */

export const getCustomFolders = (userId) => {
  const foldersKey = `folders_${userId}`;
  return getLocalData(foldersKey, ['Notes']);
};

export const saveCustomFolder = (userId, folderName) => {
  if (!folderName || !folderName.trim()) return ['Notes'];
  const clean = folderName.trim();
  const foldersKey = `folders_${userId}`;
  const current = getLocalData(foldersKey, ['Notes']);
  const updated = Array.from(new Set([...current, clean]));
  setLocalData(foldersKey, updated);
  return updated;
};

export const getNotes = async (userId, { filter = 'all', folder = 'all', search = '' } = {}) => {
  if (!userId) return { notes: [], folders: ['Notes'] };
  const notesKey = `notes_${userId}`;
  let notes = [];
  const customFolders = getCustomFolders(userId);

  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', String(userId))
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (!error && data) {
      notes = data;
      setLocalData(notesKey, notes);
    } else {
      notes = getLocalData(notesKey, []);
    }
  } catch {
    notes = getLocalData(notesKey, []);
  }

  let filtered = [...notes];

  if (filter === 'trash') {
    filtered = filtered.filter((n) => n.is_trash);
  } else {
    filtered = filtered.filter((n) => !n.is_trash);
    if (filter === 'pinned') filtered = filtered.filter((n) => n.is_pinned);
    else if (filter === 'archived') filtered = filtered.filter((n) => n.is_archived);
    else filtered = filtered.filter((n) => !n.is_archived);

    if (folder && folder !== 'all') filtered = filtered.filter((n) => n.folder === folder);
  }

  if (search && search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (n) => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  const distinctFolders = Array.from(
    new Set(['Notes', ...customFolders, ...notes.map((n) => n.folder).filter(Boolean)])
  );

  return { notes: filtered, folders: distinctFolders };
};

export const createNote = async (userId, noteData) => {
  const notesKey = `notes_${userId}`;
  const payload = {
    user_id: String(userId),
    title: noteData.title || 'New Note',
    content: noteData.content || '',
    folder: noteData.folder || 'Notes',
    is_pinned: Boolean(noteData.is_pinned),
    is_archived: false,
    is_trash: false,
  };

  try {
    const { data, error } = await supabase
      .from('notes')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      const local = getLocalData(notesKey, []);
      setLocalData(notesKey, [data, ...local.filter((n) => String(n.id) !== String(data.id))]);
      return data;
    }
  } catch (err) {
    console.error('Failed to create note in Supabase:', err);
  }

  // Fallback
  const fallback = {
    id: 'note-' + Date.now(),
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const local = getLocalData(notesKey, []);
  setLocalData(notesKey, [fallback, ...local]);
  return fallback;
};

export const updateNote = async (noteId, noteData) => {
  const updates = { ...noteData, updated_at: new Date().toISOString() };
  delete updates.id;

  let resultNote = null;
  try {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (!error && data) {
      resultNote = data;
    }
  } catch (err) {
    console.error('Failed to update note in Supabase:', err);
  }

  // Update local storage across keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('matrack_notes_')) {
      const list = getLocalData(key.replace('matrack_', ''), []);
      const match = list.find((n) => String(n.id) === String(noteId));
      if (match) {
        const finalObj = resultNote || { ...match, ...noteData, updated_at: new Date().toISOString() };
        const updated = list.map((n) => (String(n.id) === String(noteId) ? finalObj : n));
        setLocalData(key.replace('matrack_', ''), updated);
        return finalObj;
      }
    }
  }

  return resultNote || { id: noteId, ...noteData, updated_at: new Date().toISOString() };
};

export const togglePinNote = async (noteId, currentPinned) => {
  return updateNote(noteId, { is_pinned: !currentPinned });
};

export const deleteNote = async (noteId, isTrash) => {
  try {
    if (isTrash) {
      await supabase.from('notes').delete().eq('id', noteId);
    } else {
      await supabase
        .from('notes')
        .update({ is_trash: true, is_pinned: false, updated_at: new Date().toISOString() })
        .eq('id', noteId);
    }
  } catch (err) {
    console.error('Failed to delete note in Supabase:', err);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('matrack_notes_')) {
      const list = getLocalData(key.replace('matrack_', ''), []);
      if (isTrash) {
        setLocalData(
          key.replace('matrack_', ''),
          list.filter((n) => String(n.id) !== String(noteId))
        );
      } else {
        setLocalData(
          key.replace('matrack_', ''),
          list.map((n) =>
            String(n.id) === String(noteId)
              ? { ...n, is_trash: true, is_pinned: false }
              : n
          )
        );
      }
      break;
    }
  }

  return true;
};

export const restoreNote = async (noteId) => {
  return updateNote(noteId, { is_trash: false });
};

/* ==========================================================================
   SCHEDULE ROWS & TASKS (Direct Supabase Sync + Realtime)
   ========================================================================== */

export const getBoards = async (userId) => {
  if (!userId) return [];
  const userKey = `boards_${userId}`;

  try {
    const { data: cloudBoards, error } = await supabase
      .from('boards')
      .select(`
        *,
        columns (
          *,
          tasks (*)
        )
      `)
      .eq('user_id', String(userId))
      .order('created_at', { ascending: true });

    if (!error && cloudBoards) {
      if (cloudBoards.length === 0) {
        // If user has no board in Supabase yet, initialize cloud starter data
        await initializeUserData({ id: userId });
        
        // Re-fetch after init
        const { data: retryBoards } = await supabase
          .from('boards')
          .select(`
            *,
            columns (
              *,
              tasks (*)
            )
          `)
          .eq('user_id', String(userId))
          .order('created_at', { ascending: true });

        if (retryBoards && retryBoards.length > 0) {
          const formatted = retryBoards.map((b) => ({
            ...b,
            columns: (b.columns || [])
              .sort((a, b) => (a.position || 0) - (b.position || 0))
              .map((col) => ({
                ...col,
                tasks: (col.tasks || []).sort((a, b) => (a.position || 0) - (b.position || 0)),
              })),
          }));
          setLocalData(userKey, formatted);
          return formatted;
        }
      }

      const formatted = cloudBoards.map((cb) => {
        let cols = cb.columns || [];
        return {
          ...cb,
          columns: cols
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((col) => ({
              ...col,
              tasks: (col.tasks || []).sort((a, b) => (a.position || 0) - (b.position || 0)),
            })),
        };
      });

      setLocalData(userKey, formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('Error fetching boards from Supabase, fallback local:', err);
  }

  return getLocalData(userKey, []);
};

/**
 * Create a new Project Group Row in Supabase
 */
export const createProjectGroup = async (userId, name) => {
  const userKey = `boards_${userId}`;
  const projectName = name?.trim() || 'Proyek Baru';

  try {
    const { data: cloudBoard, error: bErr } = await supabase
      .from('boards')
      .insert([{ user_id: String(userId), name: projectName }])
      .select()
      .single();

    if (!bErr && cloudBoard) {
      const { data: cloudCols, error: cErr } = await supabase
        .from('columns')
        .insert([
          { board_id: cloudBoard.id, name: 'Belum', position: 0 },
          { board_id: cloudBoard.id, name: 'Masih Dilakukan', position: 1 },
          { board_id: cloudBoard.id, name: 'Selesai', position: 2 },
        ])
        .select()
        .order('position', { ascending: true });

      const newBoard = {
        ...cloudBoard,
        columns: (cloudCols || []).map((col) => ({ ...col, tasks: [] })),
      };

      const local = getLocalData(userKey, []);
      setLocalData(userKey, [...local, newBoard]);
      return newBoard;
    }
  } catch (err) {
    console.error('Error creating project in Supabase:', err);
  }

  // Offline fallback
  const fallbackBoardId = 'board-' + Date.now();
  const fallbackBoard = {
    id: fallbackBoardId,
    user_id: String(userId),
    name: projectName,
    created_at: new Date().toISOString(),
    columns: createDefault3Columns(fallbackBoardId),
  };

  const local = getLocalData(userKey, []);
  setLocalData(userKey, [...local, fallbackBoard]);
  return fallbackBoard;
};

export const updateProjectGroup = async (boardId, name) => {
  try {
    await supabase.from('boards').update({ name, updated_at: new Date().toISOString() }).eq('id', boardId);
  } catch (err) {
    console.error('Error updating project in Supabase:', err);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('matrack_boards_')) {
      const list = getLocalData(key.replace('matrack_', ''), []);
      const match = list.find((b) => String(b.id) === String(boardId));
      if (match) {
        const updated = list.map((b) =>
          String(b.id) === String(boardId) ? { ...b, name } : b
        );
        setLocalData(key.replace('matrack_', ''), updated);
        break;
      }
    }
  }

  return true;
};

export const deleteProjectGroup = async (boardId) => {
  try {
    await supabase.from('boards').delete().eq('id', boardId);
  } catch (err) {
    console.error('Error deleting project from Supabase:', err);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('matrack_boards_')) {
      const list = getLocalData(key.replace('matrack_', ''), []);
      setLocalData(
        key.replace('matrack_', ''),
        list.filter((b) => String(b.id) !== String(boardId))
      );
      break;
    }
  }

  return true;
};

/* ==========================================================================
   TASKS CRUD (100% Direct Cloud Insert & Realtime)
   ========================================================================== */

export const createTask = async (taskData) => {
  const columnId = !isNaN(Number(taskData.column_id))
    ? Number(taskData.column_id)
    : taskData.column_id;

  const payload = {
    user_id: String(taskData.user_id),
    column_id: columnId,
    title: taskData.title,
    description: taskData.description || '',
    due_date: taskData.due_date || null,
    priority: taskData.priority || 'medium',
    position: Number(taskData.position) || 0,
  };

  let insertedCloudTask = null;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      insertedCloudTask = data;
    } else if (error) {
      console.error('Supabase task insert error:', error);
    }
  } catch (err) {
    console.error('Failed to create task in Supabase:', err);
  }

  const finalTask = insertedCloudTask || {
    id: 'task-' + Date.now(),
    ...payload,
    created_at: new Date().toISOString(),
  };

  // Update local cache
  const userKey = `boards_${taskData.user_id}`;
  const boards = getLocalData(userKey, []);

  const updated = boards.map((b) => ({
    ...b,
    columns: (b.columns || []).map((col) => {
      if (String(col.id) === String(taskData.column_id)) {
        return { ...col, tasks: [finalTask, ...(col.tasks || [])] };
      }
      return col;
    }),
  }));
  setLocalData(userKey, updated);

  return finalTask;
};

export const updateTask = async (taskId, taskData) => {
  const updates = { ...taskData, updated_at: new Date().toISOString() };
  delete updates.id;

  if (updates.column_id && !isNaN(Number(updates.column_id))) {
    updates.column_id = Number(updates.column_id);
  }

  let updatedCloudTask = null;
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (!error && data) {
      updatedCloudTask = data;
    }
  } catch (err) {
    console.error('Failed to update task in Supabase:', err);
  }

  // Update local cache
  let userKey = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('matrack_boards_')) {
      userKey = key.replace('matrack_', '');
      break;
    }
  }

  if (userKey) {
    const boards = getLocalData(userKey, []);
    let targetTask = updatedCloudTask;

    const cleaned = boards.map((b) => ({
      ...b,
      columns: (b.columns || []).map((col) => {
        const remaining = (col.tasks || []).filter((t) => {
          if (String(t.id) === String(taskId)) {
            if (!targetTask) targetTask = { ...t, ...taskData };
            return false;
          }
          return true;
        });
        return { ...col, tasks: remaining };
      }),
    }));

    if (!targetTask) {
      targetTask = { id: taskId, ...taskData };
    }

    const targetColId = String(taskData.column_id || targetTask.column_id);
    const updated = cleaned.map((b) => ({
      ...b,
      columns: (b.columns || []).map((col) => {
        if (String(col.id) === targetColId) {
          return { ...col, tasks: [targetTask, ...(col.tasks || [])] };
        }
        return col;
      }),
    }));

    setLocalData(userKey, updated);
  }

  return updatedCloudTask || { id: taskId, ...taskData };
};

export const moveTask = async (taskId, targetColumnId, targetPosition = 0) => {
  const targetCol = !isNaN(Number(targetColumnId)) ? Number(targetColumnId) : targetColumnId;

  try {
    await supabase
      .from('tasks')
      .update({
        column_id: targetCol,
        position: Number(targetPosition) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  } catch (err) {
    console.error('Failed to move task in Supabase:', err);
  }

  // Update local cache
  let userKey = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('matrack_boards_')) {
      userKey = key.replace('matrack_', '');
      break;
    }
  }

  if (userKey) {
    const boards = getLocalData(userKey, []);
    let movedObj = null;

    const cleaned = boards.map((b) => ({
      ...b,
      columns: (b.columns || []).map((col) => {
        const remaining = (col.tasks || []).filter((t) => {
          if (String(t.id) === String(taskId)) {
            movedObj = {
              ...t,
              column_id: targetColumnId,
              position: targetPosition,
            };
            return false;
          }
          return true;
        });
        return { ...col, tasks: remaining };
      }),
    }));

    if (movedObj) {
      const final = cleaned.map((b) => ({
        ...b,
        columns: (b.columns || []).map((col) => {
          if (String(col.id) === String(targetColumnId)) {
            const list = [...(col.tasks || [])];
            list.splice(targetPosition, 0, movedObj);
            return { ...col, tasks: list };
          }
          return col;
        }),
      }));
      setLocalData(userKey, final);
    }
  }

  return true;
};

export const deleteTask = async (taskId) => {
  try {
    await supabase.from('tasks').delete().eq('id', taskId);
  } catch (err) {
    console.error('Failed to delete task in Supabase:', err);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('matrack_boards_')) {
      const userKey = key.replace('matrack_', '');
      const boards = getLocalData(userKey, []);
      const updated = boards.map((b) => ({
        ...b,
        columns: (b.columns || []).map((col) => ({
          ...col,
          tasks: (col.tasks || []).filter((t) => String(t.id) !== String(taskId)),
        })),
      }));
      setLocalData(userKey, updated);
      break;
    }
  }

  return true;
};

/* ==========================================================================
   USER STATS
   ========================================================================== */

export const getUserStats = async (userId) => {
  if (!userId) {
    return {
      notes_count: 0,
      pinned_notes_count: 0,
      tasks_total: 0,
      tasks_completed: 0,
      tasks_pending: 0,
    };
  }

  try {
    const [notesRes, tasksRes] = await Promise.all([
      supabase.from('notes').select('id, is_pinned, is_trash').eq('user_id', String(userId)),
      supabase.from('tasks').select('id, column_id, columns(name)').eq('user_id', String(userId)),
    ]);

    if (!notesRes.error && !tasksRes.error && notesRes.data && tasksRes.data) {
      const activeNotes = notesRes.data.filter((n) => !n.is_trash);
      const pinnedNotes = activeNotes.filter((n) => n.is_pinned);
      const totalTasks = tasksRes.data.length;
      const completedTasks = tasksRes.data.filter((t) => {
        const colName = t.columns?.name?.toLowerCase() || '';
        return colName.includes('selesai') || colName.includes('done');
      }).length;

      return {
        notes_count: activeNotes.length,
        pinned_notes_count: pinnedNotes.length,
        tasks_total: totalTasks,
        tasks_completed: completedTasks,
        tasks_pending: totalTasks - completedTasks,
      };
    }
  } catch {}

  // Fallback
  const notesKey = `notes_${userId}`;
  const userKey = `boards_${userId}`;
  const notes = getLocalData(notesKey, []).filter((n) => !n.is_trash);
  const pinned = notes.filter((n) => n.is_pinned);
  const boards = getLocalData(userKey, []);

  let totalTasks = 0;
  let completedTasks = 0;

  boards.forEach((b) => {
    (b.columns || []).forEach((c) => {
      totalTasks += (c.tasks || []).length;
      if (
        c.name?.toLowerCase().includes('selesai') ||
        c.name?.toLowerCase().includes('done')
      ) {
        completedTasks += (c.tasks || []).length;
      }
    });
  });

  return {
    notes_count: notes.length,
    pinned_notes_count: pinned.length,
    tasks_total: totalTasks,
    tasks_completed: completedTasks,
    tasks_pending: totalTasks - completedTasks,
  };
};
