<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
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
            'mentioned_user_ids' => 'sometimes|array',
            'mentioned_user_ids.*' => 'uuid|exists:users,id',
        ]);

        $mentions = $this->resolvedMentions($task, $request->user()->id, $data['mentioned_user_ids'] ?? []);
        $comment = $task->comments()->create([
            'body' => $data['body'],
            'user_id' => $request->user()->id,
            'mentions' => $mentions,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_COMMENTED,
            'metadata' => [
                'mentions' => array_column($mentions, 'name'),
            ],
        ]);

        if ($task->created_by !== $request->user()->id) {
            NotificationService::commentAdded($task->created_by, $task->title, $task->id, $request->user()->name);
        }

        $this->sendMentionNotifications($task, $comment, $request->user()->name, $mentions);

        return response()->json($comment->load('user'), 201);
    }

    public function update(Request $request, TaskComment $comment)
    {
        abort_unless($comment->user_id === $request->user()->id, 403);
        $data = $request->validate([
            'body' => 'required|string',
            'mentioned_user_ids' => 'sometimes|array',
            'mentioned_user_ids.*' => 'uuid|exists:users,id',
        ]);

        $mentions = $this->resolvedMentions($comment->task, $request->user()->id, $data['mentioned_user_ids'] ?? []);
        $existingMentionIds = collect($comment->mentions ?? [])->pluck('id')->all();

        $comment->update([
            'body' => $data['body'],
            'mentions' => $mentions,
        ]);

        $newMentions = array_values(array_filter($mentions, fn(array $mention) => ! in_array($mention['id'], $existingMentionIds, true)));
        $this->sendMentionNotifications($comment->task, $comment, $request->user()->name, $newMentions);

        return response()->json($comment->load('user'));
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

    private function resolvedMentions(Task $task, string $authorId, array $mentionedUserIds): array
    {
        if ($mentionedUserIds === []) {
            return [];
        }

        return $task->column->board->project->workspace
            ->members()
            ->whereIn('users.id', array_unique($mentionedUserIds))
            ->where('users.id', '!=', $authorId)
            ->get(['users.id', 'users.name'])
            ->map(fn(User $user) => ['id' => $user->id, 'name' => $user->name])
            ->values()
            ->all();
    }

    private function sendMentionNotifications(Task $task, TaskComment $comment, string $commenterName, array $mentions): void
    {
        $projectId = $task->column->board->project->id;

        foreach ($mentions as $mention) {
            NotificationService::mention(
                $mention['id'],
                $task->title,
                $task->id,
                $projectId,
                $comment->id,
                $commenterName
            );
        }
    }
}
