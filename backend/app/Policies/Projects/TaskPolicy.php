<?php

declare(strict_types=1);

namespace App\Policies\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        return $this->isGlobalManager($user) || $task->project->workspace->hasMember($user);
    }

    /** Usado como `$this->authorize('create', [Task::class, $project])`. */
    public function create(User $user, Project $project): bool
    {
        return $this->isGlobalManager($user) || $this->isWorkspaceContributor($user, $project);
    }

    public function update(User $user, Task $task): bool
    {
        return $this->isGlobalManager($user) || $this->isWorkspaceContributor($user, $task->project);
    }

    /** Só gestores de projecto/admin (globais ou do workspace) podem apagar. */
    public function delete(User $user, Task $task): bool
    {
        return $this->isGlobalManager($user)
            || in_array($task->project->workspace->memberRole($user), [WorkspaceRole::Owner, WorkspaceRole::Manager], true);
    }

    private function isWorkspaceContributor(User $user, Project $project): bool
    {
        $role = $project->workspace->memberRole($user);

        return in_array($role, [WorkspaceRole::Owner, WorkspaceRole::Manager, WorkspaceRole::Member], true);
    }

    private function isGlobalManager(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'project_manager']);
    }
}
