<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\Column;
use Illuminate\Http\Request;

class ColumnController extends Controller
{
    /**
     * Store a new column in a board
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'board_id' => 'required|exists:boards,id',
            'name' => 'required|string|max:255',
        ]);

        $board = Board::findOrFail($validated['board_id']);

        if ($board->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $highestPosition = Column::where('board_id', $board->id)->max('position') ?? -1;

        $column = Column::create([
            'board_id' => $board->id,
            'name' => $validated['name'],
            'position' => $highestPosition + 1,
        ]);

        $column->load('tasks');

        return response()->json([
            'message' => 'Column created successfully',
            'column' => $column,
        ], 201);
    }

    /**
     * Update column name
     */
    public function update(Request $request, Column $column)
    {
        if ($column->board->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $column->update($validated);

        return response()->json([
            'message' => 'Column updated successfully',
            'column' => $column,
        ]);
    }

    /**
     * Delete column and its tasks
     */
    public function destroy(Request $request, Column $column)
    {
        if ($column->board->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $column->delete();

        return response()->json(['message' => 'Column deleted successfully']);
    }

    /**
     * Reorder columns in a board
     */
    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'columns' => 'required|array',
            'columns.*.id' => 'required|exists:columns,id',
            'columns.*.position' => 'required|integer',
        ]);

        foreach ($validated['columns'] as $item) {
            $col = Column::find($item['id']);
            if ($col && $col->board->user_id === $request->user()->id) {
                $col->update(['position' => $item['position']]);
            }
        }

        return response()->json(['message' => 'Columns reordered successfully']);
    }
}
