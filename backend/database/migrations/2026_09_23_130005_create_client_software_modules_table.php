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
        Schema::create('client_software_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_software_id')->constrained()->cascadeOnDelete();
            $table->foreignId('software_module_id')->constrained()->cascadeOnDelete();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['client_software_id', 'software_module_id'], 'client_software_modules_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_software_modules');
    }
};
