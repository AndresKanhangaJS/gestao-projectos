<?php

declare(strict_types=1);

namespace App\Http\Resources\Infra;

use App\Models\Infra\Deployment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Deployment
 */
class DeploymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_software_id' => $this->client_software_id,
            'software_module_id' => $this->software_module_id,
            'machine_id' => $this->machine_id,
            'component' => $this->component,
            'port' => $this->port,
            'stack' => $this->stack,
            'database_engine' => $this->database_engine,
            'database_name' => $this->database_name,
            'database_host' => $this->database_host,
            'environment_type' => $this->environment_type,
            'start_command' => $this->start_command,
            'status' => $this->status,
            'last_checked_at' => $this->last_checked_at,
            'client_software' => new ClientSoftwareResource($this->whenLoaded('clientSoftware')),
            'software_module' => new SoftwareModuleResource($this->whenLoaded('softwareModule')),
            'machine' => new MachineResource($this->whenLoaded('machine')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
