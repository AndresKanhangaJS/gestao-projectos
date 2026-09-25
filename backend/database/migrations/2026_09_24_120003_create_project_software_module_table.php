<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Módulos do software abrangidos por um projecto. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_software_module', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('software_module_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['project_id', 'software_module_id'], 'project_software_module_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_software_module');
    }
};
