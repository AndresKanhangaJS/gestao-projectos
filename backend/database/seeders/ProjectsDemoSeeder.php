<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\Projects\SprintStatus;
use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Enums\Projects\WorkspaceRole;
use App\Models\Infra\Client;
use App\Models\Infra\SoftwareProduct;
use App\Models\Projects\Board;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Project;
use App\Models\Projects\Sprint;
use App\Models\Projects\Task;
use App\Models\Projects\Workspace;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Dados de exemplo para o módulo de Gestão de Projectos: um workspace, um
 * projecto, um quadro com colunas por omissão, algumas tarefas de exemplo e
 * dois sprints (Sprint 1 activo, Sprint 2 planeado; o resto fica no backlog),
 * para que a aplicação não nasça vazia. Complementa (não substitui)
 * RolesAndPermissionsSeeder e DemoInfraSeeder.
 *
 * Idempotente: pode correr várias vezes sobre uma BD com dados do utilizador
 * sem duplicar nada nem desfazer alterações feitas na aplicação (ex.: só
 * coloca uma tarefa num sprint se ainda estiver no backlog).
 *
 * Membros do workspace demo: admin → owner, gestor → manager,
 * membro → member, infra → viewer (só leitura no módulo de projectos).
 */
class ProjectsDemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@level-soft.local')->firstOrFail();
        $manager = User::where('email', 'gestor@level-soft.local')->firstOrFail();
        $member = User::where('email', 'membro@level-soft.local')->firstOrFail();
        $infra = User::where('email', 'infra@level-soft.local')->firstOrFail();

        $workspace = Workspace::firstOrCreate(
            ['slug' => 'level-soft'],
            ['name' => 'Level-Soft', 'description' => 'Workspace principal da equipa de desenvolvimento.', 'owner_id' => $admin->id],
        );

        $memberRoles = [
            [$admin, WorkspaceRole::Owner],
            [$manager, WorkspaceRole::Manager],
            [$member, WorkspaceRole::Member],
            [$infra, WorkspaceRole::Viewer],
        ];

        foreach ($memberRoles as [$user, $role]) {
            $workspace->members()->syncWithoutDetaching([$user->id => ['role' => $role->value]]);
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

        $this->seedSprints($project);
        $this->seedSoftwareLink($project);
    }

    /**
     * Liga o projecto demo ao Controlo de Software (dados reais do
     * DemoInfraSeeder): Level-RH na instalação do cliente Pitruca, módulos
     * Front-end e Back-end. A instalação Pitruca↔Level-RH não tem linhas em
     * client_software_modules ⇒ "todos os módulos" activos.
     * Só liga se o projecto ainda não tiver software (não desfaz escolhas do utilizador).
     */
    private function seedSoftwareLink(Project $project): void
    {
        if ($project->software_product_id !== null) {
            return;
        }

        $product = SoftwareProduct::where('name', 'Level-RH')->first();
        $client = Client::where('name', 'Pitruca')->first();

        if ($product === null || $client === null
            || ! $client->clientSoftware()->where('software_product_id', $product->id)->exists()) {
            return;
        }

        $project->update(['software_product_id' => $product->id, 'client_id' => $client->id]);
        $project->modules()->syncWithoutDetaching(
            $product->modules()->whereIn('name', ['Front-end', 'Back-end'])->pluck('id')->all()
        );
    }

    /**
     * Sprint 1 (activo) com 4 tarefas, Sprint 2 (planeado) com 2; as restantes
     * ficam no backlog. Só cria o Sprint 1 como activo se o projecto ainda não
     * tiver outro sprint activo (regra "um sprint activo por projecto").
     */
    private function seedSprints(Project $project): void
    {
        $hasOtherActive = $project->sprints()
            ->where('status', SprintStatus::Active->value)
            ->where('name', '!=', 'Sprint 1')
            ->exists();

        $sprintOne = Sprint::firstOrCreate(
            ['project_id' => $project->id, 'name' => 'Sprint 1'],
            [
                'goal' => 'Autenticação e primeira versão do quadro Kanban.',
                'starts_at' => now()->subDays(7)->toDateString(),
                'ends_at' => now()->addDays(7)->toDateString(),
                'status' => $hasOtherActive ? SprintStatus::Planned : SprintStatus::Active,
            ],
        );

        $sprintTwo = Sprint::firstOrCreate(
            ['project_id' => $project->id, 'name' => 'Sprint 2'],
            [
                'goal' => 'Robustez: testes de credenciais e alertas de infraestrutura.',
                'starts_at' => now()->addDays(8)->toDateString(),
                'ends_at' => now()->addDays(21)->toDateString(),
                'status' => SprintStatus::Planned,
            ],
        );

        $plan = [
            $sprintOne->id => [
                'Configurar Docker Compose (nginx, php-fpm, mysql, redis)',
                'Implementar autenticação Sanctum (SPA)',
                'Quadro Kanban com drag-and-drop',
                'Página de clientes do módulo de Controlo de Software',
            ],
            $sprintTwo->id => [
                'Escrever testes de feature do fluxo de revelação de credenciais',
                'Corrigir alerta de máquinas em ambiente tradicional',
            ],
        ];

        foreach ($plan as $sprintId => $titles) {
            Task::query()
                ->where('project_id', $project->id)
                ->whereIn('title', $titles)
                ->whereNull('sprint_id')
                ->update(['sprint_id' => $sprintId]);
        }
    }
}
