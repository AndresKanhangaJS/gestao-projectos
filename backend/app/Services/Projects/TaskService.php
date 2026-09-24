<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\User;
use App\Notifications\Projects\TaskMoved;
use Illuminate\Support\Facades\DB;

/**
 * Regras de negócio das tarefas (criação, edição, etiquetas, subtarefas,
 * movimentação no quadro) + escrita do histórico de actividade.
 */
class TaskService
{
    public function __construct(
        private readonly ActivityLogger $activity,
        private readonly TaskNotifier $notifier,
    ) {}

    /**
     * @param  array<string, mixed>  $data  dados validados de StoreTaskRequest
     */
    public function create(Project $project, array $data, User $actor): Task
    {
        $labelIds = $this->pullLabelIds($data);

        $data['reporter_id'] ??= $actor->id;
        $data['priority'] ??= TaskPriority::Medium->value;
        $data['position'] ??= $this->nextPosition((int) $data['board_column_id']);

        return DB::transaction(function () use ($project, $data, $labelIds, $actor): Task {
            /** @var Task $task */
            $task = $project->tasks()->create($data);

            if ($labelIds !== null) {
                $task->labels()->sync($labelIds);
            }

            $this->activity->taskCreated($task, $actor);

            return $task;
        });
    }

    /**
     * @param  array<string, mixed>  $data  dados validados de UpdateTaskRequest
     */
    public function update(Task $task, array $data, User $actor): Task
    {
        $labelIds = $this->pullLabelIds($data);
        $before = $task->getRawOriginal();

        DB::transaction(function () use ($task, $data, $labelIds, $before, $actor): void {
            $task->update($data);
            $this->activity->taskUpdated($task, $before, $actor);

            if ($labelIds !== null) {
                $this->syncLabels($task, $labelIds, $actor);
            }
        });

        return $task;
    }

    /**
     * Substitui as etiquetas da tarefa e regista a alteração (se houver).
     *
     * @param  array<int, int>  $labelIds
     */
    public function syncLabels(Task $task, array $labelIds, User $actor): void
    {
        $changes = $task->labels()->sync($labelIds);

        $this->activity->labelsChanged($task, $changes['attached'], $changes['detached'], $actor);
    }

    /**
     * Cria uma subtarefa (parent_id = $parent->id). Por omissão herda a coluna e o sprint da tarefa-mãe.
     *
     * @param  array<string, mixed>  $data  dados validados de StoreSubtaskRequest
     */
    public function createSubtask(Task $parent, array $data, User $actor): Task
    {
        $data['parent_id'] = $parent->id;
        $data['sprint_id'] = $parent->sprint_id;
        $data['board_column_id'] ??= $parent->board_column_id;
        $data['reporter_id'] = $actor->id;
        $data['type'] ??= TaskType::Task->value;
        $data['priority'] ??= TaskPriority::Medium->value;
        $data['position'] = $this->nextPosition((int) $data['board_column_id']);

        return DB::transaction(function () use ($parent, $data, $actor): Task {
            /** @var Task $subtask */
            $subtask = $parent->project->tasks()->create($data);

            $this->activity->taskCreated($subtask, $actor);
            $this->activity->subtaskCreated($parent, $subtask, $actor);

            return $subtask;
        });
    }

    public function delete(Task $task, User $actor): void
    {
        DB::transaction(function () use ($task, $actor): void {
            $this->activity->taskDeleted($task, $actor);
            $task->delete();
        });
    }

    /**
     * Move a tarefa para outra coluna e/ou posição (drag-and-drop no quadro Kanban),
     * reordenando as tarefas vizinhas de forma transaccional.
     *
     * Só as mudanças de coluna (= mudança de estado) geram notificação e registo
     * de actividade; reordenar dentro da mesma coluna não gera ruído.
     */
    public function move(Task $task, int $targetColumnId, int $targetPosition, User $actor): Task
    {
        $originalColumnId = (int) $task->board_column_id;
        $columnChanged = $originalColumnId !== $targetColumnId;

        DB::transaction(function () use ($task, $originalColumnId, $targetColumnId, $targetPosition, $columnChanged, $actor): void {
            $originalPosition = (int) $task->position;

            if (! $columnChanged) {
                if ($targetPosition > $originalPosition) {
                    Task::where('board_column_id', $targetColumnId)
                        ->whereKeyNot($task->id)
                        ->whereBetween('position', [$originalPosition + 1, $targetPosition])
                        ->decrement('position');
                } elseif ($targetPosition < $originalPosition) {
                    Task::where('board_column_id', $targetColumnId)
                        ->whereKeyNot($task->id)
                        ->whereBetween('position', [$targetPosition, $originalPosition - 1])
                        ->increment('position');
                }
            } else {
                Task::where('board_column_id', $originalColumnId)
                    ->where('position', '>', $originalPosition)
                    ->decrement('position');

                Task::where('board_column_id', $targetColumnId)
                    ->where('position', '>=', $targetPosition)
                    ->increment('position');
            }

            $task->update([
                'board_column_id' => $targetColumnId,
                'position' => $targetPosition,
            ]);

            if ($columnChanged) {
                $this->activity->taskMoved(
                    $task,
                    BoardColumn::findOrFail($originalColumnId),
                    BoardColumn::findOrFail($targetColumnId),
                    $actor,
                );
            }
        });

        if ($columnChanged) {
            $this->notifier->notifyParticipants(
                $task,
                $actor,
                new TaskMoved($task, $actor, BoardColumn::findOrFail($targetColumnId)),
            );
        }

        return $task;
    }

    /** Posição no fim da coluna: 0 numa coluna vazia, senão max(position) + 1. */
    public function nextPosition(int $boardColumnId): int
    {
        $max = Task::query()->where('board_column_id', $boardColumnId)->max('position');

        return $max === null ? 0 : (int) $max + 1;
    }

    /**
     * Remove `label_ids` do payload (não é atributo do model).
     * null = não enviado (não mexer nas etiquetas); [] = remover todas.
     *
     * @param  array<string, mixed>  $data
     * @return array<int, int>|null
     */
    private function pullLabelIds(array &$data): ?array
    {
        if (! array_key_exists('label_ids', $data)) {
            return null;
        }

        $raw = (array) $data['label_ids'];
        unset($data['label_ids']);

        return array_values(array_map('intval', $raw));
    }
}
