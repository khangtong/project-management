<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Project;
use App\Models\Workspace;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Workspace $workspace)
    {
        $this->authorizeWorkspaceAccess($workspace);
        return response()->json($workspace->projects()->active()->get());
    }

    public function store(Request $request, Workspace $workspace)
    {
        $this->authorizeWorkspaceAdmin($workspace, $request->user());

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        $project = $workspace->projects()->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'color' => $data['color'] ?? '#6366f1',
        ]);

        $board = Board::create([
            'project_id' => $project->id,
            'name' => 'Main Board',
        ]);

        $defaultColumns = ['To Do', 'In Progress', 'In Review', 'Done'];
        foreach ($defaultColumns as $index => $columnName) {
            BoardColumn::create([
                'board_id' => $board->id,
                'name' => $columnName,
                'position' => $index,
            ]);
        }

        return response()->json($project->load('board.columns'), 201);
    }

    public function show(Project $project)
    {
        $this->authorizeProjectAccess($project);
        return response()->json($project->load('board.columns'));
    }

    public function update(Request $request, Project $project)
    {
        $this->authorizeProjectAdmin($project);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:active,archived,on_hold',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        $project->update($data);
        return response()->json($project);
    }

    public function destroy(Project $project)
    {
        $this->authorizeProjectAdmin($project);
        $project->delete();
        return response()->json(['message' => 'Project deleted.']);
    }

    private function authorizeWorkspaceAccess(Workspace $workspace)
    {
        $userId = auth()->id();
        abort_unless(
            $workspace->members()->where('users.id', $userId)->exists(),
            403,
            'Access denied.'
        );
    }

    private function authorizeWorkspaceAdmin(Workspace $workspace, $user)
    {
        $member = $workspace->workspaceMemberships()->where('user_id', $user->id)->firstOrFail();
        abort_unless($member->isAdmin(), 403, 'Admin access required.');
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

    private function authorizeProjectAdmin(Project $project)
    {
        $workspace = $project->workspace;
        $userId = auth()->id();
        $member = $workspace->workspaceMemberships()->where('user_id', $userId)->first();
        abort_unless($member && $member->isAdmin(), 403, 'Admin access required.');
    }
}
