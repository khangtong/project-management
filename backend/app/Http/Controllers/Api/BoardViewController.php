<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\BoardView;
use Illuminate\Http\Request;

class BoardViewController extends Controller
{
    public function index(Request $request, Board $board)
    {
        $this->authorizeBoardAccess($board);

        return response()->json(
            $board->views()
                ->where('user_id', $request->user()->id)
                ->get()
        );
    }

    public function store(Request $request, Board $board)
    {
        $this->authorizeBoardAccess($board);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'filters' => 'required|array',
            'filters.priorities' => 'nullable|array',
            'filters.priorities.*' => 'in:low,medium,high,urgent',
            'filters.assigneeId' => 'nullable|uuid',
            'filters.overdue' => 'required|boolean',
        ]);

        $view = BoardView::create([
            'board_id' => $board->id,
            'user_id' => $request->user()->id,
            'name' => $data['name'],
            'filters' => $this->normalizedFilters($data['filters']),
        ]);

        return response()->json($view, 201);
    }

    public function update(Request $request, Board $board, BoardView $view)
    {
        $this->authorizeBoardAccess($board);
        abort_unless($view->board_id === $board->id && $view->user_id === $request->user()->id, 404);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'filters' => 'sometimes|array',
            'filters.priorities' => 'nullable|array',
            'filters.priorities.*' => 'in:low,medium,high,urgent',
            'filters.assigneeId' => 'nullable|uuid',
            'filters.overdue' => 'required_with:filters|boolean',
        ]);

        if (array_key_exists('filters', $data)) {
            $data['filters'] = $this->normalizedFilters($data['filters']);
        }

        $view->update($data);

        return response()->json($view->fresh());
    }

    public function destroy(Request $request, Board $board, BoardView $view)
    {
        $this->authorizeBoardAccess($board);
        abort_unless($view->board_id === $board->id && $view->user_id === $request->user()->id, 404);

        $view->delete();

        return response()->json(['message' => 'View deleted.']);
    }

    private function normalizedFilters(array $filters): array
    {
        return [
            'priorities' => array_values(array_unique($filters['priorities'] ?? [])),
            'assigneeId' => $filters['assigneeId'] ?? '',
            'overdue' => (bool) ($filters['overdue'] ?? false),
        ];
    }

    private function authorizeBoardAccess(Board $board): void
    {
        $workspace = $board->project->workspace;
        abort_unless(
            $workspace->members()->where('users.id', auth()->id())->exists(),
            403,
            'Access denied.'
        );
    }
}
