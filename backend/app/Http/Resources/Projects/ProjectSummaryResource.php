<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Resumo de um projecto para vistas cruzadas (ex.: overview de cliente/software no módulo Infra). */
class ProjectSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'name' => $this->name,
            'status' => $this->status->value,
            'workspace_id' => $this->workspace_id,
        ];
    }
}
