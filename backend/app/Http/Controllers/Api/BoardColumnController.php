<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Project;
use Illuminate\Http\Request;

class BoardColumnController extends Controller
{
    public function store(Request $request, Project $project)
    {
        $this->authorizeProjectAccess($project);

        $board = $project->board;
        abort_if(!$board, 404, 'Board not found.');

        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        $position = $board->columns()->max('position') + 1;

        $column = BoardColumn::create([
            'board_id' => $board->id,
            'name'     => $data['name'],
            'color'    => $data['color'] ?? null,
            'position' => $position,
        ]);

        return response()->json($column, 201);
    }

    public function update(Request $request, BoardColumn $column)
    {
        $this->authorizeColumnAccess($column);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
        ]);

        $column->update($data);
        return response()->json($column);
    }

    public function destroy(BoardColumn $column)
    {
        $this->authorizeColumnAccess($column);
        $column->delete();
        return response()->json(['message' => 'Column deleted.']);
    }

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'columns' => 'required|array',
            'columns.*.id' => 'required|uuid|exists:board_columns,id',
            'columns.*.position' => 'required|integer|min:0',
        ]);

        foreach ($data['columns'] as $item) {
            BoardColumn::where('id', $item['id'])->update(['position' => $item['position']]);
        }

        return response()->json(['message' => 'Columns reordered.']);
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

    private function authorizeColumnAccess(BoardColumn $column)
    {
        $board = $column->board;
        $project = $board->project;
        $this->authorizeProjectAccess($project);
    }
}