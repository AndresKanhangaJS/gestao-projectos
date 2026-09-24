<?php

declare(strict_types=1);

namespace App\Models\Infra;

use App\Enums\Infra\ClientSoftwareStatus;
use Database\Factories\Infra\ClientSoftwareFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Instância de um SoftwareProduct num Client (ex.: "Level-School (Pitruca)").
 */
#[Fillable(['client_id', 'software_product_id', 'status', 'activated_at', 'notes'])]
class ClientSoftware extends Model
{
    /** @use HasFactory<ClientSoftwareFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => ClientSoftwareStatus::class,
            'activated_at' => 'date',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function softwareProduct(): BelongsTo
    {
        return $this->belongsTo(SoftwareProduct::class);
    }

    /** Módulos activos/inactivos nesta instância. */
    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(SoftwareModule::class, 'client_software_modules')
            ->withPivot('active')
            ->withTimestamps();
    }

    /** Onde esta instância está implantada. */
    public function deployments(): HasMany
    {
        return $this->hasMany(Deployment::class);
    }
}
