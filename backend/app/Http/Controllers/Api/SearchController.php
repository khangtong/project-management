<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Project;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request)
    {
        $request->validate(['q' => 'required|string|min:2|max:100']);
        $q = $request->input('q');
        $userId = $request->user()->id;

        $tasks = Task::whereHas('column.board.project.workspace.members', fn($q2) => $q2->where('users.id', $userId))
            ->where(fn($q2) => $q2->where('title', 'ilike', "%{$q}%")->orWhere('description', 'ilike', "%{$q}%"))
            ->with(['column.board.project', 'assignees'])->limit(10)->get();

        $projects = Project::whereHas('workspace.members', fn($q2) => $q2->where('users.id', $userId))
            ->where('name', 'ilike', "%{$q}%")->limit(5)->get();

        return response()->json(['tasks' => $tasks, 'projects' => $projects]);
    }
}