<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Nunca expõe um URL público do ficheiro: `download_url` aponta (caminho
 * relativo, same-origin com a SPA) para o endpoint autenticado de download.
 */
class TaskAttachmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'original_name' => $this->original_name,
            'download_url' => route('projects.tasks.attachments.download', [
                'task' => $this->task_id,
                'attachment' => $this->id,
            ], false),
            'uploader' => UserSummaryResource::make($this->whenLoaded('uploader')),
            'created_at' => $this->created_at,
        ];
    }
}
