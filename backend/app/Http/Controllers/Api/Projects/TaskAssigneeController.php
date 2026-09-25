<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\SyncTaskAssigneesRequest;
use App\Http\Resources\Projects\UserSummaryResource;
use App\Models\Projects\Task;
use App\Services\Projects\ActivityLogger;
use App\Services\Projects\TaskNotifier;
use Illuminate\Http\JsonResponse;

class TaskAssigneeController extends Controller
{
    /** Substitui a lista de utilizadores atribuídos à tarefa. */
    public function sync(
        SyncTaskAssigneesRequest $request,
        Task $task,
        TaskNotifier $notifier,
        ActivityLogger $activity,
    ): JsonResponse {
        $changes = $task->assignees()->sync($request->validated('user_ids'));

        $activity->assigneesChanged($task, $changes['attached'], $changes['detached'], $request->user());
        $notifier->notifyNewAssignees($task, $request->user(), $changes['attached']);

        return UserSummaryResource::collection($task->assignees()->get())->response();
    }
}
