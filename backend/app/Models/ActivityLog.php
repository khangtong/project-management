<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false; // only created_at needed

    protected $fillable = ['entity_type', 'entity_id', 'user_id', 'action', 'metadata'];

    protected $casts = [
        'metadata'   => 'array',
        'created_at' => 'datetime',
    ];

    // Common action constants
    const ACTION_CREATED        = 'created';
    const ACTION_UPDATED        = 'updated';
    const ACTION_DELETED        = 'deleted';
    const ACTION_MOVED          = 'moved';
    const ACTION_ASSIGNED       = 'assigned';
    const ACTION_UNASSIGNED     = 'unassigned';
    const ACTION_COMMENTED      = 'commented';
    const ACTION_ATTACHMENT_ADD = 'attachment_added';
    const ACTION_DEPENDENCY_ADD = 'dependency_added';
    const ACTION_DEPENDENCY_REM = 'dependency_removed';

    public function entity()
    {
        return $this->morphTo();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    protected static function booted()
    {
        static::creating(function ($log) {
            $log->created_at = now();
        });
    }
}
