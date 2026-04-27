<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoardColumn extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['board_id', 'name', 'position'];

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'column_id')->orderBy('position');
    }
}