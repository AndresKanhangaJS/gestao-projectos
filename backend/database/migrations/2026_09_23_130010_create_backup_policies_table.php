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
        Schema::create('backup_policies', function (Blueprint $table) {
            $table->id();
            $table->string('backupable_type');
            $table->unsignedBigInteger('backupable_id');
            $table->string('frequency');
            $table->integer('retention_count');
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamps();

            $table->index(['backupable_type', 'backupable_id'], 'backup_policies_backupable_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('backup_policies');
    }
};
