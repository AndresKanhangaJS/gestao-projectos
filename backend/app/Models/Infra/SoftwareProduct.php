<?php

declare(strict_types=1);

namespace App\Models\Infra;

use Database\Factories\Infra\SoftwareProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'category', 'description'])]
class SoftwareProduct extends Model
{
    /** @use HasFactory<SoftwareProductFactory> */
    use HasFactory;

    /**
     * Módulos que compõem este produto de software.
     *
     * @return HasMany<SoftwareModule, $this>
     */
    public function modules(): HasMany
    {
        return $this->hasMany(SoftwareModule::class);
    }

    /**
     * Instâncias deste produto em clientes.
     *
     * @return HasMany<ClientSoftware, $this>
     */
    public function clientSoftware(): HasMany
    {
        return $this->hasMany(ClientSoftware::class);
    }
}
