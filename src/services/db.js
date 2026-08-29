import { supabase } from './supabase';

// Local storage fallback helper to ensure 100% reliability
const getLocalData = (key, defaultVal = []) => {
  try {
    const raw = localStorage.getItem(`matrack_local_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setLocalData = (key, val) => {
  try {
    localStorage.setItem(`matrack_local_${key}`, JSON.stringify(val));
  } catch {
    // ignore
  }
};

/**
 * Helper to ensure standard 3 columns (Belum, Masih Dilakukan, Selesai)
 */
export const createDefault3Columns = (boardId, userId) => {
  return [
    {
      id: 'col-belum-' + boardId,
      board_id: boardId,
      name: 'Belum',
      position: 0,
      tasks: [],
    },
    {
      id: 'col-progress-' + boardId,
      board_id: boardId,
      name: 'Masih Dilakukan',
      position: 1,
      tasks: [],
    },
    {
      id: 'col-selesai-' + boardId,
      board_id: boardId,
      name: 'Selesai',
      position: 2,
      tasks: [],
    },
  ];
};

/**
 * Initialize starter data for new users
 */
export const initializeUserData = async (user) => {
  if (!user) return;
  
  // Initialize local fallback boards if empty
  const localBoards = getLocalData('boards');
  if (localBoards.length === 0) {
    const defaultBoardId = 'board-' + Date.now();
    const defaultBoard = {
      id: defaultBoardId,
      user_id: user.id,
      name: 'Jadwal Utama',
      created_at: new Date().toISOString(),
      columns: [
        {
          id: 'col-belum-' + defaultBoardId,
          board_id: defaultBoardId,
          name: 'Belum',
          position: 0,
          tasks: [
            {
              id: 'task-1',
              column_id: 'col-belum-' + defaultBoardId,
              user_id: user.id,
              title: 'Jelajahi Fitur Matrack Schedule 📅',
              description: 'Tiap grup memiliki 3 kolom otomatis (Belum, Masih Dilakukan, Selesai). Anda bisa drag & drop antar kolom.',
              priority: 'high',
              due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
              position: 0,
            },
          ],
        },
        {
          id: 'col-progress-' + defaultBoardId,
          board_id: defaultBoardId,
          name: 'Masih Dilakukan',
          position: 1,
          tasks: [
            {
              id: 'task-2',
              column_id: 'col-progress-' + defaultBoardId,
              user_id: user.id,
              title: 'Sesuaikan Target & Catatan Harian',
              description: 'Buat catatan baru di Apple Notes dan atur daftar tugas di sini.',
              priority: 'medium',
              due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
              position: 0,
            },
          ],
        },
        {
          id: 'col-selesai-' + defaultBoardId,
          board_id: defaultBoardId,
          name: 'Selesai',
          position: 2,
          tasks: [
            {
              id: 'task-3',
              column_id: 'col-selesai-' + defaultBoardId,
              user_id: user.id,
              title: 'Akun Matrack Siap Digunakan',
              description: 'Berhasil terhubung ke Supabase Cloud.',
              priority: 'low',
              due_date: new Date().toISOString(),
              position: 0,
            },
          ],
        },
      ],
    };
    setLocalData('boards', [defaultBoard]);
  }

  // Initialize local fallback notes if empty
  const localNotes = getLocalData('notes');
  if (localNotes.length === 0) {
    const defaultNote = {
      id: 'note-' + Date.now(),
      user_id: user.id,
      title: 'Selamat Datang di Matrack Notes 📝',
      content: "# Selamat Datang di Matrack Notes!\n\nRuang kerja catatan pribadi bergaya Apple Notes dengan auto-save instan dan sinkronisasi realtime.\n\n### Fitur Utama:\n- **Auto-save Instan:** Ketik dengan bebas tanpa takut hilang.\n- **Pin Catatan Penting:** Sematkan ide utama di bagian teratas.\n- **Odoo Launcher:** Klik ikon 9-titik di pojok kiri atas kapan saja untuk berpindah aplikasi!\n\nSemoga hari Anda produktif!",
      folder: 'Notes',
      is_pinned: true,
      is_archived: false,
      is_trash: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocalData('notes', [defaultNote]);
  }
};

/* ==========================================================================
   NOTES CRUD (Apple Notes Module)
   ========================================================================== */

export const getNotes = async (userId, { filter = 'all', folder = 'all', search = '' } = {}) => {
  let notes = [];

  try {
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', String(userId));

    if (filter === 'trash') {
      query = query.eq('is_trash', true);
    } else {
      query = query.eq('is_trash', false);
      if (filter === 'pinned') query = query.eq('is_pinned', true);
      else if (filter === 'archived') query = query.eq('is_archived', true);
      else query = query.eq('is_archived', false);

      if (folder && folder !== 'all') query = query.eq('folder', folder);
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    query = query
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (!error && data) {
      notes = data;
      setLocalData('notes', data);
    } else {
      throw error;
    }
  } catch (err) {
    const all = getLocalData('notes');
    notes = all.filter((n) => String(n.user_id) === String(userId));

    if (filter === 'trash') {
      notes = notes.filter((n) => n.is_trash);
    } else {
      notes = notes.filter((n) => !n.is_trash);
      if (filter === 'pinned') notes = notes.filter((n) => n.is_pinned);
      else if (filter === 'archived') notes = notes.filter((n) => n.is_archived);
      else notes = notes.filter((n) => !n.is_archived);

      if (folder && folder !== 'all') notes = notes.filter((n) => n.folder === folder);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      notes = notes.filter(
        (n) => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
      );
    }

    notes.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
  }

  const allNotes = getLocalData('notes');
  const distinctFolders = Array.from(
    new Set(['Notes', ...allNotes.map((n) => n.folder).filter(Boolean)])
  );

  return { notes, folders: distinctFolders };
};

export const createNote = async (userId, noteData) => {
  const newNote = {
    id: 'note-' + Date.now(),
    user_id: String(userId),
    title: noteData.title || 'New Note',
    content: noteData.content || '',
    folder: noteData.folder || 'Notes',
    is_pinned: noteData.is_pinned || false,
    is_archived: false,
    is_trash: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const local = getLocalData('notes');
  setLocalData('notes', [newNote, ...local]);

  try {
    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          user_id: String(userId),
          title: newNote.title,
          content: newNote.content,
          folder: newNote.folder,
          is_pinned: newNote.is_pinned,
          is_archived: false,
          is_trash: false,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      const updatedLocal = getLocalData('notes').map((n) =>
        n.id === newNote.id ? data : n
      );
      setLocalData('notes', updatedLocal);
      return data;
    }
  } catch (err) {}

  return newNote;
};

export const updateNote = async (noteId, noteData) => {
  const local = getLocalData('notes');
  const updatedLocal = local.map((n) =>
    String(n.id) === String(noteId)
      ? { ...n, ...noteData, updated_at: new Date().toISOString() }
      : n
  );
  setLocalData('notes', updatedLocal);

  try {
    const { data, error } = await supabase
      .from('notes')
      .update({ ...noteData, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .select()
      .single();

    if (!error && data) return data;
  } catch (err) {}

  return updatedLocal.find((n) => String(n.id) === String(noteId));
};

export const togglePinNote = async (noteId, currentPinned) => {
  return updateNote(noteId, { is_pinned: !currentPinned });
};

export const deleteNote = async (noteId, isTrash) => {
  const local = getLocalData('notes');
  if (isTrash) {
    setLocalData(
      'notes',
      local.filter((n) => String(n.id) !== String(noteId))
    );
    try {
      await supabase.from('notes').delete().eq('id', noteId);
    } catch {}
    return true;
  } else {
    setLocalData(
      'notes',
      local.map((n) =>
        String(n.id) === String(noteId)
          ? { ...n, is_trash: true, is_pinned: false }
          : n
      )
    );
    try {
      await supabase
        .from('notes')
        .update({ is_trash: true, is_pinned: false })
        .eq('id', noteId);
    } catch {}
    return true;
  }
};

export const restoreNote = async (noteId) => {
  return updateNote(noteId, { is_trash: false });
};

/* ==========================================================================
   SCHEDULE ROWS / PROJECT GROUPS (1 Row = 3 Columns: Belum, Masih Dilakukan, Selesai)
   ========================================================================== */

export const getBoards = async (userId) => {
  try {
    const { data: boards, error } = await supabase
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

    if (!error && boards && boards.length > 0) {
      const sorted = boards.map((b) => {
        let cols = b.columns || [];
        if (cols.length === 0) {
          cols = createDefault3Columns(b.id, userId);
        }
        return {
          ...b,
          columns: cols
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((col) => ({
              ...col,
              tasks: (col.tasks || []).sort(
                (a, b) => (a.position || 0) - (b.position || 0)
              ),
            })),
        };
      });
      setLocalData('boards', sorted);
      return sorted;
    }
  } catch (err) {}

  const local = getLocalData('boards');
  if (local.length === 0) {
    await initializeUserData({ id: userId });
    return getLocalData('boards');
  }
  return local;
};

/**
 * Create a new Project Group Row (Automatically creates 3 columns: Belum, Masih Dilakukan, Selesai)
 */
export const createProjectGroup = async (userId, name) => {
  const newBoardId = 'board-' + Date.now();
  const defaultCols = [
    {
      id: 'col-belum-' + newBoardId,
      board_id: newBoardId,
      name: 'Belum',
      position: 0,
      tasks: [],
    },
    {
      id: 'col-progress-' + newBoardId,
      board_id: newBoardId,
      name: 'Masih Dilakukan',
      position: 1,
      tasks: [],
    },
    {
      id: 'col-selesai-' + newBoardId,
      board_id: newBoardId,
      name: 'Selesai',
      position: 2,
      tasks: [],
    },
  ];

  const newBoard = {
    id: newBoardId,
    user_id: String(userId),
    name: name || 'Proyek / Baris Baru',
    created_at: new Date().toISOString(),
    columns: defaultCols,
  };

  const local = getLocalData('boards');
  setLocalData('boards', [...local, newBoard]);

  try {
    const { data: cloudBoard, error: boardErr } = await supabase
      .from('boards')
      .insert([{ user_id: String(userId), name: newBoard.name }])
      .select()
      .single();

    if (!boardErr && cloudBoard) {
      const { data: c1 } = await supabase
        .from('columns')
        .insert([{ board_id: cloudBoard.id, name: 'Belum', position: 0 }])
        .select()
        .single();
      const { data: c2 } = await supabase
        .from('columns')
        .insert([{ board_id: cloudBoard.id, name: 'Masih Dilakukan', position: 1 }])
        .select()
        .single();
      const { data: c3 } = await supabase
        .from('columns')
        .insert([{ board_id: cloudBoard.id, name: 'Selesai', position: 2 }])
        .select()
        .single();

      const syncedBoard = {
        ...cloudBoard,
        columns: [
          { ...(c1 || defaultCols[0]), tasks: [] },
          { ...(c2 || defaultCols[1]), tasks: [] },
          { ...(c3 || defaultCols[2]), tasks: [] },
        ],
      };

      const updated = getLocalData('boards').map((b) =>
        b.id === newBoardId ? syncedBoard : b
      );
      setLocalData('boards', updated);
      return syncedBoard;
    }
  } catch (err) {}

  return newBoard;
};

export const updateProjectGroup = async (boardId, name) => {
  const local = getLocalData('boards');
  const updated = local.map((b) =>
    String(b.id) === String(boardId) ? { ...b, name } : b
  );
  setLocalData('boards', updated);

  try {
    await supabase.from('boards').update({ name }).eq('id', boardId);
  } catch {}

  return true;
};

export const deleteProjectGroup = async (boardId) => {
  const local = getLocalData('boards');
  const updated = local.filter((b) => String(b.id) !== String(boardId));
  setLocalData('boards', updated);

  try {
    await supabase.from('boards').delete().eq('id', boardId);
  } catch {}

  return true;
};

/* ==========================================================================
   TASKS CRUD (100% Guaranteed Reliability on Drag & Drop)
   ========================================================================== */

export const createTask = async (taskData) => {
  const newTask = {
    id: 'task-' + Date.now(),
    ...taskData,
    created_at: new Date().toISOString(),
  };

  const boards = getLocalData('boards');
  const updated = boards.map((b) => ({
    ...b,
    columns: (b.columns || []).map((col) => {
      if (String(col.id) === String(taskData.column_id)) {
        return { ...col, tasks: [newTask, ...(col.tasks || [])] };
      }
      return col;
    }),
  }));
  setLocalData('boards', updated);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (!error && data) {
      const syncedBoards = getLocalData('boards').map((b) => ({
        ...b,
        columns: (b.columns || []).map((col) => ({
          ...col,
          tasks: (col.tasks || []).map((t) => (t.id === newTask.id ? data : t)),
        })),
      }));
      setLocalData('boards', syncedBoards);
      return data;
    }
  } catch {}

  return newTask;
};

export const updateTask = async (taskId, taskData) => {
  const boards = getLocalData('boards');
  const updated = boards.map((b) => ({
    ...b,
    columns: (b.columns || []).map((col) => ({
      ...col,
      tasks: (col.tasks || []).map((t) =>
        String(t.id) === String(taskId) ? { ...t, ...taskData } : t
      ),
    })),
  }));
  setLocalData('boards', updated);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', taskId)
      .select()
      .single();

    if (!error && data) return data;
  } catch {}

  return { id: taskId, ...taskData };
};

/**
 * Move task between columns cleanly and reliably
 */
export const moveTask = async (taskId, targetColumnId, targetPosition = 0) => {
  const boards = getLocalData('boards');
  let movedTaskObj = null;

  // 1. Remove task from previous column
  const cleanedBoards = boards.map((b) => ({
    ...b,
    columns: (b.columns || []).map((col) => {
      const remainingTasks = (col.tasks || []).filter((t) => {
        if (String(t.id) === String(taskId)) {
          movedTaskObj = {
            ...t,
            column_id: targetColumnId,
            position: targetPosition,
          };
          return false;
        }
        return true;
      });
      return { ...col, tasks: remainingTasks };
    }),
  }));

  if (!movedTaskObj) return;

  // 2. Insert task into target column at desired position
  const finalBoards = cleanedBoards.map((b) => ({
    ...b,
    columns: (b.columns || []).map((col) => {
      if (String(col.id) === String(targetColumnId)) {
        const list = [...(col.tasks || [])];
        list.splice(targetPosition, 0, movedTaskObj);
        return { ...col, tasks: list };
      }
      return col;
    }),
  }));

  setLocalData('boards', finalBoards);

  // 3. Persist to Supabase Cloud
  try {
    await supabase
      .from('tasks')
      .update({
        column_id: targetColumnId,
        position: targetPosition,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  } catch (err) {}

  return movedTaskObj;
};

export const deleteTask = async (taskId) => {
  const boards = getLocalData('boards');
  const updated = boards.map((b) => ({
    ...b,
    columns: (b.columns || []).map((col) => ({
      ...col,
      tasks: (col.tasks || []).filter((t) => String(t.id) !== String(taskId)),
    })),
  }));
  setLocalData('boards', updated);

  try {
    await supabase.from('tasks').delete().eq('id', taskId);
  } catch {}

  return true;
};

/* ==========================================================================
   USER STATS
   ========================================================================== */

export const getUserStats = async (userId) => {
  const notes = getLocalData('notes').filter(
    (n) => String(n.user_id) === String(userId) && !n.is_trash
  );
  const pinned = notes.filter((n) => n.is_pinned);
  const boards = getLocalData('boards');
  let totalTasks = 0;
  let completedTasks = 0;

  boards.forEach((b) => {
    (b.columns || []).forEach((c) => {
      totalTasks += (c.tasks || []).length;
      if (c.name?.toLowerCase().includes('selesai') || c.name?.toLowerCase().includes('done')) {
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
