<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Workspace extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['name', 'description', 'owner_id'];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'workspace_members')
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    public function workspaceMemberships()
    {
        return $this->hasMany(WorkspaceMember::class);
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    // Convenience scopes
    public function scopeOwnedBy($query, $userId)
    {
        return $query->where('owner_id', $userId);
    }
}