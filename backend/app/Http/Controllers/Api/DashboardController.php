<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        return response()->json([
            'my_tasks'       => Task::assignedTo($userId)->with(['column.board.project','assignees'])->orderBy('due_date')->limit(20)->get(),
            'overdue_tasks'  => Task::assignedTo($userId)->overdue()->with(['column.board.project'])->get(),
            'upcoming_tasks' => Task::assignedTo($userId)->whereNotNull('due_date')
                ->whereBetween('due_date', [now(), now()->addDays(7)])
                ->with(['column.board.project'])->orderBy('due_date')->get(),
        ]);
    }

    public function projectSummary(Request $request, $projectId)
    {
        $columns = \App\Models\BoardColumn::whereHas('board', fn($q) => $q->where('project_id', $projectId))
            ->withCount('tasks')->get()
            ->map(fn($col) => ['column' => $col->name, 'task_count' => $col->tasks_count]);
        $overdue = Task::whereHas('column.board', fn($q) => $q->where('project_id', $projectId))->overdue()->count();
        return response()->json(['columns' => $columns, 'overdue' => $overdue]);
    }
}