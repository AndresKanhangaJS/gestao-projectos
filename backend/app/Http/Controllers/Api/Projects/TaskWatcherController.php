<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Resources\Projects\UserSummaryResource;
use App\Models\Projects\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskWatcherController extends Controller
{
    /** Liga/desliga o utilizador autenticado como observador da tarefa. */
    public function toggle(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $user = $request->user();

        if ($task->watchers()->where('users.id', $user->id)->exists()) {
            $task->watchers()->detach($user->id);
        } else {
            $task->watchers()->attach($user->id);
        }

        return UserSummaryResource::collection($task->watchers()->get())->response();
    }
}
