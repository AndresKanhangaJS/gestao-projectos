<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Task;
use App\Models\Projects\Workspace;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Sincronização dos membros de um workspace. Quem sai do workspace ou fica
 * como leitor (viewer) deixa de poder ser responsável: é retirado como
 * responsável de todas as tarefas do workspace (com `assignees_changed`
 * registado por tarefa afectada, actor = quem fez a sync).
 */
class WorkspaceMemberService
{
    public function __construct(private readonly ActivityLogger $activity) {}

    /**
     * @param  array<int, array{user_id: int|string, role: string}>  $members
     */
    public function sync(Workspace $workspace, array $members, User $actor): void
    {
        $sync = collect($members)
            ->mapWithKeys(fn (array $member) => [(int) $member['user_id'] => ['role' => $member['role']]])
            ->all();

        DB::transaction(function () use ($workspace, $sync, $actor): void {
            $workspace->members()->sync($sync);

            $eligible = array_keys(array_filter(
                $sync,
                fn (array $pivot): bool => $pivot['role'] !== WorkspaceRole::Viewer->value,
            ));

            $this->removeIneligibleAssignees($workspace, $eligible, $actor);
        });
    }

    /**
     * @param  array<int, int>  $eligibleUserIds
     */
    private function removeIneligibleAssignees(Workspace $workspace, array $eligibleUserIds, User $actor): void
    {
        $tasks = Task::query()
            ->whereIn('project_id', $workspace->projects()->select('id'))
            ->whereHas('assignees', fn ($query) => $query->whereNotIn('users.id', $eligibleUserIds))
            ->with('assignees')
            ->get();

        foreach ($tasks as $task) {
            $removed = $task->assignees
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->reject(fn (int $id): bool => in_array($id, $eligibleUserIds, true))
                ->values()
                ->all();

            $task->assignees()->detach($removed);
            $this->activity->assigneesChanged($task, [], $removed, $actor);
        }
    }
}
