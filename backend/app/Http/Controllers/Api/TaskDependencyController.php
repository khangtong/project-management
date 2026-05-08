<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\TaskDependency;
use Illuminate\Http\Request;

class TaskDependencyController extends Controller
{
    public function index(Task $task)
    {
        $this->authorizeTaskAccess($task);

        return response()->json($this->dependencyPayload($task->fresh()));
    }

    public function store(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($task);

        $data = $request->validate([
            'blocking_task_id' => 'required|uuid|exists:tasks,id',
        ]);

        $blockingTask = Task::findOrFail($data['blocking_task_id']);
        $this->authorizeTaskAccess($blockingTask);

        abort_unless($blockingTask->id !== $task->id, 422, 'A task cannot block itself.');
        abort_unless($blockingTask->column->board_id === $task->column->board_id, 422, 'Dependencies must stay within the same board.');
        abort_unless(
            ! TaskDependency::where('blocking_task_id', $blockingTask->id)->where('blocked_task_id', $task->id)->exists(),
            422,
            'This dependency already exists.'
        );
        abort_unless(! $this->createsCycle($task, $blockingTask), 422, 'This dependency would create a cycle.');

        TaskDependency::create([
            'blocking_task_id' => $blockingTask->id,
            'blocked_task_id' => $task->id,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_DEPENDENCY_ADD,
            'metadata' => [
                'blocking_task_id' => $blockingTask->id,
                'blocking_task_title' => $blockingTask->title,
            ],
        ]);

        return response()->json($this->dependencyPayload($task->fresh()));
    }

    public function destroy(Request $request, Task $task, Task $blockingTask)
    {
        $this->authorizeTaskAccess($task);
        $this->authorizeTaskAccess($blockingTask);

        $dependency = TaskDependency::where('blocking_task_id', $blockingTask->id)
            ->where('blocked_task_id', $task->id)
            ->firstOrFail();

        $dependency->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_DEPENDENCY_REM,
            'metadata' => [
                'blocking_task_id' => $blockingTask->id,
                'blocking_task_title' => $blockingTask->title,
            ],
        ]);

        return response()->json($this->dependencyPayload($task->fresh()));
    }

    private function dependencyPayload(Task $task): array
    {
        $task->load([
            'blockedByTasks:id,title,column_id',
            'blockedByTasks.column:id,name',
            'dependentTasks:id,title,column_id',
            'dependentTasks.column:id,name',
        ])->loadCount([
            'blockingDependencies as blocking_dependencies_count',
            'blockingDependencies as open_blocking_dependencies_count' => function ($query) {
                $query->whereHas('blockingTask.column', function ($columnQuery) {
                    $columnQuery->whereRaw('LOWER(name) != ?', ['done']);
                });
            },
        ]);

        return [
            'blocked_by_tasks' => $task->blockedByTasks,
            'dependent_tasks' => $task->dependentTasks,
            'blocking_dependencies_count' => $task->blocking_dependencies_count,
            'open_blocking_dependencies_count' => $task->open_blocking_dependencies_count,
            'is_blocked' => $task->is_blocked,
        ];
    }

    private function createsCycle(Task $blockedTask, Task $blockingTask): bool
    {
        $stack = [$blockedTask->id];
        $seen = [];

        while ($stack) {
            $currentTaskId = array_pop($stack);

            if (isset($seen[$currentTaskId])) {
                continue;
            }

            $seen[$currentTaskId] = true;

            if ($currentTaskId === $blockingTask->id) {
                return true;
            }

            $nextIds = TaskDependency::where('blocking_task_id', $currentTaskId)
                ->pluck('blocked_task_id')
                ->all();

            foreach ($nextIds as $nextId) {
                $stack[] = $nextId;
            }
        }

        return false;
    }

    private function authorizeTaskAccess(Task $task): void
    {
        $workspace = $task->column->board->project->workspace;
        abort_unless(
            $workspace->members()->where('users.id', auth()->id())->exists(),
            403,
            'Access denied.'
        );
    }
}
