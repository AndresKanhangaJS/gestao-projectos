<?php

declare(strict_types=1);

namespace App\Policies\Projects;

use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use App\Models\User;

/** Regras ao nível do projecto — delegam nas abilities do WorkspacePolicy. */
class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    /** Opções de ligação a software/cliente (`GET /projects/link-options`): quem cria/edita projectos. */
    public function linkOptions(User $user): bool
    {
        return $user->can('manageAny', Workspace::class);
    }

    public function view(User $user, Project $project): bool
    {
        return $user->can('view', $project->workspace);
    }

    /** Usado como `can('create', [Project::class, $workspace])`. */
    public function create(User $user, Workspace $workspace): bool
    {
        return $user->can('update', $workspace);
    }

    public function update(User $user, Project $project): bool
    {
        return $user->can('update', $project->workspace);
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }

    /** Quadros e colunas do projecto. */
    public function manageBoard(User $user, Project $project): bool
    {
        return $user->can('manageBoards', $project->workspace);
    }

    public function manageSprints(User $user, Project $project): bool
    {
        return $user->can('manageSprints', $project->workspace);
    }

    /** Criar etiquetas: quem pode criar tarefas (owner, manager, member). */
    public function createLabel(User $user, Project $project): bool
    {
        return $user->can('createTasks', $project->workspace);
    }

    /** Editar/apagar etiquetas: gestores (mesma regra dos quadros). */
    public function manageLabels(User $user, Project $project): bool
    {
        return $user->can('manageBoards', $project->workspace);
    }

    /** Pode apagar tarefas deste projecto (mesma regra de TaskPolicy::delete). */
    public function deleteTasks(User $user, Project $project): bool
    {
        return $user->can('deleteTasks', $project->workspace);
    }
}
