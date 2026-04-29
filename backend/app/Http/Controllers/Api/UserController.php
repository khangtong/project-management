<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Search users by email or name.
     * Excludes the authenticated user and already-members of a given workspace.
     */
    public function search(Request $request)
    {
        $request->validate([
            'email'        => 'required|string|min:2',
            'workspace_id' => 'nullable|uuid|exists:workspaces,id',
        ]);

        $query = User::query()
            ->where('id', '!=', $request->user()->id)
            ->where(function ($q) use ($request) {
                $term = '%' . $request->email . '%';
                $q->where('email', 'ilike', $term)
                  ->orWhere('name', 'ilike', $term);
            });

        // Exclude people already in the workspace
        if ($request->workspace_id) {
            $query->whereNotIn('id', function ($sub) use ($request) {
                $sub->select('user_id')
                    ->from('workspace_members')
                    ->where('workspace_id', $request->workspace_id);
            });
        }

        $users = $query
            ->select('id', 'name', 'email', 'avatar_url')
            ->limit(8)
            ->get();

        return response()->json($users);
    }
}
