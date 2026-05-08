<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'type', 'title', 'body', 'data', 'read_at'];
    protected $casts = ['data' => 'array', 'read_at' => 'datetime'];

    const TYPE_TASK_ASSIGNED = 'task_assigned';
    const TYPE_COMMENT_ADDED = 'comment_added';
    const TYPE_MENTION = 'mention';

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isRead(): bool
    {
        return !is_null($this->read_at);
    }

    public function markAsRead(): void
    {
        $this->update(['read_at' => now()]);
    }
}
