<?php

declare(strict_types=1);

namespace App\Models\Infra;

use App\Enums\Infra\ClientStatus;
use Database\Factories\Infra\ClientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'contact_name', 'contact_email', 'contact_phone', 'status', 'notes'])]
class Client extends Model
{
    /** @use HasFactory<ClientFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => ClientStatus::class,
        ];
    }

    /** Instâncias de software (cliente ↔ produto) deste cliente. */
    public function clientSoftware(): HasMany
    {
        return $this->hasMany(ClientSoftware::class);
    }
}
