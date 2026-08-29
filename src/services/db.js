import { supabase } from './supabase';

/**
 * Initialize starter data for new users (Default Board, Columns, Tasks, Welcome Note)
 */
export const initializeUserData = async (user) => {
  if (!user) return;
  try {
    // Check if user already has boards
    const { data: existingBoards } = await supabase
      .from('boards')
      .select('id')
      .eq('user_id', user.id);

    if (!existingBoards || existingBoards.length === 0) {
      // 1. Create Default Board
      const { data: newBoard } = await supabase
        .from('boards')
        .insert([{ user_id: user.id, name: 'My Schedule Board' }])
        .select()
        .single();

      if (newBoard) {
        // 2. Create Default Columns
        const { data: colTodo } = await supabase
          .from('columns')
          .insert([{ board_id: newBoard.id, name: 'To Do', position: 0 }])
          .select()
          .single();

        const { data: colInProgress } = await supabase
          .from('columns')
          .insert([{ board_id: newBoard.id, name: 'In Progress', position: 1 }])
          .select()
          .single();

        const { data: colDone } = await supabase
          .from('columns')
          .insert([{ board_id: newBoard.id, name: 'Done', position: 2 }])
          .select()
          .single();

        // 3. Create Sample Tasks
        if (colTodo) {
          await supabase.from('tasks').insert([
            {
              column_id: colTodo.id,
              user_id: user.id,
              title: 'Welcome to Matrack Schedule! 📅',
              description: 'Explore the Trello-style kanban board. You can drag cards between columns, set priorities, and track due dates.',
              priority: 'high',
              position: 0,
            },
          ]);
        }

        if (colInProgress) {
          await supabase.from('tasks').insert([
            {
              column_id: colInProgress.id,
              user_id: user.id,
              title: 'Setup personal workspace',
              description: 'Customize folders in Apple Notes and add your upcoming sprint goals.',
              priority: 'medium',
              position: 0,
            },
          ]);
        }

        if (colDone) {
          await supabase.from('tasks').insert([
            {
              column_id: colDone.id,
              user_id: user.id,
              title: 'Account connected to Supabase',
              description: 'Successfully connected client directly to Supabase cloud database.',
              priority: 'low',
              position: 0,
            },
          ]);
        }
      }
    }

    // Check if user has notes
    const { data: existingNotes } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', user.id);

    if (!existingNotes || existingNotes.length === 0) {
      await supabase.from('notes').insert([
        {
          user_id: user.id,
          title: 'Welcome to Matrack Notes 📝',
          content: "# Welcome to Matrack Notes!\n\nThis is your minimalist, Apple Notes-inspired workspace.\n\n### Key Features:\n- **Direct Supabase Integration:** Fast, realtime cloud sync.\n- **Instant Auto-save:** Write freely without worrying about saving.\n- **Pin Important Notes:** Keep critical thoughts pinned to the top.\n- **Odoo Launcher:** Click the 9-dots icon at top-left anytime to switch apps!\n\nHave a productive day!",
          folder: 'Notes',
          is_pinned: true,
          is_archived: false,
          is_trash: false,
        },
      ]);
    }
  } catch (err) {
    console.error('Failed to initialize starter data:', err);
  }
};

/* ==========================================================================
   NOTES CRUD (Apple Notes Module)
   ========================================================================== */

export const getNotes = async (userId, { filter = 'all', folder = 'all', search = '' } = {}) => {
  try {
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (filter === 'trash') {
      query = query.eq('is_trash', true);
    } else {
      query = query.eq('is_trash', false);

      if (filter === 'pinned') {
        query = query.eq('is_pinned', true);
      } else if (filter === 'archived') {
        query = query.eq('is_archived', true);
      } else {
        query = query.eq('is_archived', false);
      }

      if (folder && folder !== 'all') {
        query = query.eq('folder', folder);
      }
    }

    if (search.trim()) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    query = query
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    const { data: notes, error } = await query;
    if (error) throw error;

    // Get folders
    const { data: allUserNotes } = await supabase
      .from('notes')
      .select('folder')
      .eq('user_id', userId)
      .eq('is_trash', false);

    const folders = Array.from(
      new Set(allUserNotes?.map((n) => n.folder).filter(Boolean) || ['Notes'])
    );

    return { notes: notes || [], folders };
  } catch (err) {
    console.error('getNotes error:', err);
    return { notes: [], folders: ['Notes'] };
  }
};

export const createNote = async (userId, noteData) => {
  const { data, error } = await supabase
    .from('notes')
    .insert([
      {
        user_id: userId,
        title: noteData.title || 'New Note',
        content: noteData.content || '',
        folder: noteData.folder || 'Notes',
        is_pinned: noteData.is_pinned || false,
        is_archived: false,
        is_trash: false,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateNote = async (noteId, noteData) => {
  const { data, error } = await supabase
    .from('notes')
    .update({
      ...noteData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const togglePinNote = async (noteId, currentPinned) => {
  const { data, error } = await supabase
    .from('notes')
    .update({
      is_pinned: !currentPinned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteNote = async (noteId, isTrash) => {
  if (isTrash) {
    // Permanent delete
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) throw error;
    return true;
  } else {
    // Move to trash
    const { data, error } = await supabase
      .from('notes')
      .update({
        is_trash: true,
        is_pinned: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const restoreNote = async (noteId) => {
  const { data, error } = await supabase
    .from('notes')
    .update({
      is_trash: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data;
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
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!boards || boards.length === 0) {
      // Auto-initialize
      await initializeUserData({ id: userId });
      const { data: refreshed } = await supabase
        .from('boards')
        .select(`
          *,
          columns (
            *,
            tasks (*)
          )
        `)
        .eq('user_id', userId);
      return refreshed || [];
    }

    // Sort columns & tasks by position
    const sorted = boards.map((b) => ({
      ...b,
      columns: (b.columns || [])
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((col) => ({
          ...col,
          tasks: (col.tasks || []).sort((a, b) => (a.position || 0) - (b.position || 0)),
        })),
    }));

    return sorted;
  } catch (err) {
    console.error('getBoards error:', err);
    return [];
  }
};

export const createColumn = async (boardId, name, position) => {
  const { data, error } = await supabase
    .from('columns')
    .insert([{ board_id: boardId, name, position }])
    .select('*, tasks(*)')
    .single();

  if (error) throw error;
  return { ...data, tasks: [] };
};

export const updateColumn = async (columnId, name) => {
  const { data, error } = await supabase
    .from('columns')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', columnId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteColumn = async (columnId) => {
  const { error } = await supabase.from('columns').delete().eq('id', columnId);
  if (error) throw error;
  return true;
};

export const createTask = async (taskData) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        ...taskData,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTask = async (taskId, taskData) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...taskData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const moveTask = async (taskId, targetColumnId, targetPosition) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      column_id: targetColumnId,
      position: targetPosition,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTask = async (taskId) => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
  return true;
};

/* ==========================================================================
   USER STATS
   ========================================================================== */

export const getUserStats = async (userId) => {
  try {
    const { count: notesCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_trash', false);

    const { count: pinnedNotesCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_pinned', true)
      .eq('is_trash', false);

    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      notes_count: notesCount || 0,
      pinned_notes_count: pinnedNotesCount || 0,
      tasks_total: totalTasks || 0,
      tasks_completed: 0,
      tasks_pending: totalTasks || 0,
    };
  } catch (err) {
    return {
      notes_count: 0,
      pinned_notes_count: 0,
      tasks_total: 0,
      tasks_completed: 0,
      tasks_pending: 0,
    };
  }
};
