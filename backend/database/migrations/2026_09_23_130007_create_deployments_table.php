<?php

use App\Enums\Infra\DeploymentComponent;
use App\Enums\Infra\DeploymentStatus;
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
        Schema::create('deployments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_software_id')->constrained()->cascadeOnDelete();
            $table->foreignId('software_module_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('machine_id')->constrained()->cascadeOnDelete();
            $table->string('component')->default(DeploymentComponent::Full->value);
            $table->integer('port')->nullable();
            $table->string('stack')->nullable();
            $table->string('database_engine')->nullable();
            $table->string('database_name')->nullable();
            $table->string('database_host')->nullable();
            $table->string('environment_type');
            $table->text('start_command')->nullable();
            $table->string('status')->default(DeploymentStatus::Activo->value);
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deployments');
    }
};
