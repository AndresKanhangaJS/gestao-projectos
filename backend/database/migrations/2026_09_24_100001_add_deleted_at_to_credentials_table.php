<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Soft delete de credenciais: preserva o histórico de acessos
 * (`credential_access_logs`, FK cascadeOnDelete) — um soft delete não apaga a
 * linha, logo a cascata SQL nunca dispara e a auditoria sobrevive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credentials', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('credentials', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
