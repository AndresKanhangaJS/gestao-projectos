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
        Schema::create('credentials', function (Blueprint $table) {
            $table->id();
            $table->string('credentialable_type');
            $table->unsignedBigInteger('credentialable_id');
            $table->string('type');
            $table->string('username')->nullable();
            $table->text('secret')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['credentialable_type', 'credentialable_id'], 'credentials_credentialable_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credentials');
    }
};
