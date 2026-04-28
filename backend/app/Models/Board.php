<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Board extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['project_id', 'name', 'description'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function columns()
    {
        return $this->hasMany(BoardColumn::class)->orderBy('position');
    }

    public function tasks()
    {
        return $this->hasManyThrough(Task::class, BoardColumn::class, 'board_id', 'column_id', 'id');
    }
}