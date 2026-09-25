<?php

declare(strict_types=1);

namespace App\Policies\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Workspace;
use App\Models\User;

/**
 * Fonte única das regras de permissão do módulo de Gestão de Projectos
 * baseadas no papel do utilizador no workspace. ProjectPolicy e TaskPolicy
 * delegam nas abilities "de workspace" daqui (createTasks, deleteTasks,
 * manageBoards, manageSprints, manageMembers) para que as regras não divirjam.
 *
 * Papéis globais `admin`/`project_manager` têm acesso de gestão total.
 */
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

    /**
     * Só admin/project_manager globais criam workspaces (o criador torna-se o
     * dono). Um utilizador comum não pode criar um workspace para depois
     * ganhar acesso à pesquisa de utilizadores (`searchUsers`).
     */
    public function create(User $user): bool
    {
        return $this->isGlobalManager($user);
    }

    public function update(User $user, Workspace $workspace): bool
    {
        return $this->isWorkspaceManager($user, $workspace);
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        return $this->isGlobalManager($user) || $workspace->owner_id === $user->id;
    }

    /** Gerir membros (adicionar/remover/alterar papel). */
    public function manageMembers(User $user, Workspace $workspace): bool
    {
        return $this->isWorkspaceManager($user, $workspace);
    }

    /**
     * Pesquisar utilizadores para adicionar a um workspace
     * (`GET /projects/users`): quem gere membros em pelo menos um workspace.
     */
    public function searchUsers(User $user): bool
    {
        return $this->manageAny($user);
    }

    /**
     * Gere pelo menos um workspace (owner/manager/dono) ou é admin/project_manager
     * global — i.e. pode criar ou editar projectos em algum lado.
     */
    public function manageAny(User $user): bool
    {
        if ($this->isGlobalManager($user) || $user->ownedWorkspaces()->exists()) {
            return true;
        }

        return $user->workspaces()
            ->wherePivotIn('role', [WorkspaceRole::Owner->value, WorkspaceRole::Manager->value])
            ->exists();
    }

    /** Criar/editar/mover tarefas (owner, manager, member — nunca viewer). */
    public function createTasks(User $user, Workspace $workspace): bool
    {
        return $this->isGlobalManager($user)
            || in_array($workspace->memberRole($user), [WorkspaceRole::Owner, WorkspaceRole::Manager, WorkspaceRole::Member], true);
    }

    /**
     * Atribuir o papel `owner` a alguém (na sync de membros): só o dono do
     * workspace ou um admin global — nunca um manager nem um project_manager.
     */
    public function assignOwnerRole(User $user, Workspace $workspace): bool
    {
        return $user->hasRole('admin')
            || $workspace->owner_id === $user->id
            || $workspace->memberRole($user) === WorkspaceRole::Owner;
    }

    /** Apagar tarefas: só gestores (globais ou do workspace). */
    public function deleteTasks(User $user, Workspace $workspace): bool
    {
        return $this->isWorkspaceManager($user, $workspace);
    }

    /** Criar/editar/apagar quadros e colunas. */
    public function manageBoards(User $user, Workspace $workspace): bool
    {
        return $this->isWorkspaceManager($user, $workspace);
    }

    /** Criar/editar/apagar sprints. */
    public function manageSprints(User $user, Workspace $workspace): bool
    {
        return $this->isWorkspaceManager($user, $workspace);
    }

    private function isWorkspaceManager(User $user, Workspace $workspace): bool
    {
        return $this->isGlobalManager($user)
            || $workspace->owner_id === $user->id
            || in_array($workspace->memberRole($user), [WorkspaceRole::Owner, WorkspaceRole::Manager], true);
    }

    private function isGlobalManager(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'project_manager']);
    }
}
