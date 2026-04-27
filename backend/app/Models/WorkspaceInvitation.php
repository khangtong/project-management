<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class WorkspaceInvitation extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id',
        'email',
        'token',
        'role',
        'invited_by',
        'accepted_at',
        'expires_at',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function inviter()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function isExpired(): bool
    {
        return now()->isAfter($this->expires_at);
    }

    public function isAccepted(): bool
    {
        return !is_null($this->accepted_at);
    }
}