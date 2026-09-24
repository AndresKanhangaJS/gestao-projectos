<?php

declare(strict_types=1);

namespace App\Models\Infra;

use App\Enums\Infra\DeploymentComponent;
use App\Enums\Infra\DeploymentStatus;
use App\Enums\Infra\MachineEnvironment;
use Database\Factories\Infra\DeploymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'client_software_id',
    'software_module_id',
    'machine_id',
    'component',
    'port',
    'stack',
    'database_engine',
    'database_name',
    'database_host',
    'environment_type',
    'start_command',
    'status',
    'last_checked_at',
])]
class Deployment extends Model
{
    /** @use HasFactory<DeploymentFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'component' => DeploymentComponent::class,
            'environment_type' => MachineEnvironment::class,
            'status' => DeploymentStatus::class,
            'last_checked_at' => 'datetime',
        ];
    }

    public function clientSoftware(): BelongsTo
    {
        return $this->belongsTo(ClientSoftware::class);
    }

    /** Módulo específico deste deployment; null quando cobre o software inteiro. */
    public function softwareModule(): BelongsTo
    {
        return $this->belongsTo(SoftwareModule::class);
    }

    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class);
    }

    public function credentials(): MorphMany
    {
        return $this->morphMany(Credential::class, 'credentialable');
    }

    public function backupPolicies(): MorphMany
    {
        return $this->morphMany(BackupPolicy::class, 'backupable');
    }
}
