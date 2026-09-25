<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Enums\Projects\SprintStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\CompleteSprintRequest;
use App\Http\Requests\Projects\StoreSprintRequest;
use App\Http\Requests\Projects\UpdateSprintRequest;
use App\Http\Resources\Projects\SprintResource;
use App\Models\Projects\Project;
use App\Models\Projects\Sprint;
use App\Services\Projects\SprintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class SprintController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $sprints = $project->sprints()->withCount('tasks')->latest()->get();

        return SprintResource::collection($sprints)->response();
    }

    public function store(StoreSprintRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();
        $data['status'] ??= SprintStatus::Planned->value;

        $sprint = $project->sprints()->create($data);

        return SprintResource::make($sprint)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Sprint $sprint): JsonResponse
    {
        $this->authorize('view', $sprint->project);

        $sprint->loadCount('tasks');

        return SprintResource::make($sprint)->response();
    }

    public function update(UpdateSprintRequest $request, Sprint $sprint): JsonResponse
    {
        $sprint->update($request->validated());

        return SprintResource::make($sprint)->response();
    }

    /**
     * Conclui o sprint (atómico) e move as tarefas pendentes para o backlog ou
     * para outro sprint planeado. Resposta: `{ data: SprintResource, moved_count }`.
     */
    public function complete(CompleteSprintRequest $request, Sprint $sprint, SprintService $sprints): JsonResponse
    {
        $moved = $sprints->complete($sprint, $request->targetSprint(), $request->user());

        return SprintResource::make($sprint->loadCount('tasks'))
            ->additional(['moved_count' => $moved])
            ->response();
    }

    public function destroy(Sprint $sprint): Response
    {
        $this->authorize('manageSprints', $sprint->project);

        $sprint->delete();

        return response()->noContent();
    }
}
