<?php

declare(strict_types=1);

namespace App\Http\Resources\Infra;

use App\Models\Infra\Credential;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Credential
 *
 * SEGURANÇA: esta resource NUNCA inclui o campo `secret`. O único caminho
 * para obter o segredo em texto simples é `POST /infra/credentials/{credential}/reveal`.
 */
class CredentialResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'credentialable_type' => $this->credentialable_type,
            'credentialable_id' => $this->credentialable_id,
            'type' => $this->type,
            'username' => $this->username,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
