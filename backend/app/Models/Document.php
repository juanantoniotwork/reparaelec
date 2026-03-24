<?php

namespace App\Models;

use App\Enums\DocumentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    protected $fillable = [
        'title',
        'original_filename',
        'file_path',
        'mime_type',
        'size',
        'status',
        'summary',
        'uploaded_by',
    ];

    protected $casts = [
        'status' => DocumentStatus::class,
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_document');
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(Chunk::class);
    }
}
