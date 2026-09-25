<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use App\Models\Projects\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * `my_role` = papel do utilizador autenticado neste workspace (ou null);
 * `can` = as mesmas chaves de ProjectResource.can, calculadas pelas abilities
 * de workspace do WorkspacePolicy (válidas para todos os projectos do workspace).
 */
class WorkspaceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'owner' => UserSummaryResource::make($this->whenLoaded('owner')),
            'my_role' => $user ? $this->memberRole($user)?->value : null,
            'can' => [
                'create_task' => (bool) $user?->can('createTasks', $this->resource),
                'create_label' => (bool) $user?->can('createTasks', $this->resource),
                'delete_task' => (bool) $user?->can('deleteTasks', $this->resource),
                'manage_board' => (bool) $user?->can('manageBoards', $this->resource),
                'manage_sprints' => (bool) $user?->can('manageSprints', $this->resource),
                'manage_members' => (bool) $user?->can('manageMembers', $this->resource),
                // Só no workspace: ProjectPolicy::create (globais admin/project_manager, owner, manager).
                'create_project' => (bool) $user?->can('create', [Project::class, $this->resource]),
                // Editar os projectos deste workspace: ProjectPolicy::update delega em WorkspacePolicy::update.
                'update_project' => (bool) $user?->can('update', $this->resource),
            ],
            'members_count' => $this->whenCounted('members'),
            'projects_count' => $this->whenCounted('projects'),
            'members' => WorkspaceMemberResource::collection($this->whenLoaded('members')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
