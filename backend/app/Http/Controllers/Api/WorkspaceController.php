<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;

class WorkspaceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Get workspaces where user is owner
        $ownedWorkspaces = Workspace::where('owner_id', $user->id)->get();
        
        // Get workspaces where user is a member
        $memberWorkspaceIds = WorkspaceMember::where('user_id', $user->id)->pluck('workspace_id');
        $memberWorkspaces = Workspace::whereIn('id', $memberWorkspaceIds)->get();
        
        // Merge and remove duplicates (in case user is both owner and member)
        $workspaces = $ownedWorkspaces->merge($memberWorkspaces)->unique('id')->values();
        
        return response()->json($workspaces->load('owner'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $workspace = Workspace::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'owner_id' => $request->user()->id,
        ]);

        WorkspaceMember::create([
            'workspace_id' => $workspace->id,
            'user_id' => $request->user()->id,
            'role' => WorkspaceMember::ROLE_OWNER,
            'joined_at' => now(),
        ]);

        return response()->json($workspace->load('owner'), 201);
    }

    public function show(Workspace $workspace)
    {
        $this->authorizeWorkspaceAccess($workspace);
        return response()->json($workspace->load(['owner', 'projects']));
    }

    public function update(Request $request, Workspace $workspace)
    {
        $this->authorizeWorkspaceAdmin($workspace, $request->user());

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        $workspace->update($data);
        return response()->json($workspace);
    }

    public function destroy(Request $request, Workspace $workspace)
    {
        $this->authorizeWorkspaceOwner($workspace, $request->user());
        $workspace->delete();
        return response()->json(['message' => 'Workspace deleted.']);
    }

    private function authorizeWorkspaceAccess(Workspace $workspace)
    {
        $userId = auth()->id();
        
        // Check if user is owner OR member
        $isOwner = $workspace->owner_id === $userId;
        $isMember = $workspace->members()->where('users.id', $userId)->exists();
        
        abort_unless($isOwner || $isMember, 403, 'Access denied.');
    }

    private function authorizeWorkspaceAdmin(Workspace $workspace, $user)
    {
        $member = $workspace->workspaceMemberships()->where('user_id', $user->id)->firstOrFail();
        abort_unless($member->isAdmin(), 403, 'Admin access required.');
    }

    private function authorizeWorkspaceOwner(Workspace $workspace, $user)
    {
        abort_unless($workspace->owner_id === $user->id, 403, 'Owner access required.');
    }
}