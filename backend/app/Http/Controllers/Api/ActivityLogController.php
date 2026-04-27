<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;

class ActivityLogController extends Controller
{
    public function index(Task $task)
    {
        $this->authorizeTaskAccess($task);
        $logs = $task->activityLogs()->with('user')->latest('created_at')->get();
        return response()->json($logs);
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