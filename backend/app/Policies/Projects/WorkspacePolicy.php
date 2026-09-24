<?php

declare(strict_types=1);

namespace App\Policies\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Workspace;
use App\Models\User;

class WorkspacePolicy
{
    /** Qualquer utilizador autenticado pode listar os workspaces de que é membro. */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Workspace $workspace): bool
    {
        return $this->isGlobalManager($user) || $workspace->hasMember($user);
    }

    /** Qualquer utilizador autenticado pode criar um workspace (torna-se o dono). */
    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Workspace $workspace): bool
    {
        return $this->isGlobalManager($user)
            || $workspace->owner_id === $user->id
            || in_array($workspace->memberRole($user), [WorkspaceRole::Owner, WorkspaceRole::Manager], true);
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        return $this->isGlobalManager($user) || $workspace->owner_id === $user->id;
    }

    /** Gerir membros (adicionar/remover/alterar papel). */
    public function manageMembers(User $user, Workspace $workspace): bool
    {
        return $this->update($user, $workspace);
    }

    private function isGlobalManager(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'project_manager']);
    }
}
