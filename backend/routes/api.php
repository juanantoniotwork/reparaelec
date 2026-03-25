<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\InteractionController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SessionController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Rutas compartidas técnico + admin
    Route::middleware('role:tecnico,admin')->group(function () {
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/interactions', [InteractionController::class, 'index']);
        Route::post('/interactions/{interaction}/feedback', [InteractionController::class, 'feedback']);
        Route::delete('/sessions/{id}', [SessionController::class, 'destroy']);
    });

    // Rutas exclusivas de Técnico
    Route::middleware('role:tecnico')->group(function () {
        Route::post('/chat', [ChatController::class, 'query'])->middleware('throttle:20,1');
        Route::post('/chat/stream', [ChatController::class, 'stream'])->middleware('throttle:20,1');
        Route::get('/chat/suggestions', [ChatController::class, 'suggestions']);
    });

    // Rutas exclusivas de Admin
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/stats', [StatsController::class, 'index']);
        Route::get('/admin/interactions', [InteractionController::class, 'adminIndex']);
        // CRUD de Usuarios
        Route::apiResource('users', UserController::class);
        Route::patch('users/{user}/toggle', [UserController::class, 'toggle']);

        // CRUD de Categorías (index accesible también por técnico, ver grupo anterior)
        Route::apiResource('categories', CategoryController::class)->except(['index']);

        // Gestión de Documentos
        Route::apiResource('documents', DocumentController::class)->except(['update']);

        // Configuración del sistema
        Route::get('/admin/settings', [SettingsController::class, 'index']);
        Route::put('/admin/settings', [SettingsController::class, 'update']);
    });

    // Ejemplo de rutas por rol
    Route::get('/admin-only', function () {
        return response()->json(['message' => 'Welcome Admin!']);
    })->middleware('role:admin');

    Route::get('/tecnico-only', function () {
        return response()->json(['message' => 'Welcome Tecnico!']);
    })->middleware('role:tecnico');
});
