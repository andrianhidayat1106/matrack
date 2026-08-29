<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\Column;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    /**
     * Get all boards for the authenticated user
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $boards = Board::where('user_id', $userId)
            ->with(['columns.tasks' => function ($q) {
                $q->orderBy('position', 'asc');
            }])
            ->get();

        // If user has no boards yet, auto-create default board
        if ($boards->isEmpty()) {
            $board = Board::create([
                'user_id' => $userId,
                'name' => 'Main Schedule',
            ]);

            Column::create(['board_id' => $board->id, 'name' => 'To Do', 'position' => 0]);
            Column::create(['board_id' => $board->id, 'name' => 'In Progress', 'position' => 1]);
            Column::create(['board_id' => $board->id, 'name' => 'Done', 'position' => 2]);

            $boards = Board::where('user_id', $userId)
                ->with(['columns.tasks' => function ($q) {
                    $q->orderBy('position', 'asc');
                }])
                ->get();
        }

        return response()->json(['boards' => $boards]);
    }

    /**
     * Create a new board
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $board = Board::create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
        ]);

        // Create default columns for new board
        Column::create(['board_id' => $board->id, 'name' => 'To Do', 'position' => 0]);
        Column::create(['board_id' => $board->id, 'name' => 'In Progress', 'position' => 1]);
        Column::create(['board_id' => $board->id, 'name' => 'Done', 'position' => 2]);

        $board->load('columns.tasks');

        return response()->json([
            'message' => 'Board created successfully',
            'board' => $board,
        ], 201);
    }

    /**
     * Display a specific board
     */
    public function show(Request $request, Board $board)
    {
        if ($board->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $board->load(['columns.tasks' => function ($q) {
            $q->orderBy('position', 'asc');
        }]);

        return response()->json(['board' => $board]);
    }

    /**
     * Update board
     */
    public function update(Request $request, Board $board)
    {
        if ($board->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $board->update($validated);

        return response()->json([
            'message' => 'Board updated successfully',
            'board' => $board,
        ]);
    }

    /**
     * Delete board
     */
    public function destroy(Request $request, Board $board)
    {
        if ($board->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $board->delete();

        return response()->json(['message' => 'Board deleted successfully']);
    }
}
