<?php

declare(strict_types=1);

namespace App\Policies\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Project $project): bool
    {
        return $this->isGlobalManager($user) || $project->workspace->hasMember($user);
    }

    /** Usado como `$this->authorize('create', [Project::class, $workspace])`. */
    public function create(User $user, Workspace $workspace): bool
    {
        return $this->isGlobalManager($user)
            || in_array($workspace->memberRole($user), [WorkspaceRole::Owner, WorkspaceRole::Manager], true);
    }

    public function update(User $user, Project $project): bool
    {
        return $this->isGlobalManager($user)
            || in_array($project->workspace->memberRole($user), [WorkspaceRole::Owner, WorkspaceRole::Manager], true);
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }

    private function isGlobalManager(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'project_manager']);
    }
}
