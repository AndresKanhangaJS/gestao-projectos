<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use App\Models\Projects\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * `my_role` = papel do utilizador autenticado no workspace do projecto (ou null);
 * `can` = permissões calculadas pelas Policies (a UI usa-as só para esconder
 * acções — a API continua a ser a única barreira);
 * `active_sprint` = o sprint com status `active` do projecto (ou null).
 */
class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();
        $activeSprint = $this->activeSprint;

        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status->value,
            'tasks_count' => $this->whenCounted('tasks'),
            'boards_count' => $this->whenCounted('boards'),
            'software_product' => $this->softwareProduct
                ? ['id' => $this->softwareProduct->id, 'name' => $this->softwareProduct->name]
                : null,
            'client' => $this->client ? ['id' => $this->client->id, 'name' => $this->client->name] : null,
            'modules' => $this->modules
                ->sortBy('name')
                ->map(fn ($module): array => ['id' => $module->id, 'name' => $module->name])
                ->values()
                ->all(),
            'active_sprint' => $activeSprint ? [
                'id' => $activeSprint->id,
                'name' => $activeSprint->name,
                'starts_at' => $activeSprint->starts_at?->toDateString(),
                'ends_at' => $activeSprint->ends_at?->toDateString(),
                'goal' => $activeSprint->goal,
            ] : null,
            'my_role' => $user ? $this->workspace->memberRole($user)?->value : null,
            'can' => [
                'create_task' => (bool) $user?->can('create', [Task::class, $this->resource]),
                'create_label' => (bool) $user?->can('createLabel', $this->resource),
                'delete_task' => (bool) $user?->can('deleteTasks', $this->resource),
                'manage_board' => (bool) $user?->can('manageBoard', $this->resource),
                'manage_sprints' => (bool) $user?->can('manageSprints', $this->resource),
                'manage_members' => (bool) $user?->can('manageMembers', $this->workspace),
                // Editar o projecto (nome, estado, ligação a software/cliente/módulos): ProjectPolicy::update.
                'update_project' => (bool) $user?->can('update', $this->resource),
            ],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
