<?php

use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [\App\Http\Controllers\Api\AuthController::class, 'register']);
    Route::post('login', [\App\Http\Controllers\Api\AuthController::class, 'login']);
});

// Public invitation preview (no auth required)
Route::get('invitations/{token}/accept', [\App\Http\Controllers\Api\WorkspaceMemberController::class, 'showInvitation']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('search', \App\Http\Controllers\Api\SearchController::class);
    Route::post('auth/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
    Route::get('auth/me',      [\App\Http\Controllers\Api\AuthController::class, 'me']);
    Route::patch('auth/profile',        [\App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
    Route::post('auth/avatar',           [\App\Http\Controllers\Api\AuthController::class, 'updateAvatar']);
    Route::delete('auth/avatar',         [\App\Http\Controllers\Api\AuthController::class, 'removeAvatar']);
    Route::post('invitations/{token}/accept', [\App\Http\Controllers\Api\WorkspaceMemberController::class, 'acceptInvitation']);

    Route::get('users/search', [\App\Http\Controllers\Api\UserController::class, 'search']);
    Route::apiResource('workspaces', \App\Http\Controllers\Api\WorkspaceController::class);
    
    Route::prefix('workspaces/{workspace}')->group(function () {
        Route::get('members', [\App\Http\Controllers\Api\WorkspaceMemberController::class, 'index']);
        Route::post('invite', [\App\Http\Controllers\Api\WorkspaceMemberController::class, 'invite']);
        Route::post('invite-by-email', [\App\Http\Controllers\Api\WorkspaceMemberController::class, 'inviteByEmail']);
        Route::patch('members/{member}/role', [\App\Http\Controllers\Api\WorkspaceMemberController::class, 'updateRole']);
        Route::delete('members/{member}', [\App\Http\Controllers\Api\WorkspaceMemberController::class, 'remove']);
        Route::get('projects', [\App\Http\Controllers\Api\ProjectController::class, 'index']);
        Route::post('projects', [\App\Http\Controllers\Api\ProjectController::class, 'store']);
    });

    // Standalone project routes (no workspace prefix needed)
    Route::get('projects/{project}',    [\App\Http\Controllers\Api\ProjectController::class, 'show']);
    Route::patch('projects/{project}',  [\App\Http\Controllers\Api\ProjectController::class, 'update']);
    Route::delete('projects/{project}', [\App\Http\Controllers\Api\ProjectController::class, 'destroy']);

    Route::get('projects/{project}/board', [\App\Http\Controllers\Api\BoardController::class, 'show']);
    Route::post('projects/{project}/board/columns', [\App\Http\Controllers\Api\BoardColumnController::class, 'store']);
    Route::patch('columns/reorder', [\App\Http\Controllers\Api\BoardColumnController::class, 'reorder']);
    Route::patch('columns/{column}', [\App\Http\Controllers\Api\BoardColumnController::class, 'update']);
    Route::delete('columns/{column}', [\App\Http\Controllers\Api\BoardColumnController::class, 'destroy']);

    Route::get('boards/{board}/tasks', [\App\Http\Controllers\Api\TaskController::class, 'index']);
    Route::get('boards/{board}/views', [\App\Http\Controllers\Api\BoardViewController::class, 'index']);
    Route::post('boards/{board}/views', [\App\Http\Controllers\Api\BoardViewController::class, 'store']);
    Route::patch('boards/{board}/views/{view}', [\App\Http\Controllers\Api\BoardViewController::class, 'update']);
    Route::delete('boards/{board}/views/{view}', [\App\Http\Controllers\Api\BoardViewController::class, 'destroy']);
    Route::post('columns/{column}/tasks', [\App\Http\Controllers\Api\TaskController::class, 'store']);
    Route::get('tasks/{task}', [\App\Http\Controllers\Api\TaskController::class, 'show']);
    Route::patch('tasks/{task}', [\App\Http\Controllers\Api\TaskController::class, 'update']);
    Route::patch('tasks/{task}/move', [\App\Http\Controllers\Api\TaskController::class, 'move']);
    Route::delete('tasks/{task}', [\App\Http\Controllers\Api\TaskController::class, 'destroy']);
    Route::get('tasks/{task}/dependencies', [\App\Http\Controllers\Api\TaskDependencyController::class, 'index']);
    Route::post('tasks/{task}/dependencies', [\App\Http\Controllers\Api\TaskDependencyController::class, 'store']);
    Route::delete('tasks/{task}/dependencies/{blockingTask}', [\App\Http\Controllers\Api\TaskDependencyController::class, 'destroy']);

    Route::post('tasks/{task}/assignees', [\App\Http\Controllers\Api\TaskAssigneeController::class, 'store']);
    Route::delete('tasks/{task}/assignees/{user}', [\App\Http\Controllers\Api\TaskAssigneeController::class, 'destroy']);
    Route::apiResource('tasks.comments', \App\Http\Controllers\Api\TaskCommentController::class)->shallow();
    Route::post('tasks/{task}/attachments', [\App\Http\Controllers\Api\TaskAttachmentController::class, 'store']);
    Route::delete('attachments/{attachment}', [\App\Http\Controllers\Api\TaskAttachmentController::class, 'destroy']);

    Route::get('tasks/{task}/activity', [\App\Http\Controllers\Api\ActivityLogController::class, 'index']);
    Route::get('me/tasks', [\App\Http\Controllers\Api\TaskController::class, 'myTasks']);
    Route::get('dashboard', [\App\Http\Controllers\Api\DashboardController::class, 'index']);
    Route::get('projects/{project}/summary', [\App\Http\Controllers\Api\DashboardController::class, 'projectSummary']);

    Route::prefix('notifications')->group(function () {
        Route::get('/',             [\App\Http\Controllers\Api\NotificationController::class, 'index']);
        Route::get('unread-count',  [\App\Http\Controllers\Api\NotificationController::class, 'unreadCount']);
        Route::patch('read-all',     [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
        Route::patch('{id}/read',   [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
        Route::delete('{id}',       [\App\Http\Controllers\Api\NotificationController::class, 'destroy']);
    });
});
