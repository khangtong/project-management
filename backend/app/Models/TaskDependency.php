<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TaskDependency extends Model
{
    use HasUuids;

    protected $fillable = ['blocking_task_id', 'blocked_task_id'];

    public function blockingTask()
    {
        return $this->belongsTo(Task::class, 'blocking_task_id');
    }

    public function blockedTask()
    {
        return $this->belongsTo(Task::class, 'blocked_task_id');
    }
}
