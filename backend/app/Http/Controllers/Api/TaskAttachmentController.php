<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TaskAttachmentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($task);

        $request->validate(['file' => 'required|file|max:20480']);

        $file = $request->file('file');
        $fileName = Str::uuid() . ($file->getClientOriginalExtension() ? '.' . $file->getClientOriginalExtension() : '');
        $filePath = "{$task->id}/{$fileName}"; // path inside the bucket — no bucket name prefix

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.supabase.service_key'),
        ])->withOptions([
            'verify' => app()->isProduction()
                ? true
                : false, // skip SSL verify in local dev only
        ])->withBody(
            file_get_contents($file->getRealPath()),
            $file->getMimeType()
        )->put(
            config('services.supabase.url') . '/storage/v1/object/' . config('services.supabase.bucket') . '/' . $filePath
        );

        abort_if(!$response->successful(), 500, 'File upload failed.');

        $publicUrl = config('services.supabase.url') . '/storage/v1/object/public/' . config('services.supabase.bucket') . '/' . $filePath;

        $originalName = iconv('UTF-8', 'UTF-8//IGNORE', $file->getClientOriginalName());
        if ($originalName === false) {
            $originalName = 'uploaded_file';
        }

        $attachment = TaskAttachment::create([
            'task_id' => $task->id,
            'uploaded_by' => $request->user()->id,
            'file_name' => $originalName,
            'file_url' => $publicUrl,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'entity_type' => Task::class,
            'entity_id' => $task->id,
            'action' => ActivityLog::ACTION_ATTACHMENT_ADD,
            'metadata' => ['file_name' => $originalName],
        ]);

        return response()->json($attachment, 201);
    }

    public function destroy(Request $request, TaskAttachment $attachment)
    {
        abort_unless($attachment->uploaded_by === $request->user()->id, 403);
        $attachment->delete();
        return response()->json(['message' => 'Attachment deleted.']);
    }

    private function authorizeTaskAccess(Task $task)
    {
        $column = $task->column;
        $board = $column->board;
        $project = $board->project;
        $workspace = $project->workspace;
        $userId = auth()->id();
        abort_unless(
            $workspace->members()->where('users.id', $userId)->exists(),
            403,
            'Access denied.'
        );
    }
}