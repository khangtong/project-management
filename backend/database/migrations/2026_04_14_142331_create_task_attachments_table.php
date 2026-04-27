<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('file_name');
            $table->string('file_url');
            $table->unsignedBigInteger('file_size')->nullable(); // bytes
            $table->string('mime_type')->nullable();
            $table->timestamps();

            $table->index('task_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_attachments');
    }
};