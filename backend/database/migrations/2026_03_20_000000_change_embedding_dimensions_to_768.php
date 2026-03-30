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
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(768)');
            DB::statement('ALTER TABLE semantic_cache ALTER COLUMN embedding TYPE vector(768)');
        }
        // En MariaDB la columna ya es LONGTEXT desde la migración inicial — solo limpiar datos
        DB::table('chunks')->update(['embedding' => null]);
        DB::table('semantic_cache')->truncate();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536)');
            DB::statement('ALTER TABLE semantic_cache ALTER COLUMN embedding TYPE vector(1536)');
        }
    }
};
