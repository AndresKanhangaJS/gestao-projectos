<?php

declare(strict_types=1);

namespace App\Models\Infra;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo fino para o pivot `client_software_modules`, usado apenas quando é
 * preciso consultar/actualizar o flag `active` directamente (fora do
 * `belongsToMany` de `ClientSoftware`/`SoftwareModule`).
 */
#[Fillable(['client_software_id', 'software_module_id', 'active'])]
class ClientSoftwareModule extends Model
{
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function clientSoftware(): BelongsTo
    {
        return $this->belongsTo(ClientSoftware::class);
    }

    public function softwareModule(): BelongsTo
    {
        return $this->belongsTo(SoftwareModule::class);
    }
}
