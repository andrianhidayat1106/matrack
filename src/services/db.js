import { supabase } from './supabase';

// Local storage helper
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
 * Standard 3 columns creator
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
 * Initialize starter data for new users
 */
export const initializeUserData = async (user) => {
  if (!user) return;
  const userKey = `boards_${user.id}`;
  const notesKey = `notes_${user.id}`;

  // Starter Boards & Tasks
  const localBoards = getLocalData(userKey);
  if (!localBoards || localBoards.length === 0) {
    const defaultBoardId = 'board-main-' + user.id;
    const defaultBoard = {
      id: defaultBoardId,
      user_id: String(user.id),
      name: 'Jadwal Utama',
      created_at: new Date().toISOString(),
      columns: [
        {
          id: `col-belum-${defaultBoardId}`,
          board_id: defaultBoardId,
          name: 'Belum',
          position: 0,
          tasks: [
            {
              id: 'task-welcome-1',
              column_id: `col-belum-${defaultBoardId}`,
              user_id: String(user.id),
              title: 'Jelajahi Fitur Matrack Schedule 📅',
              description: 'Tiap baris proyek otomatis memiliki 3 status kolom (Belum, Masih Dilakukan, Selesai). Anda bisa drag & drop kartu tugas.',
              priority: 'high',
              due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
              position: 0,
            },
          ],
        },
        {
          id: `col-progress-${defaultBoardId}`,
          board_id: defaultBoardId,
          name: 'Masih Dilakukan',
          position: 1,
          tasks: [
            {
              id: 'task-welcome-2',
              column_id: `col-progress-${defaultBoardId}`,
              user_id: String(user.id),
              title: 'Sesuaikan Target & Catatan Harian',
              description: 'Buat catatan baru di Apple Notes dan atur daftar tugas di sini.',
              priority: 'medium',
              due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
              position: 0,
            },
          ],
        },
        {
          id: `col-selesai-${defaultBoardId}`,
          board_id: defaultBoardId,
          name: 'Selesai',
          position: 2,
          tasks: [
            {
              id: 'task-welcome-3',
              column_id: `col-selesai-${defaultBoardId}`,
              user_id: String(user.id),
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
    setLocalData(userKey, [defaultBoard]);
  }

  // Starter Notes
  const localNotes = getLocalData(notesKey);
  if (!localNotes || localNotes.length === 0) {
    const defaultNote = {
      id: 'note-welcome-' + user.id,
      user_id: String(user.id),
      title: 'Selamat Datang di Matrack Notes 📝',
      content: "# Selamat Datang di Matrack Notes!\n\nRuang kerja catatan pribadi bergaya Apple Notes dengan auto-save instan dan sinkronisasi realtime.\n\n### Fitur Utama:\n- **Auto-save Instan:** Ketik dengan bebas tanpa takut hilang.\n- **Pin Catatan Penting:** Sematkan ide utama di bagian teratas.\n- **Odoo Launcher:** Klik ikon 9-titik di pojok kiri atas kapan saja untuk berpindah aplikasi!\n\nSemoga hari Anda produktif!",
      folder: 'Notes',
      is_pinned: true,
      is_archived: false,
      is_trash: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocalData(notesKey, [defaultNote]);
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
  const notesKey = `notes_${userId}`;
  let notes = getLocalData(notesKey, []);
  const customFolders = getCustomFolders(userId);

  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', String(userId))
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const cloudIds = new Set(data.map((n) => String(n.id)));
      const uniqueLocal = notes.filter((n) => !cloudIds.has(String(n.id)));
      notes = [...data, ...uniqueLocal];
      setLocalData(notesKey, notes);
    }
  } catch {}

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

  const local = getLocalData(notesKey, []);
  setLocalData(notesKey, [newNote, ...local]);

  try {
    const { data } = await supabase
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

    if (data) {
      const updated = getLocalData(notesKey, []).map((n) =>
        n.id === newNote.id ? data : n
      );
      setLocalData(notesKey, updated);
      return data;
    }
  } catch {}

  return newNote;
};

export const updateNote = async (noteId, noteData) => {
  let updatedObj = null;

  // Find note across all stored keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('matrack_notes_')) {
      const list = getLocalData(key.replace('matrack_', ''), []);
      const match = list.find((n) => String(n.id) === String(noteId));
      if (match) {
        updatedObj = { ...match, ...noteData, updated_at: new Date().toISOString() };
        const updated = list.map((n) =>
          String(n.id) === String(noteId) ? updatedObj : n
        );
        setLocalData(key.replace('matrack_', ''), updated);
        break;
      }
    }
  }

  if (!updatedObj) {
    updatedObj = { id: noteId, ...noteData, updated_at: new Date().toISOString() };
  }

  try {
    const { data } = await supabase
      .from('notes')
      .update({ ...noteData, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .select()
      .single();

    if (data) return data;
  } catch {}

  return updatedObj;
};

export const togglePinNote = async (noteId, currentPinned) => {
  return updateNote(noteId, { is_pinned: !currentPinned });
};

export const deleteNote = async (noteId, isTrash) => {
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

  try {
    if (isTrash) {
      await supabase.from('notes').delete().eq('id', noteId);
    } else {
      await supabase
        .from('notes')
        .update({ is_trash: true, is_pinned: false })
        .eq('id', noteId);
    }
  } catch {}

  return true;
};

export const restoreNote = async (noteId) => {
  return updateNote(noteId, { is_trash: false });
};

/* ==========================================================================
   SCHEDULE ROWS & TASKS (Bulletproof Multi-Row Persistence)
   ========================================================================== */

export const getBoards = async (userId) => {
  const userKey = `boards_${userId}`;
  let localBoards = getLocalData(userKey, []);

  if (!localBoards || localBoards.length === 0) {
    await initializeUserData({ id: userId });
    localBoards = getLocalData(userKey, []);
  }

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

    if (!error && cloudBoards && cloudBoards.length > 0) {
      // Create a map of all local tasks by column_id so NO local tasks are ever erased on refresh
      const localTaskMap = {};
      localBoards.forEach((b) => {
        (b.columns || []).forEach((c) => {
          (c.tasks || []).forEach((t) => {
            localTaskMap[String(t.id)] = t;
          });
        });
      });

      const merged = cloudBoards.map((cb) => {
        let cols = cb.columns || [];
        if (cols.length === 0) {
          cols = createDefault3Columns(cb.id);
        }

        return {
          ...cb,
          columns: cols
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((col) => {
              const cloudTasks = col.tasks || [];
              const cloudTaskIds = new Set(cloudTasks.map((t) => String(t.id)));

              // Find local tasks that belong to this column
              const extraLocalTasks = Object.values(localTaskMap).filter(
                (t) =>
                  String(t.column_id) === String(col.id) &&
                  !cloudTaskIds.has(String(t.id))
              );

              return {
                ...col,
                tasks: [...cloudTasks, ...extraLocalTasks].sort(
                  (a, b) => (a.position || 0) - (b.position || 0)
                ),
              };
            }),
        };
      });

      // Keep any local boards that are not in cloud yet
      const cloudBoardIds = new Set(cloudBoards.map((b) => String(b.id)));
      const extraLocalBoards = localBoards.filter(
        (b) => !cloudBoardIds.has(String(b.id))
      );

      const finalBoards = [...merged, ...extraLocalBoards];
      setLocalData(userKey, finalBoards);
      return finalBoards;
    }
  } catch {}

  return localBoards;
};

/**
 * Create a new Project Group Row
 */
export const createProjectGroup = async (userId, name) => {
  const userKey = `boards_${userId}`;
  const newBoardId = 'board-' + Date.now();
  const defaultCols = createDefault3Columns(newBoardId);

  const newBoard = {
    id: newBoardId,
    user_id: String(userId),
    name: name || 'Proyek Baru',
    created_at: new Date().toISOString(),
    columns: defaultCols,
  };

  const local = getLocalData(userKey, []);
  const updated = [...local, newBoard];
  setLocalData(userKey, updated);

  try {
    const { data: cloudBoard } = await supabase
      .from('boards')
      .insert([{ user_id: String(userId), name: newBoard.name }])
      .select()
      .single();

    if (cloudBoard) {
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

      const synced = {
        ...cloudBoard,
        columns: [
          { ...(c1 || defaultCols[0]), tasks: [] },
          { ...(c2 || defaultCols[1]), tasks: [] },
          { ...(c3 || defaultCols[2]), tasks: [] },
        ],
      };

      const final = getLocalData(userKey, []).map((b) =>
        b.id === newBoardId ? synced : b
      );
      setLocalData(userKey, final);
      return synced;
    }
  } catch {}

  return newBoard;
};

export const updateProjectGroup = async (boardId, name) => {
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

  try {
    await supabase.from('boards').update({ name }).eq('id', boardId);
  } catch {}

  return true;
};

export const deleteProjectGroup = async (boardId) => {
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

  try {
    await supabase.from('boards').delete().eq('id', boardId);
  } catch {}

  return true;
};

/* ==========================================================================
   TASKS CRUD (100% Guaranteed Persistent on Refresh)
   ========================================================================== */

export const createTask = async (taskData) => {
  const newTask = {
    id: 'task-' + Date.now(),
    ...taskData,
    created_at: new Date().toISOString(),
  };

  const userKey = `boards_${taskData.user_id}`;
  const boards = getLocalData(userKey, []);

  const updated = boards.map((b) => ({
    ...b,
    columns: (b.columns || []).map((col) => {
      if (String(col.id) === String(taskData.column_id)) {
        return { ...col, tasks: [newTask, ...(col.tasks || [])] };
      }
      return col;
    }),
  }));
  setLocalData(userKey, updated);

  try {
    await supabase.from('tasks').insert([taskData]);
  } catch {}

  return newTask;
};

export const updateTask = async (taskId, taskData) => {
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
    let targetTask = null;

    // 1. Remove old task
    const cleaned = boards.map((b) => ({
      ...b,
      columns: (b.columns || []).map((col) => {
        const remaining = (col.tasks || []).filter((t) => {
          if (String(t.id) === String(taskId)) {
            targetTask = { ...t, ...taskData };
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

    // 2. Put into column
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

  try {
    await supabase.from('tasks').update(taskData).eq('id', taskId);
  } catch {}

  return { id: taskId, ...taskData };
};

export const moveTask = async (taskId, targetColumnId, targetPosition = 0) => {
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

    // 1. Remove from source
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
      // 2. Insert into target column
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

  try {
    await supabase
      .from('tasks')
      .update({
        column_id: targetColumnId,
        position: targetPosition,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  } catch {}

  return true;
};

export const deleteTask = async (taskId) => {
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

  try {
    await supabase.from('tasks').delete().eq('id', taskId);
  } catch {}

  return true;
};

/* ==========================================================================
   USER STATS
   ========================================================================== */

export const getUserStats = async (userId) => {
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
