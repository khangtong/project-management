<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_assignees', function (Blueprint $table) {
            $table->foreignUuid('task_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['task_id', 'user_id']); // composite PK, no surrogate needed
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_assignees');
    }
};