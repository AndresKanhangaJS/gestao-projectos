<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Enums\Projects\ProjectStatus;
use App\Models\Projects\Board;
use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use Illuminate\Support\Facades\DB;

/**
 * Criação de projectos: um projecto novo nasce sempre com um quadro por
 * omissão ("Quadro principal") e colunas por omissão, para que seja possível
 * criar tarefas de imediato (StoreTaskRequest exige `board_column_id`).
 *
 * Não existe um enum de "estado da tarefa": o estado de uma tarefa é a coluna
 * do quadro em que está (`tasks.board_column_id`), e a única semântica fixa é
 * `board_columns.is_done_column` (usada no cálculo de tarefas em atraso).
 * As colunas por omissão espelham as do ProjectsDemoSeeder.
 */
class ProjectService
{
    public const string DEFAULT_BOARD_NAME = 'Quadro principal';

    /**
     * @var list<array{name: string, color: string, is_done_column: bool}>
     */
    public const array DEFAULT_COLUMNS = [
        ['name' => 'Por fazer', 'color' => '#94a3b8', 'is_done_column' => false],
        ['name' => 'Em curso', 'color' => '#4f46e5', 'is_done_column' => false],
        ['name' => 'Em revisão', 'color' => '#d97706', 'is_done_column' => false],
        ['name' => 'Concluído', 'color' => '#16a34a', 'is_done_column' => true],
    ];

    /**
     * @param  array<string, mixed>  $data  dados validados de StoreProjectRequest
     */
    public function create(Workspace $workspace, array $data): Project
    {
        // Os enums são resolvidos pelo cast do model; um valor por omissão só ao
        // nível da coluna (migração) não fica disponível na instância recém-criada.
        $data['status'] ??= ProjectStatus::Active->value;

        return DB::transaction(function () use ($workspace, $data): Project {
            /** @var Project $project */
            $project = $workspace->projects()->create($data);

            $this->createDefaultBoard($project);

            return $project;
        });
    }

    public function createDefaultBoard(Project $project): Board
    {
        return $this->createBoard($project, [
            'name' => self::DEFAULT_BOARD_NAME,
            'is_default' => true,
        ]);
    }

    /**
     * Cria um quadro no projecto. Só pode existir um quadro por omissão por
     * projecto: marcar este como `is_default` desmarca os restantes.
     *
     * @param  array<string, mixed>  $data  name, is_default?
     */
    public function createBoard(Project $project, array $data, bool $withDefaultColumns = true): Board
    {
        $data['is_default'] = (bool) ($data['is_default'] ?? false);

        return DB::transaction(function () use ($project, $data, $withDefaultColumns): Board {
            if ($data['is_default']) {
                $project->boards()->update(['is_default' => false]);
            }

            /** @var Board $board */
            $board = $project->boards()->create($data);

            if ($withDefaultColumns) {
                $this->createDefaultColumns($board);
            }

            return $board;
        });
    }

    /** Cria as colunas base (DEFAULT_COLUMNS) num quadro, a seguir às que já existam. */
    public function createDefaultColumns(Board $board): void
    {
        $offset = (int) $board->columns()->count();

        foreach (self::DEFAULT_COLUMNS as $index => $column) {
            $board->columns()->create([...$column, 'position' => $offset + $index]);
        }
    }
}
