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
        Schema::create('chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->onDelete('cascade');
            $table->text('content');
            $table->integer('page_number')->nullable();
            $table->string('section')->nullable();
            $table->integer('token_count')->nullable();
            if (config('database.default') === 'pgsql') {
                $table->vector('embedding', 768)->nullable();
            } else {
                $table->longText('embedding')->nullable(); // JSON serializado para MariaDB
            }
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chunks');
    }
};
