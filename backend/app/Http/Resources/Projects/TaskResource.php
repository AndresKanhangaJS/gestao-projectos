<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'board_column_id' => $this->board_column_id,
            'sprint_id' => $this->sprint_id,
            'parent_id' => $this->parent_id,
            'type' => $this->type->value,
            'priority' => $this->priority->value,
            'title' => $this->title,
            'description' => $this->description,
            'estimate' => $this->estimate,
            'starts_at' => $this->starts_at?->toDateString(),
            'due_at' => $this->due_at?->toDateString(),
            'position' => $this->position,
            'column' => $this->whenLoaded('boardColumn', fn () => $this->boardColumn ? [
                'id' => $this->boardColumn->id,
                'name' => $this->boardColumn->name,
                'is_done_column' => $this->boardColumn->is_done_column,
            ] : null),
            'reporter' => UserSummaryResource::make($this->whenLoaded('reporter')),
            'assignees' => UserSummaryResource::collection($this->whenLoaded('assignees')),
            'watchers' => UserSummaryResource::collection($this->whenLoaded('watchers')),
            'labels' => LabelResource::collection($this->whenLoaded('labels')),
            'comments' => TaskCommentResource::collection($this->whenLoaded('comments')),
            'subtasks' => SubtaskResource::collection($this->whenLoaded('children')),
            'comments_count' => $this->whenCounted('comments'),
            'subtasks_count' => $this->whenCounted('children'),
            'attachments_count' => $this->whenCounted('attachments'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
