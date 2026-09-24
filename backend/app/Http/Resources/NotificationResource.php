<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;

/**
 * Notificação in-app, com o conteúdo de `data` achatado no nível superior.
 *
 * @mixin DatabaseNotification
 */
class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $data */
        $data = $this->data ?? [];

        return [
            'id' => $this->id,
            'kind' => $data['kind'] ?? null,
            'message' => $data['message'] ?? null,
            'task_id' => $data['task_id'] ?? null,
            'task_title' => $data['task_title'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'actor' => $data['actor'] ?? null,
            'read_at' => $this->read_at?->toJSON(),
            'created_at' => $this->created_at?->toJSON(),
        ];
    }
}
