<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Interaction extends Model
{
    protected $fillable = [
        'session_id',
        'user_id',
        'query',
        'response',
        'model_used',
        'tokens_input',
        'tokens_output',
        'from_cache',
        'feedback',
        'response_time_ms',
        'detected_categories',
    ];

    protected $casts = [
        'from_cache' => 'boolean',
        'detected_categories' => 'array',
        'response_time_ms' => 'integer',
        'tokens_input' => 'integer',
        'tokens_output' => 'integer',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(SessionChat::class, 'session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
