<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(768)');
        DB::statement('ALTER TABLE semantic_cache ALTER COLUMN embedding TYPE vector(768)');

        // Clear existing embeddings since dimensions changed
        DB::table('chunks')->update(['embedding' => null]);
        DB::table('semantic_cache')->truncate();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536)');
        DB::statement('ALTER TABLE semantic_cache ALTER COLUMN embedding TYPE vector(1536)');
    }
};
