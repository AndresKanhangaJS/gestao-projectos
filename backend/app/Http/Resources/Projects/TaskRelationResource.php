<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskRelationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'related_task_id' => $this->related_task_id,
            'type' => $this->type->value,
            'related_task' => TaskResource::make($this->whenLoaded('relatedTask')),
        ];
    }
}
