<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Category extends Model
{
    protected $fillable = ['name', 'slug'];

    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(Document::class, 'category_document');
    }
}
