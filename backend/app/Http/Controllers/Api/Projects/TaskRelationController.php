<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreTaskRelationRequest;
use App\Http\Resources\Projects\TaskRelationResource;
use App\Models\Projects\Task;
use App\Models\Projects\TaskRelation;
use App\Services\Projects\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TaskRelationController extends Controller
{
    public function index(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $relations = $task->relationsFrom()->with('relatedTask')->get();

        return TaskRelationResource::collection($relations)->response();
    }

    public function store(StoreTaskRelationRequest $request, Task $task, ActivityLogger $activity): JsonResponse
    {
        $this->authorize('update', $task);

        /** @var TaskRelation $relation */
        $relation = $task->relationsFrom()->create($request->validated());
        $relation->load('relatedTask');

        $activity->relationAdded($task, $relation, $request->user());

        return TaskRelationResource::make($relation)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(Request $request, Task $task, TaskRelation $relation, ActivityLogger $activity): Response
    {
        $this->authorize('update', $task);

        abort_unless($relation->task_id === $task->id, Response::HTTP_NOT_FOUND);

        $relation->load('relatedTask');
        $activity->relationRemoved($task, $relation, $request->user());
        $relation->delete();

        return response()->noContent();
    }
}
