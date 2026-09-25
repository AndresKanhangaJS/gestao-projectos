<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Enums\Projects\SprintStatus;
use App\Models\Projects\Sprint;
use App\Models\Projects\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Regras de negócio dos sprints que vão além de um CRUD simples. */
class SprintService
{
    public function __construct(private readonly ActivityLogger $activity) {}

    /**
     * Conclui o sprint de forma atómica: marca-o como `completed` e move as
     * tarefas pendentes (fora de colunas `is_done_column`) para o backlog
     * (`$target = null`) ou para o sprint `$target`. Cada tarefa movida fica
     * registada como `task_updated` (alteração de sprint) no histórico.
     *
     * @return int número de tarefas movidas
     */
    public function complete(Sprint $sprint, ?Sprint $target, User $actor): int
    {
        return DB::transaction(function () use ($sprint, $target, $actor): int {
            $pending = Task::query()
                ->where('sprint_id', $sprint->id)
                ->whereHas('boardColumn', fn ($query) => $query->where('is_done_column', false))
                ->lockForUpdate()
                ->get();

            foreach ($pending as $task) {
                $before = $task->getRawOriginal();
                $task->update(['sprint_id' => $target?->id]);
                $this->activity->taskUpdated($task, $before, $actor);
            }

            $sprint->update(['status' => SprintStatus::Completed]);

            return $pending->count();
        });
    }
}
