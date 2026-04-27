<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['workspace_id', 'name', 'description', 'status', 'color'];

    const STATUS_ACTIVE   = 'active';
    const STATUS_ARCHIVED = 'archived';
    const STATUS_ON_HOLD  = 'on_hold';

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function board()
    {
        return $this->hasOne(Board::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeArchived($query)
    {
        return $query->where('status', self::STATUS_ARCHIVED);
    }
}