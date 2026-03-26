<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['name', 'slug'];

    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(Document::class, 'category_document');
    }

    public function brands(): HasMany
    {
        return $this->hasMany(Brand::class);
    }
}
