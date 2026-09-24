<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O histórico por projecto (`GET /projects/{project}/activity`) tem de continuar
 * a mostrar a actividade de tarefas entretanto apagadas; por isso o projecto é
 * desnormalizado no próprio registo em vez de derivado do `subject`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('id')->constrained('projects')->cascadeOnDelete();
            $table->index(['project_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropForeign(['project_id']);
            $table->dropIndex(['project_id', 'id']);
            $table->dropColumn('project_id');
        });
    }
};
