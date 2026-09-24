<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Enums\Projects\ProjectStatus;
use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        $name = fake()->randomElement([
            'Portal do Cliente', 'App de Gestão de Frota', 'Plataforma de Facturação',
            'Sistema de Recursos Humanos', 'Loja Online', 'Dashboard Interno',
        ]);

        return [
            'workspace_id' => Workspace::factory(),
            'key' => strtoupper(Str::random(4)),
            'name' => $name,
            'description' => fake()->optional()->paragraph(),
            'status' => fake()->randomElement(ProjectStatus::cases()),
        ];
    }
}
