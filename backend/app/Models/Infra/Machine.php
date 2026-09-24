<?php

declare(strict_types=1);

namespace App\Models\Infra;

use App\Enums\Infra\MachineAccessType;
use App\Enums\Infra\MachineEnvironment;
use Database\Factories\Infra\MachineFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'name',
    'ip_address',
    'operating_system',
    'access_type',
    'access_user',
    'environment',
    'notes',
])]
class Machine extends Model
{
    /** @use HasFactory<MachineFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'access_type' => MachineAccessType::class,
            'environment' => MachineEnvironment::class,
        ];
    }

    public function deployments(): HasMany
    {
        return $this->hasMany(Deployment::class);
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
