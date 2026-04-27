<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('column_id')
                ->constrained('board_columns')
                ->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->date('due_date')->nullable();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['column_id', 'position']);
            $table->index('due_date');
            $table->index('priority');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};