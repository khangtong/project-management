<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request, Board $board)
    {
        $this->authorizeBoardAccess($board);

        $query = $board->tasks()->with(['assignees', 'creator'])->withCount('comments');

        if ($request->filled('assignee_id')) {
            $query->assignedTo($request->input('assignee_id'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->filled('due_before')) {
            $query->where('due_date', '<=', $request->input('due_before'));
        }
        if ($request->filled('due_after')) {
            $query->where('due_date', '>=', $request->input('due_after'));
        }
        if ($request->boolean('overdue')) {
            $query->overdue();
        }

        return response()->json($query->orderBy('position')->get()->groupBy('column_id'));
    }

    public function store(Request $request, BoardColumn $column)
    {
        $this->authorizeColumnAccess($column);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
        ]);

        $position = $column->tasks()->max('position') + 1;

        $task = $column->tasks()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'priority' => $data['priority'] ?? 'medium',
            'due_date' => $data['due_date'] ?? null,
            'position' => $position,
            'created_by' => $request->user()->id,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_CREATED,
            'metadata' => ['title' => $task->title],
        ]);

        return response()->json($task->load(['assignees', 'creator']), 201);
    }

    public function show(Task $task)
    {
        $this->authorizeTaskAccess($task);
        return response()->json($task->load(['assignees', 'creator', 'comments.user', 'attachments'])->loadCount('comments'));
    }

    public function update(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($task);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
        ]);

        $task->update($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_UPDATED,
            'metadata' => $data,
        ]);

        return response()->json($task);
    }

    public function move(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($task);

        $data = $request->validate([
            'column_id' => 'required|uuid|exists:board_columns,id',
            'position' => 'required|integer|min:0',
        ]);

        $oldColumnId = $task->column_id;
        $task->update([
            'column_id' => $data['column_id'],
            'position' => $data['position'],
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_MOVED,
            'metadata' => ['from_column' => $oldColumnId, 'to_column' => $data['column_id']],
        ]);

        return response()->json($task);
    }

    public function destroy(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($task);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_DELETED,
        ]);

        $task->delete();
        return response()->json(['message' => 'Task deleted.']);
    }

    public function myTasks(Request $request)
    {
        $tasks = Task::assignedTo($request->user()->id)
            ->with(['column.board.project', 'assignees'])
            ->orderBy('due_date')
            ->get();

        return response()->json($tasks);
    }

    private function authorizeBoardAccess(Board $board)
    {
        $project = $board->project;
        $workspace = $project->workspace;
        $userId = auth()->id();
        abort_unless(
            $workspace->members()->where('users.id', $userId)->exists(),
            403,
            'Access denied.'
        );
    }

    private function authorizeColumnAccess(BoardColumn $column)
    {
        $board = $column->board;
        $this->authorizeBoardAccess($board);
    }

    private function authorizeTaskAccess(Task $task)
    {
        $column = $task->column;
        $this->authorizeColumnAccess($column);
    }
}