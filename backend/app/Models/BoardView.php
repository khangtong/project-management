<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BoardView extends Model
{
    use HasUuids;

    protected $fillable = ['board_id', 'user_id', 'name', 'filters'];

    protected $casts = [
        'filters' => 'array',
    ];

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
