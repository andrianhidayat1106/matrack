<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Board;
use App\Models\Column;
use App\Models\Note;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user and seed starter data
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Create Default Board and standard Columns for the user
        $board = Board::create([
            'user_id' => $user->id,
            'name' => 'My Schedule Board',
        ]);

        $todoCol = Column::create([
            'board_id' => $board->id,
            'name' => 'To Do',
            'position' => 0,
        ]);

        $inProgressCol = Column::create([
            'board_id' => $board->id,
            'name' => 'In Progress',
            'position' => 1,
        ]);

        $doneCol = Column::create([
            'board_id' => $board->id,
            'name' => 'Done',
            'position' => 2,
        ]);

        // Seed starter tasks
        Task::create([
            'column_id' => $todoCol->id,
            'user_id' => $user->id,
            'title' => 'Welcome to Matrack Schedule!',
            'description' => 'Explore the Trello-style kanban board. You can drag cards between columns, set priorities, and track due dates.',
            'due_date' => now()->addDays(2),
            'priority' => 'high',
            'position' => 0,
        ]);

        Task::create([
            'column_id' => $inProgressCol->id,
            'user_id' => $user->id,
            'title' => 'Setup personal workspace',
            'description' => 'Customize folders in Apple Notes and add your upcoming sprint goals.',
            'due_date' => now()->addDays(5),
            'priority' => 'medium',
            'position' => 0,
        ]);

        Task::create([
            'column_id' => $doneCol->id,
            'user_id' => $user->id,
            'title' => 'Account creation completed',
            'description' => 'Successfully registered to Matrack.',
            'due_date' => now(),
            'priority' => 'low',
            'position' => 0,
        ]);

        // Seed starter note
        Note::create([
            'user_id' => $user->id,
            'title' => 'Welcome to Matrack Notes 📝',
            'content' => "# Welcome to Matrack Notes!\n\nThis is your minimalist, Apple Notes-inspired workspace.\n\n### Key Features:\n- **Instant Auto-save:** Write freely without worrying about saving.\n- **Pin Important Notes:** Keep critical thoughts pinned to the top.\n- **Search & Organize:** Fast search across titles and content.\n- **Odoo Launcher:** Click the 9-dots icon at top-left anytime to switch apps!\n\nHave a productive day!",
            'folder' => 'Notes',
            'is_pinned' => true,
            'is_archived' => false,
            'is_trash' => false,
        ]);

        $token = $user->createToken('matrack_auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Login user and issue token
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        $token = $user->createToken('matrack_auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Logout and revoke current token
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get authenticated user profile & stats
     */
    public function me(Request $request)
    {
        $user = $request->user();

        $stats = [
            'notes_count' => Note::where('user_id', $user->id)->where('is_trash', false)->count(),
            'pinned_notes_count' => Note::where('user_id', $user->id)->where('is_pinned', true)->where('is_trash', false)->count(),
            'tasks_total' => Task::where('user_id', $user->id)->count(),
            'tasks_completed' => Task::where('user_id', $user->id)
                ->whereHas('column', function ($q) {
                    $q->where('name', 'LIKE', '%done%');
                })->count(),
            'tasks_pending' => Task::where('user_id', $user->id)
                ->whereDoesntHave('column', function ($q) {
                    $q->where('name', 'LIKE', '%done%');
                })->count(),
        ];

        return response()->json([
            'user' => $user,
            'stats' => $stats,
        ]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user,
        ]);
    }
}
