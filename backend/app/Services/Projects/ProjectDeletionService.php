<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Models\Projects\Board;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\Projects\TaskAttachment;
use App\Models\Projects\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Remoção em massa de workspace/projecto/quadro.
 *
 * `tasks.board_column_id` é FK RESTRICT: apagar um quadro (ou, por cascata,
 * um projecto/workspace) com tarefas falha no MySQL. Por isso as tarefas
 * afectadas são apagadas explicitamente primeiro, dentro da mesma transacção.
 * Os restantes dependentes das tarefas (comentários, anexos, relações,
 * etiquetas, responsáveis, observadores) saem por FK ON DELETE CASCADE; os
 * ficheiros dos anexos (disco privado) são apagados só depois do commit.
 * Não se regista `task_deleted` numa remoção em massa.
 */
class ProjectDeletionService
{
    public function deleteBoard(Board $board): void
    {
        $this->run(
            Task::query()->whereIn('board_column_id', BoardColumn::query()->select('id')->where('board_id', $board->id)),
            fn () => $board->delete(),
        );
    }

    public function deleteProject(Project $project): void
    {
        $this->run(
            Task::query()->where('project_id', $project->id),
            fn () => $project->delete(),
        );
    }

    public function deleteWorkspace(Workspace $workspace): void
    {
        $this->run(
            Task::query()->whereIn('project_id', Project::query()->select('id')->where('workspace_id', $workspace->id)),
            fn () => $workspace->delete(),
        );
    }

    /**
     * @param  Builder<Task>  $tasks  tarefas a remover antes de apagar o agregado
     * @param  callable(): mixed  $deleteAggregate
     */
    private function run(Builder $tasks, callable $deleteAggregate): void
    {
        $paths = DB::transaction(function () use ($tasks, $deleteAggregate): array {
            $taskIds = (clone $tasks)->pluck('id')->all();

            $paths = TaskAttachment::query()->whereIn('task_id', $taskIds)->pluck('path')->all();

            if ($taskIds !== []) {
                // Auto-referência parent_id (SET NULL) numa remoção multi-linha: soltar
                // primeiro as subtarefas evita depender da ordem de cascata do motor.
                Task::query()->whereIn('parent_id', $taskIds)->update(['parent_id' => null]);
                Task::query()->whereIn('id', $taskIds)->delete();
            }

            $deleteAggregate();

            return $paths;
        });

        if ($paths !== []) {
            Storage::disk(TaskAttachment::DISK)->delete($paths);
        }
    }
}
