<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\TaskComment;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class TaskCommentController extends Controller
{
    public function index(Task $task)
    {
        $this->authorizeTaskAccess($task);
        return response()->json($task->comments()->with('user')->get());
    }

    public function store(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($task);

        $data = $request->validate([
            'body' => 'required|string',
        ]);

        $comment = $task->comments()->create([
            'body' => $data['body'],
            'user_id' => $request->user()->id,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_COMMENTED,
        ]);

        if ($task->created_by !== $request->user()->id) {
            NotificationService::commentAdded($task->created_by, $task->title, $task->id, $request->user()->name);
        }

        return response()->json($comment->load('user'), 201);
    }

    public function update(Request $request, TaskComment $comment)
    {
        abort_unless($comment->user_id === $request->user()->id, 403);
        $comment->update($request->validate(['body' => 'required|string']));
        return response()->json($comment);
    }

    public function destroy(Request $request, TaskComment $comment)
    {
        abort_unless($comment->user_id === $request->user()->id, 403);
        $comment->delete();
        return response()->json(['message' => 'Comment deleted.']);
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