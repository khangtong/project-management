<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Task extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'column_id', 'title', 'description',
        'position', 'priority', 'due_date', 'created_by',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    protected $appends = ['is_blocked'];

    const PRIORITY_LOW    = 'low';
    const PRIORITY_MEDIUM = 'medium';
    const PRIORITY_HIGH   = 'high';
    const PRIORITY_URGENT = 'urgent';

    public function column()
    {
        return $this->belongsTo(BoardColumn::class, 'column_id');
    }

    public function board()
    {
        return $this->hasOneThrough(Board::class, BoardColumn::class, 'id', 'id', 'column_id', 'board_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignees()
    {
        return $this->belongsToMany(User::class, 'task_assignees');
    }

    public function comments()
    {
        return $this->hasMany(TaskComment::class)->oldest();
    }

    public function attachments()
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function activityLogs()
    {
        return $this->morphMany(ActivityLog::class, 'entity');
    }

    public function blockingDependencies()
    {
        return $this->hasMany(TaskDependency::class, 'blocked_task_id');
    }

    public function blockedByTasks()
    {
        return $this->belongsToMany(
            Task::class,
            'task_dependencies',
            'blocked_task_id',
            'blocking_task_id'
        );
    }

    public function dependentTasks()
    {
        return $this->belongsToMany(
            Task::class,
            'task_dependencies',
            'blocking_task_id',
            'blocked_task_id'
        );
    }

    public function scopeByPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeOverdue($query)
    {
        return $query->whereNotNull('due_date')->where('due_date', '<', now());
    }

    public function scopeAssignedTo($query, $userId)
    {
        return $query->whereHas('assignees', fn($q) => $q->where('users.id', $userId));
    }

    public function scopeWithDependencySummary(Builder $query): Builder
    {
        return $query
            ->with(['blockedByTasks:id,title,column_id', 'dependentTasks:id,title,column_id'])
            ->withCount(['blockingDependencies as blocking_dependencies_count'])
            ->withCount([
                'blockingDependencies as open_blocking_dependencies_count' => function ($dependencyQuery) {
                    $dependencyQuery
                        ->whereHas('blockingTask.column', function ($columnQuery) {
                            $columnQuery->whereRaw('LOWER(name) != ?', ['done']);
                        });
                },
            ]);
    }

    public function getIsBlockedAttribute(): bool
    {
        if (array_key_exists('open_blocking_dependencies_count', $this->attributes)) {
            return (int) $this->attributes['open_blocking_dependencies_count'] > 0;
        }

        return $this->blockingDependencies()
            ->whereHas('blockingTask.column', function ($query) {
                $query->whereRaw('LOWER(name) != ?', ['done']);
            })
            ->exists();
    }
}
