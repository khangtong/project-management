<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WorkspaceInvitationMail;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class WorkspaceMemberController extends Controller
{
    public function index(Workspace $workspace)
    {
        $this->authorizeWorkspaceAccess($workspace);
        $members = $workspace->workspaceMemberships()
            ->with('user')
            ->get()
            ->map(fn($m) => [
                'id' => $m->id,
                'user_id' => $m->user_id,
                'role' => $m->role,
                'joined_at' => $m->joined_at,
                'user' => $m->user,
            ]);
        return response()->json($members);
    }

    public function invite(Request $request, Workspace $workspace)
    {
        $this->authorizeWorkspaceAdmin($workspace, $request->user());

        $data = $request->validate([
            'email' => 'required|email|exists:users,email',
            'role' => 'nullable|in:admin,member',
        ]);

        $user = User::where('email', $data['email'])->firstOrFail();

        $existing = $workspace->workspaceMemberships()
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'User is already a member.'], 422);
        }

        $member = WorkspaceMember::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'role' => $data['role'] ?? WorkspaceMember::ROLE_MEMBER,
            'joined_at' => now(),
        ]);

        return response()->json(['message' => 'Member invited.', 'member' => $member->load('user')], 201);
    }

    public function inviteByEmail(Request $request, Workspace $workspace)
    {
        $this->authorizeWorkspaceAdmin($workspace, $request->user());

        $data = $request->validate([
            'email' => 'required|email',
            'role' => 'nullable|in:admin,member',
        ]);

        $existingUser = User::where('email', $data['email'])->first();

        if ($existingUser && $workspace->workspaceMemberships()->where('user_id', $existingUser->id)->exists()) {
            return response()->json(['message' => 'User is already a member.'], 422);
        }

        $invitation = WorkspaceInvitation::updateOrCreate(
            [
                'workspace_id' => $workspace->id,
                'email' => $data['email'],
            ],
            [
                'token' => Str::random(64),
                'role' => $data['role'] ?? 'member',
                'invited_by' => $request->user()->id,
                'expires_at' => now()->addHours(48),
                'accepted_at' => null,
            ]
        );

        Mail::to($data['email'])->queue(new WorkspaceInvitationMail($invitation));

        return response()->json(['message' => 'Invitation sent.']);
    }

    public function showInvitation(string $token)
    {
        $invitation = WorkspaceInvitation::where('token', $token)
            ->with('workspace', 'inviter')
            ->firstOrFail();

        if ($invitation->isExpired()) {
            return response()->json(['message' => 'Invitation has expired.'], 410);
        }

        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'Invitation already accepted.'], 422);
        }

        return response()->json([
            'email' => $invitation->email,
            'role' => $invitation->role,
            'workspace' => $invitation->workspace,
            'inviter' => $invitation->inviter,
            'expires_at' => $invitation->expires_at,
        ]);
    }

    public function acceptInvitation(Request $request, string $token)
    {
        $invitation = WorkspaceInvitation::where('token', $token)->firstOrFail();

        if ($invitation->isExpired()) {
            return response()->json(['message' => 'Invitation has expired.'], 410);
        }

        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'Already accepted.'], 422);
        }

        $user = $request->user();

        if ($user->email !== $invitation->email) {
            return response()->json(['message' => 'This invitation was sent to a different email address.'], 403);
        }

        WorkspaceMember::firstOrCreate(
            [
                'workspace_id' => $invitation->workspace_id,
                'user_id' => $user->id,
            ],
            [
                'role' => $invitation->role,
                'joined_at' => now(),
            ]
        );

        $invitation->update(['accepted_at' => now()]);

        return response()->json([
            'message' => 'Accepted.',
            'workspace_id' => $invitation->workspace_id,
        ]);
    }

    public function updateRole(Request $request, Workspace $workspace, WorkspaceMember $member)
    {
        $this->authorizeWorkspaceOwner($workspace, $request->user());

        abort_unless($member->workspace_id === $workspace->id, 404);

        $data = $request->validate([
            'role' => 'required|in:admin,member',
        ]);

        $member->update($data);
        return response()->json($member->load('user'));
    }

    public function remove(Request $request, Workspace $workspace, WorkspaceMember $member)
    {
        $this->authorizeWorkspaceAdmin($workspace, $request->user());

        abort_unless($member->workspace_id === $workspace->id, 404);

        if ($member->role === WorkspaceMember::ROLE_OWNER) {
            return response()->json(['message' => 'Cannot remove the owner.'], 422);
        }

        $member->delete();
        return response()->json(['message' => 'Member removed.']);
    }

    private function authorizeWorkspaceAccess(Workspace $workspace)
    {
        $user = auth()->user();
        abort_unless(
            $workspace->members()->where('users.id', $user->id)->exists(),
            403,
            'Access denied.'
        );
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