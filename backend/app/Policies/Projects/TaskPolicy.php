<?php

declare(strict_types=1);

namespace App\Policies\Projects;

use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\User;

/** Regras ao nível da tarefa — delegam nas abilities do WorkspacePolicy. */
class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        return $user->can('view', $task->project->workspace);
    }

    /** Usado como `can('create', [Task::class, $project])`. */
    public function create(User $user, Project $project): bool
    {
        return $user->can('createTasks', $project->workspace);
    }

    public function update(User $user, Task $task): bool
    {
        return $user->can('createTasks', $task->project->workspace);
    }

    /** Só gestores de projecto/admin (globais ou do workspace) podem apagar. */
    public function delete(User $user, Task $task): bool
    {
        return $user->can('deleteTasks', $task->project->workspace);
    }
}
