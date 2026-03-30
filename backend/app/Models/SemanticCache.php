<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Pgvector\Laravel\Vector;

class SemanticCache extends Model
{
    protected $table = 'semantic_cache';

    protected $fillable = [
        'query',
        'response',
        'sources',
        'embedding',
        'category_ids',
        'hit_count',
    ];

    protected function casts(): array
    {
        return [
            'category_ids' => 'array',
            'sources'      => 'array',
            'hit_count'    => 'integer',
            'embedding'    => config('database.default') === 'pgsql' ? Vector::class : 'array',
        ];
    }
}
