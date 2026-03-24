<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Pgvector\Laravel\Vector;

class Chunk extends Model
{
    protected $fillable = [
        'document_id',
        'content',
        'page_number',
        'section',
        'token_count',
        'embedding',
    ];

    protected $casts = [
        'embedding' => Vector::class,
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
