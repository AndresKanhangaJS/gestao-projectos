<?php

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            // Restrict: uma coluna não pode ser apagada enquanto tiver tarefas
            // (a aplicação deve obrigar a mover/apagar as tarefas primeiro).
            $table->foreignId('board_column_id')->constrained()->restrictOnDelete();
            $table->foreignId('sprint_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('tasks')->nullOnDelete();
            // Restrict: preserva o histórico de quem reportou a tarefa.
            $table->foreignId('reporter_id')->constrained('users')->restrictOnDelete();
            $table->string('type')->default(TaskType::Task->value);
            $table->string('priority')->default(TaskPriority::Medium->value);
            $table->string('title');
            $table->longText('description')->nullable();
            $table->decimal('estimate', 8, 2)->nullable();
            $table->date('starts_at')->nullable();
            $table->date('due_at')->nullable();
            $table->integer('position')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
