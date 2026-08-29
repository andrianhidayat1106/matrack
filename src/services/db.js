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
 * Initialize starter data for new users
 */
export const initializeUserData = async (user) => {
  if (!user) return;
  
  // Initialize local fallback boards if empty
  const localBoards = getLocalData('boards');
  if (localBoards.length === 0) {
    const defaultBoard = {
      id: 'board-' + Date.now(),
      user_id: user.id,
      name: 'My Schedule Board',
      created_at: new Date().toISOString(),
      columns: [
        {
          id: 'col-1',
          name: 'To Do',
          position: 0,
          tasks: [
            {
              id: 'task-1',
              column_id: 'col-1',
              user_id: user.id,
              title: 'Welcome to Matrack Schedule! 📅',
              description: 'Explore the Trello-style kanban board. You can drag cards between columns, set priorities, and track due dates.',
              priority: 'high',
              due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
              position: 0,
            },
          ],
        },
        {
          id: 'col-2',
          name: 'In Progress',
          position: 1,
          tasks: [
            {
              id: 'task-2',
              column_id: 'col-2',
              user_id: user.id,
              title: 'Setup personal workspace',
              description: 'Customize folders in Apple Notes and add your upcoming sprint goals.',
              priority: 'medium',
              due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
              position: 0,
            },
          ],
        },
        {
          id: 'col-3',
          name: 'Done',
          position: 2,
          tasks: [
            {
              id: 'task-3',
              column_id: 'col-3',
              user_id: user.id,
              title: 'Account connected to Supabase',
              description: 'Successfully initialized client with Supabase cloud database.',
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
      title: 'Welcome to Matrack Notes 📝',
      content: "# Welcome to Matrack Notes!\n\nThis is your minimalist, Apple Notes-inspired workspace.\n\n### Key Features:\n- **Direct Supabase Integration:** Fast, realtime cloud sync.\n- **Instant Auto-save:** Write freely without worrying about saving.\n- **Pin Important Notes:** Keep critical thoughts pinned to the top.\n- **Odoo Launcher:** Click the 9-dots icon at top-left anytime to switch apps!\n\nHave a productive day!",
      folder: 'Notes',
      is_pinned: true,
      is_archived: false,
      is_trash: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocalData('notes', [defaultNote]);
  }

  // Try initializing Supabase Cloud in background
  try {
    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', String(user.id))
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from('notes').insert([
        {
          user_id: String(user.id),
          title: 'Welcome to Matrack Notes 📝',
          content: "# Welcome to Matrack Notes!\n\nThis is your minimalist, Apple Notes-inspired workspace.\n\n### Key Features:\n- **Direct Supabase Integration:** Fast, realtime cloud sync.\n- **Instant Auto-save:** Write freely without worrying about saving.\n- **Pin Important Notes:** Keep critical thoughts pinned to the top.\n- **Odoo Launcher:** Click the 9-dots icon at top-left anytime to switch apps!\n\nHave a productive day!",
          folder: 'Notes',
          is_pinned: true,
          is_archived: false,
          is_trash: false,
        },
      ]);
    }
  } catch (e) {
    // Silent cloud error
  }
};

/* ==========================================================================
   NOTES CRUD (Apple Notes Module)
   ========================================================================== */

export const getNotes = async (userId, { filter = 'all', folder = 'all', search = '' } = {}) => {
  let notes = [];
  let folders = ['Notes'];

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
    // Fallback to local storage
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

  // Save to local storage first (instant responsiveness)
  const local = getLocalData('notes');
  setLocalData('notes', [newNote, ...local]);

  // Sync to Supabase
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
      // Replace local placeholder id with Supabase id
      const updatedLocal = getLocalData('notes').map((n) =>
        n.id === newNote.id ? data : n
      );
      setLocalData('notes', updatedLocal);
      return data;
    }
  } catch (err) {
    console.warn('Supabase sync error (using local storage):', err);
  }

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
  } catch (err) {
    // ignore
  }

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
   KANBAN BOARDS & TASKS CRUD (Trello Schedule Module)
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
      const sorted = boards.map((b) => ({
        ...b,
        columns: (b.columns || [])
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map((col) => ({
            ...col,
            tasks: (col.tasks || []).sort(
              (a, b) => (a.position || 0) - (b.position || 0)
            ),
          })),
      }));
      setLocalData('boards', sorted);
      return sorted;
    }
  } catch (err) {
    // fallback
  }

  return getLocalData('boards');
};

export const createColumn = async (boardId, name, position) => {
  const newCol = {
    id: 'col-' + Date.now(),
    board_id: boardId,
    name,
    position,
    tasks: [],
  };

  const boards = getLocalData('boards');
  const updatedBoards = boards.map((b) => {
    if (String(b.id) === String(boardId)) {
      return { ...b, columns: [...(b.columns || []), newCol] };
    }
    return b;
  });
  setLocalData('boards', updatedBoards);

  try {
    const { data, error } = await supabase
      .from('columns')
      .insert([{ board_id: boardId, name, position }])
      .select('*, tasks(*)')
      .single();

    if (!error && data) return { ...data, tasks: [] };
  } catch {}

  return newCol;
};

export const updateColumn = async (columnId, name) => {
  const boards = getLocalData('boards');
  const updated = boards.map((b) => ({
    ...b,
    columns: (b.columns || []).map((c) =>
      String(c.id) === String(columnId) ? { ...c, name } : c
    ),
  }));
  setLocalData('boards', updated);

  try {
    await supabase.from('columns').update({ name }).eq('id', columnId);
  } catch {}

  return true;
};

export const deleteColumn = async (columnId) => {
  const boards = getLocalData('boards');
  const updated = boards.map((b) => ({
    ...b,
    columns: (b.columns || []).filter((c) => String(c.id) !== String(columnId)),
  }));
  setLocalData('boards', updated);

  try {
    await supabase.from('columns').delete().eq('id', columnId);
  } catch {}

  return true;
};

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
        return { ...col, tasks: [...(col.tasks || []), newTask] };
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

    if (!error && data) return data;
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

export const moveTask = async (taskId, targetColumnId, targetPosition) => {
  return updateTask(taskId, {
    column_id: targetColumnId,
    position: targetPosition,
  });
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
  boards.forEach((b) => {
    (b.columns || []).forEach((c) => {
      totalTasks += (c.tasks || []).length;
    });
  });

  return {
    notes_count: notes.length,
    pinned_notes_count: pinned.length,
    tasks_total: totalTasks,
    tasks_completed: 0,
    tasks_pending: totalTasks,
  };
};
