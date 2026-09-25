<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\IndexProjectRequest;
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
    /** Relações usadas por ProjectResource (active_sprint, my_role, can). */
    private const array RESOURCE_RELATIONS = ['activeSprint', 'workspace.members', 'softwareProduct', 'client', 'modules'];

    public function index(IndexProjectRequest $request, Workspace $workspace): JsonResponse
    {
        $workspace->loadMissing('members');
        $filters = $request->validated();

        $projects = $workspace->projects()
            ->with(['activeSprint', 'softwareProduct', 'client', 'modules'])
            ->when($filters['client_id'] ?? null, fn ($query, $id) => $query->where('client_id', (int) $id))
            ->when($filters['software_product_id'] ?? null, fn ($query, $id) => $query->where('software_product_id', (int) $id))
            ->withCount(['tasks', 'boards'])
            ->latest()
            ->get()
            // Partilha a mesma instância (com membros carregados) para o cálculo de my_role/can sem N+1.
            ->each(function (Project $project) use ($workspace): void {
                $project->setRelation('workspace', $workspace);
            });

        return ProjectResource::collection($projects)->response();
    }

    /** Cria o projecto com um quadro por omissão e colunas por omissão (ver ProjectService). */
    public function store(StoreProjectRequest $request, Workspace $workspace, ProjectService $projects): JsonResponse
    {
        $project = $projects->create($workspace, $request->validated());

        return ProjectResource::make($project->load(self::RESOURCE_RELATIONS)->loadCount(['tasks', 'boards']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(self::RESOURCE_RELATIONS)->loadCount(['tasks', 'boards']);

        return ProjectResource::make($project)->response();
    }

    public function update(UpdateProjectRequest $request, Project $project, ProjectService $projects): JsonResponse
    {
        $projects->update($project, $request->validated());

        return ProjectResource::make($project->load(self::RESOURCE_RELATIONS))->response();
    }

    public function destroy(Project $project, ProjectDeletionService $deletion): Response
    {
        $this->authorize('delete', $project);

        // Remove primeiro as tarefas (FK restrict em board_column_id) — ver ProjectDeletionService.
        $deletion->deleteProject($project);

        return response()->noContent();
    }
}
