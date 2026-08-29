<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    /**
     * Display a listing of user notes
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $query = Note::where('user_id', $userId);

        $filter = $request->query('filter', 'all'); // all, pinned, archived, trash
        $folder = $request->query('folder');
        $search = $request->query('search');

        if ($filter === 'trash') {
            $query->where('is_trash', true);
        } else {
            $query->where('is_trash', false);

            if ($filter === 'pinned') {
                $query->where('is_pinned', true);
            } elseif ($filter === 'archived') {
                $query->where('is_archived', true);
            } else {
                $query->where('is_archived', false);
            }

            if ($folder && $folder !== 'all') {
                $query->where('folder', $folder);
            }
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('content', 'LIKE', "%{$search}%");
            });
        }

        $notes = $query->orderBy('is_pinned', 'desc')
                      ->orderBy('updated_at', 'desc')
                      ->get();

        // Get distinct folders for this user
        $folders = Note::where('user_id', $userId)
            ->where('is_trash', false)
            ->whereNotNull('folder')
            ->distinct()
            ->pluck('folder');

        return response()->json([
            'notes' => $notes,
            'folders' => $folders,
        ]);
    }

    /**
     * Store a newly created note
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'folder' => 'nullable|string|max:100',
            'is_pinned' => 'nullable|boolean',
        ]);

        $note = Note::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'] ?? 'New Note',
            'content' => $validated['content'] ?? '',
            'folder' => $validated['folder'] ?? 'Notes',
            'is_pinned' => $validated['is_pinned'] ?? false,
            'is_archived' => false,
            'is_trash' => false,
        ]);

        return response()->json([
            'message' => 'Note created successfully',
            'note' => $note,
        ], 201);
    }

    /**
     * Display the specified note
     */
    public function show(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['note' => $note]);
    }

    /**
     * Update the specified note
     */
    public function update(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'folder' => 'nullable|string|max:100',
            'is_pinned' => 'nullable|boolean',
            'is_archived' => 'nullable|boolean',
        ]);

        $note->update($validated);

        return response()->json([
            'message' => 'Note updated successfully',
            'note' => $note,
        ]);
    }

    /**
     * Toggle pin status
     */
    public function togglePin(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $note->is_pinned = !$note->is_pinned;
        $note->save();

        return response()->json([
            'message' => $note->is_pinned ? 'Note pinned' : 'Note unpinned',
            'note' => $note,
        ]);
    }

    /**
     * Toggle archive status
     */
    public function toggleArchive(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $note->is_archived = !$note->is_archived;
        $note->save();

        return response()->json([
            'message' => $note->is_archived ? 'Note archived' : 'Note unarchived',
            'note' => $note,
        ]);
    }

    /**
     * Move note to trash or permanently delete
     */
    public function destroy(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($note->is_trash) {
            // Permanent delete
            $note->delete();
            return response()->json(['message' => 'Note permanently deleted']);
        } else {
            // Move to trash
            $note->is_trash = true;
            $note->is_pinned = false;
            $note->save();
            return response()->json(['message' => 'Note moved to trash', 'note' => $note]);
        }
    }

    /**
     * Restore note from trash
     */
    public function restore(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $note->is_trash = false;
        $note->save();

        return response()->json([
            'message' => 'Note restored from trash',
            'note' => $note,
        ]);
    }
}
