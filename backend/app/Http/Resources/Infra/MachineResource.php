<?php

declare(strict_types=1);

namespace App\Http\Resources\Infra;

use App\Models\Infra\Machine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Machine
 */
class MachineResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'ip_address' => $this->ip_address,
            'operating_system' => $this->operating_system,
            'access_type' => $this->access_type,
            'access_user' => $this->access_user,
            'environment' => $this->environment,
            'notes' => $this->notes,
            'deployments' => DeploymentResource::collection($this->whenLoaded('deployments')),
            'credentials' => CredentialResource::collection($this->whenLoaded('credentials')),
            'backup_policies' => BackupPolicyResource::collection($this->whenLoaded('backupPolicies')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
