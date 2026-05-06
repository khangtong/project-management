<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\Task;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user   = $request->user();
        $userId = $user->id;

        // All tasks assigned to this user (with full context for card rendering)
        $myTasks = Task::assignedTo($userId)
            ->with(['column.board.project', 'assignees'])
            ->orderBy('due_date')
            ->limit(50)
            ->get();

        // Overdue tasks assigned to this user
        $overdueTasks = Task::assignedTo($userId)
            ->overdue()
            ->with(['column.board.project', 'assignees'])
            ->orderBy('due_date')
            ->get();

        // Upcoming (next 7 days) tasks assigned to this user
        $upcomingTasks = Task::assignedTo($userId)
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [now()->startOfDay(), now()->addDays(7)->endOfDay()])
            ->with(['column.board.project', 'assignees'])
            ->orderBy('due_date')
            ->get();

        // Recent activity across all workspaces the user belongs to —
        // fetch activity logs for tasks in those workspaces
        $workspaceIds = WorkspaceMember::where('user_id', $userId)
            ->pluck('workspace_id');

        $recentActivity = ActivityLog::whereHasMorph(
            'entity',
            [Task::class],
            function ($q) use ($workspaceIds) {
                $q->whereHas('column.board.project', function ($pq) use ($workspaceIds) {
                    $pq->whereIn('workspace_id', $workspaceIds);
                });
            }
        )
            ->with(['user'])
            ->latest('created_at')
            ->limit(15)
            ->get();

        // Project progress: active + on-hold projects in the user's workspaces
        // (archived projects are excluded — they're closed/done)
        $projects = Project::whereIn('status', ['active', 'on_hold'])
            ->whereIn('workspace_id', $workspaceIds)
            ->get()
            ->map(function ($project) {
                // Count tasks via board → columns relationship
                $boardId = DB::table('boards')
                    ->where('project_id', $project->id)
                    ->value('id');

                if (!$boardId) {
                    $project->tasks_total_count = 0;
                    $project->tasks_done_count  = 0;
                    return $project;
                }

                $columnIds = DB::table('board_columns')
                    ->where('board_id', $boardId)
                    ->pluck('id');

                $project->tasks_total_count = DB::table('tasks')
                    ->whereIn('column_id', $columnIds)
                    ->whereNull('deleted_at')
                    ->count();

                // "Done" = tasks in any column whose name is 'Done' (case-insensitive)
                $doneColumnIds = DB::table('board_columns')
                    ->where('board_id', $boardId)
                    ->whereRaw('LOWER(name) = ?', ['done'])
                    ->pluck('id');

                $project->tasks_done_count = DB::table('tasks')
                    ->whereIn('column_id', $doneColumnIds)
                    ->whereNull('deleted_at')
                    ->count();

                return $project;
            });

        return response()->json([
            'my_tasks'        => $myTasks,
            'overdue_tasks'   => $overdueTasks,
            'upcoming_tasks'  => $upcomingTasks,
            'recent_activity' => $recentActivity,
            'projects'        => $projects,
        ]);
    }

    public function projectSummary(Request $request, $projectId)
    {
        $columns = \App\Models\BoardColumn::whereHas(
            'board',
            fn ($q) => $q->where('project_id', $projectId)
        )
            ->withCount('tasks')
            ->get()
            ->map(fn ($col) => [
                'column'     => $col->name,
                'task_count' => $col->tasks_count,
            ]);

        $overdue = Task::whereHas(
            'column.board',
            fn ($q) => $q->where('project_id', $projectId)
        )->overdue()->count();

        return response()->json(['columns' => $columns, 'overdue' => $overdue]);
    }
}
