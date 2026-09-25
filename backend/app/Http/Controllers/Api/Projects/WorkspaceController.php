<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreWorkspaceRequest;
use App\Http\Requests\Projects\SyncWorkspaceMembersRequest;
use App\Http\Requests\Projects\UpdateWorkspaceRequest;
use App\Http\Resources\Projects\WorkspaceResource;
use App\Models\Projects\Workspace;
use App\Services\Projects\ProjectDeletionService;
use App\Services\Projects\WorkspaceMemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class WorkspaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = $user->hasAnyRole(['admin', 'project_manager'])
            ? Workspace::query()
            : $user->workspaces()->getQuery();

        $workspaces = $query->with(['owner', 'members'])->withCount(['members', 'projects'])->latest()->get();

        return WorkspaceResource::collection($workspaces)->response();
    }

    public function store(StoreWorkspaceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name']);
        $data['owner_id'] = $request->user()->id;

        $workspace = Workspace::create($data);
        $workspace->members()->attach($request->user()->id, ['role' => WorkspaceRole::Owner->value]);

        return WorkspaceResource::make($workspace->fresh(['owner', 'members']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        $workspace->loadCount(['members', 'projects'])->load(['owner', 'members']);

        return WorkspaceResource::make($workspace)->response();
    }

    public function update(UpdateWorkspaceRequest $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validated();
        if (array_key_exists('slug', $data) && $data['slug']) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $workspace->id);
        }

        $workspace->update($data);

        return WorkspaceResource::make($workspace->fresh(['owner', 'members']))->response();
    }

    public function destroy(Workspace $workspace, ProjectDeletionService $deletion): Response
    {
        $this->authorize('delete', $workspace);

        // Remove primeiro as tarefas (FK restrict em board_column_id) — ver ProjectDeletionService.
        $deletion->deleteWorkspace($workspace);

        return response()->noContent();
    }

    /** Substitui a lista de membros do workspace e os respectivos papéis. */
    public function syncMembers(
        SyncWorkspaceMembersRequest $request,
        Workspace $workspace,
        WorkspaceMemberService $members,
    ): JsonResponse {
        // Retira também responsáveis que saíram ou passaram a leitor (ver WorkspaceMemberService).
        $members->sync($workspace, $request->validated('members'), $request->user());

        return WorkspaceResource::make($workspace->fresh(['owner', 'members']))->response();
    }

    private function uniqueSlug(string $source, ?int $ignoreId = null): string
    {
        $base = Str::slug($source);
        $slug = $base;
        $suffix = 1;

        while (Workspace::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.(++$suffix);
        }

        return $slug;
    }
}
