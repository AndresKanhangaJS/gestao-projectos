<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status->value,
            'tasks_count' => $this->whenCounted('tasks'),
            'boards_count' => $this->whenCounted('boards'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
