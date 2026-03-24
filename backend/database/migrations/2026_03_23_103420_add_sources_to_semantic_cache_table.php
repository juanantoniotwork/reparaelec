<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('semantic_cache', function (Blueprint $table) {
            $table->json('sources')->nullable()->after('response');
        });
    }

    public function down(): void
    {
        Schema::table('semantic_cache', function (Blueprint $table) {
            $table->dropColumn('sources');
        });
    }
};
