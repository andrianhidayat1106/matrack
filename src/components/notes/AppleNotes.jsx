import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Pin, 
  PinOff, 
  Trash2, 
  Folder, 
  FolderPlus, 
  Archive, 
  RefreshCw, 
  Clock, 
  Sparkles,
  CheckCircle2,
  FileText,
  FileEdit,
  Trash,
  ChevronRight,
  RotateCcw,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Heading1,
  Heading2,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { 
  getNotes, 
  createNote, 
  updateNote, 
  togglePinNote, 
  deleteNote, 
  restoreNote,
  saveCustomFolder 
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';

export const AppleNotes = () => {
  const { user, refreshUserStats } = useAuth();
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState(['Notes']);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pinned', 'archived', 'trash'
  const [activeFolder, setActiveFolder] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Editor states
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorFolder, setEditorFolder] = useState('Notes');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'
  const [copied, setCopied] = useState(false);

  // New folder input state
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  const saveTimeoutRef = useRef(null);

  // Fetch notes
  const fetchNotes = async (selectFirst = false) => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await getNotes(user.id, {
        filter: activeFilter,
        folder: activeFolder,
        search: searchQuery,
      });

      setNotes(res.notes);
      if (res.folders && res.folders.length > 0) {
        const unique = Array.from(new Set(['Notes', ...res.folders]));
        setFolders(unique);
      }

      if (selectFirst && res.notes.length > 0) {
        selectNote(res.notes[0]);
      } else if (res.notes.length === 0) {
        setSelectedNoteId(null);
        setEditorTitle('');
        setEditorContent('');
      }
    } catch (err) {
      console.error('Failed to fetch notes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(true);
  }, [activeFilter, activeFolder, user]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchNotes(false);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Select note into editor
  const selectNote = (note) => {
    if (!note) return;
    setSelectedNoteId(note.id);
    setEditorTitle(note.title || '');
    setEditorContent(note.content || '');
    setEditorFolder(note.folder || 'Notes');
    setSaveStatus('saved');
  };

  // Currently selected note object
  const currentNote = notes.find((n) => n.id === selectedNoteId);

  // Auto-save logic (debounced)
  const triggerAutoSave = (newTitle, newContent, newFolder) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (!selectedNoteId) return;
      try {
        const updated = await updateNote(selectedNoteId, {
          title: newTitle || 'Untitled Note',
          content: newContent,
          folder: newFolder,
        });

        if (updated) {
          setNotes((prev) =>
            prev.map((item) => (item.id === selectedNoteId ? updated : item))
          );
        }
        setSaveStatus('saved');
        refreshUserStats(user?.id);
      } catch (err) {
        console.error('Failed to auto-save note', err);
        setSaveStatus('unsaved');
      }
    }, 800);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setEditorTitle(val);
    triggerAutoSave(val, editorContent, editorFolder);
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setEditorContent(val);
    triggerAutoSave(editorTitle, val, editorFolder);
  };

  // Create new note
  const handleCreateNote = async () => {
    if (!user) return;
    try {
      setSaveStatus('saving');
      const newNote = await createNote(user.id, {
        title: 'New Note',
        content: '',
        folder: activeFolder !== 'all' ? activeFolder : 'Notes',
        is_pinned: false,
      });

      if (newNote) {
        setNotes((prev) => [newNote, ...prev]);
        selectNote(newNote);
      }
      setSaveStatus('saved');
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to create note', err);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (note, e) => {
    if (e) e.stopPropagation();
    try {
      const updated = await togglePinNote(note.id, note.is_pinned);
      if (updated) {
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? updated : n))
        );
      }
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to pin note', err);
    }
  };

  // Move to trash or permanently delete
  const handleDeleteNote = async (note, e) => {
    if (e) e.stopPropagation();
    try {
      await deleteNote(note.id, note.is_trash);
      const updated = notes.filter((n) => n.id !== note.id);
      setNotes(updated);
      if (selectedNoteId === note.id) {
        if (updated.length > 0) {
          selectNote(updated[0]);
        } else {
          setSelectedNoteId(null);
          setEditorTitle('');
          setEditorContent('');
        }
      }
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  // Restore from trash
  const handleRestoreNote = async (noteId) => {
    try {
      await restoreNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
      refreshUserStats(user?.id);
    } catch (err) {
      console.error('Failed to restore note', err);
    }
  };

  // Quick formatting insert into textarea
  const insertFormatting = (prefix, suffix = '') => {
    const textarea = document.getElementById('note-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = prefix + selected + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setEditorContent(newContent);
    triggerAutoSave(editorTitle, newContent, editorFolder);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleCopyNote = () => {
    navigator.clipboard.writeText(`${editorTitle}\n\n${editorContent}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add folder
  const handleAddFolder = async (e) => {
    if (e) e.preventDefault();
    const clean = newFolderName.trim();
    if (clean && user) {
      const updatedFolders = saveCustomFolder(user.id, clean);
      setFolders(updatedFolders);
      setActiveFolder(clean);
      setEditorFolder(clean);
      setNewFolderName('');
      setShowNewFolderModal(false);
      
      // Automatically create a new note in this folder
      await handleNewNote(clean);
    }
  };

  // Date formatter
  const formatNoteDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-slate-950 text-slate-100 overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* 1. LEFT COLUMN: Apple Notes Internal Sidebar (Folders / Filters) */}
      {/* ------------------------------------------------------------- */}
      <aside className="w-56 border-r border-white/10 bg-slate-950/70 backdrop-blur-md flex flex-col justify-between p-3 shrink-0 hidden md:flex">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Quick Views
            </span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveFilter('all');
                setActiveFolder('all');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeFilter === 'all' && activeFolder === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>All Notes</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveFilter('pinned');
                setActiveFolder('all');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeFilter === 'pinned'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Pin className="w-4 h-4 text-amber-400 fill-amber-400/30" />
                <span>Pinned Notes</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveFilter('trash');
                setActiveFolder('all');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeFilter === 'trash'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Trash</span>
              </div>
            </button>
          </nav>

          {/* Folders Section */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Folders
              </span>
              <button
                onClick={() => setShowNewFolderModal(true)}
                title="Create new folder"
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {folders.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setActiveFilter('all');
                    setActiveFolder(f);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-colors ${
                    activeFolder === f && activeFilter === 'all'
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick New Note Button in sidebar */}
        <button
          onClick={handleCreateNote}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-semibold transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* 2. MIDDLE COLUMN: Notes List Pane */}
      {/* ------------------------------------------------------------- */}
      <section className="w-72 sm:w-80 border-r border-white/10 bg-slate-900/60 backdrop-blur-md flex flex-col shrink-0">
        {/* Header & Search */}
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-white">
              {activeFilter === 'trash' ? 'Trash' : activeFilter === 'pinned' ? 'Pinned' : activeFolder === 'all' ? 'All Notes' : activeFolder}
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCreateNote}
                className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                title="Create New Note"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loading && notes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <FileEdit className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">No notes found.</p>
              {activeFilter !== 'trash' && (
                <button
                  onClick={handleCreateNote}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/30"
                >
                  Create your first note
                </button>
              )}
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              const cleanContent = note.content ? note.content.replace(/[#*`_~\[\]]/g, '').trim() : '';

              return (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`p-3.5 cursor-pointer transition-all relative group ${
                    isSelected
                      ? 'bg-amber-500/15 border-l-4 border-amber-400 pl-3'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className={`text-xs font-semibold truncate ${isSelected ? 'text-amber-200' : 'text-slate-200'}`}>
                      {note.title || 'Untitled Note'}
                    </h3>
                    <div className="flex items-center space-x-1 shrink-0">
                      {note.is_pinned && (
                        <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1">
                    <span className="font-medium text-slate-300">{formatNoteDate(note.updated_at)}</span>
                    <span className="text-slate-600">•</span>
                    <span className="truncate text-slate-500">
                      {cleanContent ? cleanContent.substring(0, 40) + '...' : 'No additional text'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <Folder className="w-2.5 h-2.5" />
                      <span>{note.folder || 'Notes'}</span>
                    </span>

                    {/* Quick actions on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                      {activeFilter !== 'trash' && (
                        <button
                          onClick={(e) => handleTogglePin(note, e)}
                          className="p-1 hover:text-amber-400 text-slate-400 rounded"
                          title={note.is_pinned ? "Unpin note" : "Pin note"}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteNote(note, e)}
                        className="p-1 hover:text-rose-400 text-slate-400 rounded"
                        title={activeFilter === 'trash' ? "Delete permanently" : "Move to trash"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. RIGHT COLUMN: Main Note Editor Area */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {selectedNoteId && currentNote ? (
          <>
            {/* Editor Toolbar */}
            <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
              {/* Formatting Actions */}
              <div className="flex items-center space-x-1 overflow-x-auto py-1">
                <button
                  onClick={() => insertFormatting('**', '**')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('*', '*')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('\n# ')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Heading 1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('\n## ')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Heading 2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-[1px] bg-white/10 mx-1" />
                <button
                  onClick={() => insertFormatting('\n- ')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('\n- [ ] ')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Checklist"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('\n```\n', '\n```')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('\n> ')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Quote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status & Options */}
              <div className="flex items-center space-x-3 shrink-0">
                {/* Auto-save badge */}
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                  {saveStatus === 'saving' ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                      <span>Saving...</span>
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span className="text-amber-500">Unsaved changes</span>
                  )}
                </div>

                <div className="h-4 w-[1px] bg-white/10" />

                {activeFilter === 'trash' ? (
                  <button
                    onClick={() => handleRestoreNote(currentNote.id)}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Note</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleTogglePin(currentNote)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        currentNote.is_pinned
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                      title={currentNote.is_pinned ? "Unpin Note" : "Pin Note to Top"}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCopyNote}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
                      title="Copy Note Text"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteNote(currentNote)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Note Metadata Bar */}
            <div className="px-8 pt-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Modified {formatNoteDate(currentNote.updated_at)}</span>
                </span>
                <span>•</span>
                <select
                  value={editorFolder}
                  onChange={(e) => {
                    setEditorFolder(e.target.value);
                    triggerAutoSave(editorTitle, editorContent, e.target.value);
                  }}
                  className="bg-transparent text-slate-400 hover:text-slate-200 border-none focus:outline-none cursor-pointer"
                >
                  {folders.map((f) => (
                    <option key={f} value={f} className="bg-slate-900 text-white">
                      📁 {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span>{editorContent.split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>

            {/* Title Input */}
            <div className="px-8 pt-3 pb-1">
              <input
                type="text"
                value={editorTitle}
                onChange={handleTitleChange}
                placeholder="Title..."
                disabled={activeFilter === 'trash'}
                className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-white placeholder-slate-600 focus:outline-none border-none tracking-tight"
              />
            </div>

            {/* Textarea Area */}
            <div className="flex-1 px-8 py-3 overflow-y-auto">
              <textarea
                id="note-textarea"
                value={editorContent}
                onChange={handleContentChange}
                disabled={activeFilter === 'trash'}
                placeholder="Start typing your note (Markdown supported: # Heading, - List, **bold**)..."
                className="w-full h-full bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none resize-none text-sm sm:text-base leading-relaxed font-sans"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Note Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose a note from the left list or create a new one to begin writing.
              </p>
            </div>
            <button
              onClick={handleCreateNote}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              + Create New Note
            </button>
          </div>
        )}
      </main>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddFolder}
            className="bg-slate-900 border border-white/10 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-pop-in"
          >
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <span>Create New Folder</span>
            </h3>
            <input
              type="text"
              placeholder="Folder Name (e.g. Work, Ideas, Personal)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              autoFocus
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md transition-all active:scale-95"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
