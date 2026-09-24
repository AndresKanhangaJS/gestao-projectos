<?php

declare(strict_types=1);

namespace App\Models\Infra;

use Database\Factories\Infra\SoftwareModuleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['software_product_id', 'name', 'description'])]
class SoftwareModule extends Model
{
    /** @use HasFactory<SoftwareModuleFactory> */
    use HasFactory;

    /** Produto a que este módulo pertence. */
    public function softwareProduct(): BelongsTo
    {
        return $this->belongsTo(SoftwareProduct::class);
    }

    /** Instâncias cliente↔software onde este módulo está activo/inactivo. */
    public function clientSoftware(): BelongsToMany
    {
        return $this->belongsToMany(ClientSoftware::class, 'client_software_modules')
            ->withPivot('active')
            ->withTimestamps();
    }

    /** Deployments específicos deste módulo (componente isolado numa máquina). */
    public function deployments(): HasMany
    {
        return $this->hasMany(Deployment::class);
    }
}
