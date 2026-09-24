<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\Projects\Board;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\Projects\Workspace;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Dados de exemplo para o módulo de Gestão de Projectos: um workspace, um
 * projecto, um quadro com colunas por omissão e algumas tarefas de exemplo,
 * para que a aplicação não nasça vazia. Complementa (não substitui)
 * RolesAndPermissionsSeeder e DemoInfraSeeder.
 */
class ProjectsDemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@level-soft.local')->firstOrFail();
        $manager = User::where('email', 'gestor@level-soft.local')->firstOrFail();
        $member = User::where('email', 'membro@level-soft.local')->firstOrFail();

        $workspace = Workspace::firstOrCreate(
            ['slug' => 'level-soft'],
            ['name' => 'Level-Soft', 'description' => 'Workspace principal da equipa de desenvolvimento.', 'owner_id' => $admin->id],
        );

        foreach ([$admin, $manager, $member] as $user) {
            $workspace->members()->syncWithoutDetaching([
                $user->id => ['role' => $user->is($admin) ? 'owner' : ($user->is($manager) ? 'manager' : 'member')],
            ]);
        }

        $project = Project::firstOrCreate(
            ['workspace_id' => $workspace->id, 'key' => 'GPS'],
            ['name' => 'Gestão de Projectos & Controlo de Software', 'description' => 'Projecto interno de construção desta própria plataforma.', 'status' => 'active'],
        );

        $board = Board::firstOrCreate(
            ['project_id' => $project->id, 'is_default' => true],
            ['name' => 'Quadro principal'],
        );

        $columnDefinitions = [
            ['name' => 'Por fazer', 'position' => 0, 'color' => '#94a3b8', 'is_done_column' => false],
            ['name' => 'Em curso', 'position' => 1, 'color' => '#4f46e5', 'is_done_column' => false],
            ['name' => 'Em revisão', 'position' => 2, 'color' => '#d97706', 'is_done_column' => false],
            ['name' => 'Concluído', 'position' => 3, 'color' => '#16a34a', 'is_done_column' => true],
        ];

        $columns = collect($columnDefinitions)->mapWithKeys(function (array $def) use ($board) {
            $column = BoardColumn::firstOrCreate(
                ['board_id' => $board->id, 'name' => $def['name']],
                ['position' => $def['position'], 'color' => $def['color'], 'is_done_column' => $def['is_done_column']],
            );

            return [$def['name'] => $column];
        });

        $tasks = [
            ['title' => 'Desenhar o modelo de dados dos dois módulos', 'column' => 'Concluído', 'type' => TaskType::Epic, 'priority' => TaskPriority::High, 'assignee' => $admin],
            ['title' => 'Configurar Docker Compose (nginx, php-fpm, mysql, redis)', 'column' => 'Concluído', 'type' => TaskType::Task, 'priority' => TaskPriority::High, 'assignee' => $admin],
            ['title' => 'Implementar autenticação Sanctum (SPA)', 'column' => 'Em revisão', 'type' => TaskType::Story, 'priority' => TaskPriority::High, 'assignee' => $manager],
            ['title' => 'Quadro Kanban com drag-and-drop', 'column' => 'Em curso', 'type' => TaskType::Story, 'priority' => TaskPriority::Urgent, 'assignee' => $member],
            ['title' => 'Página de clientes do módulo de Controlo de Software', 'column' => 'Em curso', 'type' => TaskType::Task, 'priority' => TaskPriority::Medium, 'assignee' => $member],
            ['title' => 'Corrigir alerta de máquinas em ambiente tradicional', 'column' => 'Por fazer', 'type' => TaskType::Bug, 'priority' => TaskPriority::Medium, 'assignee' => null],
            ['title' => 'Escrever testes de feature do fluxo de revelação de credenciais', 'column' => 'Por fazer', 'type' => TaskType::Task, 'priority' => TaskPriority::High, 'assignee' => $admin],
            ['title' => 'Preparar relatório de burndown (Fase 2)', 'column' => 'Por fazer', 'type' => TaskType::Task, 'priority' => TaskPriority::Low, 'assignee' => null],
        ];

        foreach ($tasks as $index => $def) {
            /** @var BoardColumn $column */
            $column = $columns[$def['column']];

            $task = Task::firstOrCreate(
                ['project_id' => $project->id, 'title' => $def['title']],
                [
                    'board_column_id' => $column->id,
                    'reporter_id' => $admin->id,
                    'type' => $def['type'],
                    'priority' => $def['priority'],
                    'position' => $index,
                ],
            );

            if ($def['assignee']) {
                $task->assignees()->syncWithoutDetaching([$def['assignee']->id]);
            }
        }
    }
}
