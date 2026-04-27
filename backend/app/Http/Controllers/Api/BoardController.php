<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\Project;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    public function show(Project $project)
    {
        $this->authorizeProjectAccess($project);
        $board = $project->board;
        abort_if(!$board, 404, 'Board not found.');
        return response()->json($board->load('columns'));
    }

    private function authorizeProjectAccess(Project $project)
    {
        $workspace = $project->workspace;
        $userId = auth()->id();
        abort_unless(
            $workspace->members()->where('users.id', $userId)->exists(),
            403,
            'Access denied.'
        );
    }
}