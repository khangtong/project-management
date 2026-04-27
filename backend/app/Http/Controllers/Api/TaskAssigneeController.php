<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class TaskAssigneeController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($task);

        $data = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $task->assignees()->syncWithoutDetaching([$data['user_id']]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_ASSIGNED,
            'metadata' => ['assigned_user_id' => $data['user_id']],
        ]);

        if ($data['user_id'] !== $request->user()->id) {
            NotificationService::taskAssigned($data['user_id'], $task->title, $task->id, $request->user()->name);
        }

        return response()->json($task->load('assignees'));
    }

    public function destroy(Request $request, Task $task, User $user)
    {
        $this->authorizeTaskAccess($task);

        $task->assignees()->detach($user->id);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_UNASSIGNED,
            'metadata' => ['unassigned_user_id' => $user->id],
        ]);

        return response()->json($task->load('assignees'));
    }

    private function authorizeTaskAccess(Task $task)
    {
        $column = $task->column;
        $board = $column->board;
        $project = $board->project;
        $workspace = $project->workspace;
        $userId = auth()->id();
        abort_unless(
            $workspace->members()->where('users.id', $userId)->exists(),
            403,
            'Access denied.'
        );
    }
}