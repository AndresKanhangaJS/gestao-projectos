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
        $moduleIds = $this->pullModuleIds($data);

        return DB::transaction(function () use ($workspace, $data, $moduleIds): Project {
            /** @var Project $project */
            $project = $workspace->projects()->create($data);

            if ($moduleIds !== null) {
                $project->modules()->sync($moduleIds);
            }

            $this->createDefaultBoard($project);

            return $project;
        });
    }

    /**
     * Actualiza o projecto e a ligação ao Controlo de Software.
     * Mudar ou limpar o software sem enviar `client_id`/`module_ids` limpa-os
     * (deixariam de ser coerentes) — espelha ValidatesProjectLinks.
     *
     * @param  array<string, mixed>  $data  dados validados de UpdateProjectRequest
     */
    public function update(Project $project, array $data): Project
    {
        $moduleIds = $this->pullModuleIds($data);

        if (array_key_exists('software_product_id', $data)) {
            $productId = $data['software_product_id'] === null ? null : (int) $data['software_product_id'];
            $current = $project->software_product_id === null ? null : (int) $project->software_product_id;

            if ($productId !== $current || $productId === null) {
                if (! array_key_exists('client_id', $data)) {
                    $data['client_id'] = null;
                }
                $moduleIds ??= [];
            }
        }

        DB::transaction(function () use ($project, $data, $moduleIds): void {
            $project->update($data);

            if ($moduleIds !== null) {
                $project->modules()->sync($moduleIds);
            }
        });

        return $project;
    }

    /**
     * Remove `module_ids` do payload: null = não enviado (não mexer); [] = limpar.
     *
     * @param  array<string, mixed>  $data
     * @return array<int, int>|null
     */
    private function pullModuleIds(array &$data): ?array
    {
        if (! array_key_exists('module_ids', $data)) {
            return null;
        }

        $ids = array_values(array_map('intval', (array) ($data['module_ids'] ?? [])));
        unset($data['module_ids']);

        return $ids;
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
