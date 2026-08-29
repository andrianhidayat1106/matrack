<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'column_id',
        'user_id',
        'title',
        'description',
        'due_date',
        'priority',
        'position',
    ];

    protected $casts = [
        'due_date' => 'datetime',
        'position' => 'integer',
    ];

    public function column()
    {
        return $this->belongsTo(Column::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
