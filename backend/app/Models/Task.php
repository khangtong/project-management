<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'column_id', 'title', 'description',
        'position', 'priority', 'due_date', 'created_by',
    ];

    protected $casts = ['due_date' => 'date'];

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
}