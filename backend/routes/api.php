<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardController;
use App\Http\Controllers\Api\ColumnController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Health Check / Ping
Route::get('/ping', function () {
    return response()->json([
        'status' => 'ok',
        'app' => 'Matrack API',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Public Authentication Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Auth & User Profile
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Notes Module API (Apple Notes Style)
    Route::apiResource('notes', NoteController::class);
    Route::patch('/notes/{note}/pin', [NoteController::class, 'togglePin']);
    Route::patch('/notes/{note}/archive', [NoteController::class, 'toggleArchive']);
    Route::patch('/notes/{note}/restore', [NoteController::class, 'restore']);

    // Schedule / Kanban Board Module API (Trello Style)
    Route::apiResource('boards', BoardController::class);
    Route::apiResource('columns', ColumnController::class)->except(['index', 'show']);
    Route::post('/columns/reorder', [ColumnController::class, 'reorder']);

    Route::apiResource('tasks', TaskController::class)->except(['index', 'show']);
    Route::patch('/tasks/{task}/move', [TaskController::class, 'move']);
});
