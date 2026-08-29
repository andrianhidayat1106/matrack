<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Column;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /**
     * Store a new task
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'column_id' => 'required|exists:columns,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'priority' => 'nullable|in:low,medium,high',
        ]);

        $column = Column::findOrFail($validated['column_id']);

        if ($column->board->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $highestPosition = Task::where('column_id', $column->id)->max('position') ?? -1;

        $task = Task::create([
            'column_id' => $column->id,
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
            'priority' => $validated['priority'] ?? 'medium',
            'position' => $highestPosition + 1,
        ]);

        return response()->json([
            'message' => 'Task created successfully',
            'task' => $task,
        ], 201);
    }

    /**
     * Update task details
     */
    public function update(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'priority' => 'nullable|in:low,medium,high',
            'column_id' => 'nullable|exists:columns,id',
        ]);

        $task->update($validated);

        return response()->json([
            'message' => 'Task updated successfully',
            'task' => $task,
        ]);
    }

    /**
     * Move task between or within columns with drag and drop reordering
     */
    public function move(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'target_column_id' => 'required|exists:columns,id',
            'target_position' => 'required|integer|min:0',
        ]);

        $targetColumn = Column::findOrFail($validated['target_column_id']);

        if ($targetColumn->board->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sourceColumnId = $task->column_id;
        $targetColumnId = $targetColumn->id;
        $targetPosition = $validated['target_position'];

        // If moved to new column or reordered within same column
        $task->column_id = $targetColumnId;
        $task->position = $targetPosition;
        $task->save();

        // Normalize positions in target column
        $tasksInTarget = Task::where('column_id', $targetColumnId)
            ->where('id', '!=', $task->id)
            ->orderBy('position', 'asc')
            ->get();

        $currentPos = 0;
        foreach ($tasksInTarget as $t) {
            if ($currentPos === $targetPosition) {
                $currentPos++;
            }
            $t->update(['position' => $currentPos]);
            $currentPos++;
        }

        // If moved from another column, normalize source column positions too
        if ($sourceColumnId !== $targetColumnId) {
            $tasksInSource = Task::where('column_id', $sourceColumnId)
                ->orderBy('position', 'asc')
                ->get();

            $srcPos = 0;
            foreach ($tasksInSource as $st) {
                $st->update(['position' => $srcPos]);
                $srcPos++;
            }
        }

        return response()->json([
            'message' => 'Task moved successfully',
            'task' => $task,
        ]);
    }

    /**
     * Delete a task
     */
    public function destroy(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }
}
