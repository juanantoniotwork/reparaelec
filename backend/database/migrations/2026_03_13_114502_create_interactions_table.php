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
        Schema::create('interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('sessions_chat')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('query');
            $table->text('response');
            $table->string('model_used')->default('haiku');
            $table->integer('tokens_input')->nullable();
            $table->integer('tokens_output')->nullable();
            $table->boolean('from_cache')->default(false);
            $table->enum('feedback', ['positive', 'negative'])->nullable();
            $table->integer('response_time_ms')->nullable();
            $table->json('detected_categories')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('interactions');
    }
};
