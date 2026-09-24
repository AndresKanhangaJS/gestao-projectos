<?php

declare(strict_types=1);

namespace App\Http\Resources\Infra;

use App\Models\Infra\CredentialAccessLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CredentialAccessLog
 *
 * Nunca inclui o segredo — só quem acedeu, de onde e quando.
 */
class CredentialAccessLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'credential_id' => $this->credential_id,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ] : null,
            'ip_address' => $this->ip_address,
            'accessed_at' => $this->accessed_at,
            'created_at' => $this->created_at,
        ];
    }
}
