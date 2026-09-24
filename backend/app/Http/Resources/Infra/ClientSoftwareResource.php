<?php

declare(strict_types=1);

namespace App\Http\Resources\Infra;

use App\Models\Infra\ClientSoftware;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ClientSoftware
 */
class ClientSoftwareResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_id' => $this->client_id,
            'software_product_id' => $this->software_product_id,
            'status' => $this->status,
            'activated_at' => $this->activated_at,
            'notes' => $this->notes,
            'client' => new ClientResource($this->whenLoaded('client')),
            'software_product' => new SoftwareProductResource($this->whenLoaded('softwareProduct')),
            'modules' => SoftwareModuleResource::collection($this->whenLoaded('modules')),
            'deployments' => DeploymentResource::collection($this->whenLoaded('deployments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
