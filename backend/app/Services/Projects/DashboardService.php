<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Contagens agregadas para o painel do módulo de Gestão de Projectos,
 * limitadas aos projectos visíveis ao utilizador (Project::visibleTo).
 */
class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        $projectIds = Project::query()->visibleTo($user)->pluck('id');

        $tasksQuery = Task::query()->whereIn('project_id', $projectIds);

        $overdueCount = (clone $tasksQuery)
            ->whereNotNull('due_at')
            ->where('due_at', '<', now()->toDateString())
            ->whereDoesntHave('boardColumn', fn ($q) => $q->where('is_done_column', true))
            ->count();

        $tasksPerAssignee = DB::table('task_assignees')
            ->join('tasks', 'tasks.id', '=', 'task_assignees.task_id')
            ->join('users', 'users.id', '=', 'task_assignees.user_id')
            ->whereIn('tasks.project_id', $projectIds)
            ->select('users.id', 'users.name', DB::raw('count(*) as total'))
            ->groupBy('users.id', 'users.name')
            ->get();

        return [
            'projects_count' => $projectIds->count(),
            'tasks_count' => (clone $tasksQuery)->count(),
            'tasks_by_priority' => (clone $tasksQuery)->select('priority', DB::raw('count(*) as total'))->groupBy('priority')->pluck('total', 'priority'),
            'tasks_by_type' => (clone $tasksQuery)->select('type', DB::raw('count(*) as total'))->groupBy('type')->pluck('total', 'type'),
            'projects_by_status' => Project::whereIn('id', $projectIds)->select('status', DB::raw('count(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'overdue_tasks_count' => $overdueCount,
            'tasks_per_assignee' => $tasksPerAssignee,
            'by_status' => $this->byStatus($projectIds->all()),
        ];
    }

    /**
     * Contagem de tarefas por "estado". Não há enum de estado: o estado é a
     * coluna do quadro, por isso agrega-se pelo NOME da coluna (projectos
     * diferentes com colunas homónimas somam-se), ordenado pela posição
     * mínima da coluna. Colunas vazias aparecem com total 0.
     *
     * @param  array<int, int>  $projectIds
     * @return list<array{name: string, is_done_column: bool, total: int}>
     */
    private function byStatus(array $projectIds): array
    {
        return DB::table('board_columns')
            ->join('boards', 'boards.id', '=', 'board_columns.board_id')
            ->leftJoin('tasks', 'tasks.board_column_id', '=', 'board_columns.id')
            ->whereIn('boards.project_id', $projectIds)
            ->groupBy('board_columns.name')
            ->select(
                'board_columns.name',
                DB::raw('max(case when board_columns.is_done_column = 1 then 1 else 0 end) as is_done_column'),
                DB::raw('count(tasks.id) as total'),
                DB::raw('min(board_columns.position) as min_position'),
            )
            ->orderBy('min_position')
            ->orderBy('board_columns.name')
            ->get()
            ->map(fn (object $row): array => [
                'name' => (string) $row->name,
                'is_done_column' => (bool) $row->is_done_column,
                'total' => (int) $row->total,
            ])
            ->values()
            ->all();
    }
}
