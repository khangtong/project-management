<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkspaceMember extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['workspace_id', 'user_id', 'role', 'joined_at'];

    protected $casts = ['joined_at' => 'datetime'];

    const ROLE_OWNER  = 'owner';
    const ROLE_ADMIN  = 'admin';
    const ROLE_MEMBER = 'member';

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_OWNER, self::ROLE_ADMIN]);
    }
}