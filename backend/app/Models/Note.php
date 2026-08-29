<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'folder',
        'is_pinned',
        'is_archived',
        'is_trash',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'is_archived' => 'boolean',
        'is_trash' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
