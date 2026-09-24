<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Http\Resources\Projects\ProjectResource;
use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use App\Services\Projects\ProjectDeletionService;
use App\Services\Projects\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ProjectController extends Controller
{
    public function index(Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        $projects = $workspace->projects()->withCount(['tasks', 'boards'])->latest()->get();

        return ProjectResource::collection($projects)->response();
    }

    /** Cria o projecto com um quadro por omissão e colunas por omissão (ver ProjectService). */
    public function store(StoreProjectRequest $request, Workspace $workspace, ProjectService $projects): JsonResponse
    {
        $this->authorize('create', [Project::class, $workspace]);

        $project = $projects->create($workspace, $request->validated());

        return ProjectResource::make($project->loadCount(['tasks', 'boards']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->loadCount(['tasks', 'boards']);

        return ProjectResource::make($project)->response();
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $project->update($request->validated());

        return ProjectResource::make($project)->response();
    }

    public function destroy(Project $project, ProjectDeletionService $deletion): Response
    {
        $this->authorize('delete', $project);

        // Remove primeiro as tarefas (FK restrict em board_column_id) — ver ProjectDeletionService.
        $deletion->deleteProject($project);

        return response()->noContent();
    }
}
