<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use App\Models\Projects\ActivityLog;
use App\Models\Projects\Task;
use App\Services\Projects\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ActivityLog
 */
class ActivityLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ActivityLog $log */
        $log = $this->resource;
        $subject = $log->relationLoaded('subject') ? $log->subject : null;

        return [
            'id' => $log->id,
            'action' => $log->event->value,
            'description' => app(ActivityLogger::class)->describe($log),
            'actor' => $log->causer ? [
                'id' => $log->causer->id,
                'name' => $log->causer->name,
            ] : null,
            'task' => [
                'id' => $log->subject_id,
                'title' => $subject instanceof Task ? $subject->title : null,
                'deleted' => ! $subject instanceof Task,
            ],
            'changes' => $log->changes === null || $log->changes === [] ? null : (object) $log->changes,
            'created_at' => $log->created_at,
        ];
    }
}
