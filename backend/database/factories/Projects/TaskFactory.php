<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        $titles = [
            'Corrigir erro no formulário de login',
            'Implementar exportação de relatórios em PDF',
            'Optimizar consulta de listagem de clientes',
            'Criar ecrã de definições do utilizador',
            'Adicionar validação ao formulário de contacto',
            'Rever permissões de acesso ao módulo financeiro',
            'Actualizar dependências do backend',
            'Melhorar tempo de resposta da API de tarefas',
        ];

        return [
            'project_id' => Project::factory(),
            'board_column_id' => BoardColumn::factory(),
            'sprint_id' => null,
            'parent_id' => null,
            'reporter_id' => User::factory(),
            'type' => fake()->randomElement(TaskType::cases()),
            'priority' => fake()->randomElement(TaskPriority::cases()),
            'title' => fake()->randomElement($titles),
            'description' => fake()->optional()->paragraph(),
            'estimate' => fake()->optional()->randomFloat(2, 1, 40),
            'starts_at' => fake()->optional()->dateTimeBetween('-1 week', 'now'),
            'due_at' => fake()->optional()->dateTimeBetween('now', '+3 weeks'),
            'position' => 0,
        ];
    }
}
