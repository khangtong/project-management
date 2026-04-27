<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->restrictOnDelete();
            $table->string('entity_type');   // e.g. "App\Models\Task"
            $table->uuid('entity_id');
            $table->string('action');        // e.g. "moved", "assigned", "commented"
            $table->jsonb('metadata')->nullable(); // extra context (old/new values, etc.)
            $table->timestamp('created_at');

            $table->index(['entity_type', 'entity_id']); // morph index
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};