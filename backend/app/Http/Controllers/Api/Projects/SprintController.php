<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Enums\Projects\SprintStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreSprintRequest;
use App\Http\Requests\Projects\UpdateSprintRequest;
use App\Http\Resources\Projects\SprintResource;
use App\Models\Projects\Project;
use App\Models\Projects\Sprint;
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
        $this->authorize('update', $project);

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
        $this->authorize('update', $sprint->project);

        $sprint->update($request->validated());

        return SprintResource::make($sprint)->response();
    }

    public function destroy(Sprint $sprint): Response
    {
        $this->authorize('delete', $sprint->project);

        $sprint->delete();

        return response()->noContent();
    }
}
