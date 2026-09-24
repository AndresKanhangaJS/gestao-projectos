<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Resources\Projects\ActivityLogResource;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use Illuminate\Http\JsonResponse;

/** Histórico de actividade (só leitura), paginado 20/pág., mais recentes primeiro. */
class ActivityLogController extends Controller
{
    private const int PER_PAGE = 20;

    public function forTask(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $logs = $task->activityLogs()
            ->with(['causer', 'subject'])
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE);

        return ActivityLogResource::collection($logs)->response();
    }

    public function forProject(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $logs = $project->activityLogs()
            ->with(['causer', 'subject'])
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE);

        return ActivityLogResource::collection($logs)->response();
    }
}
