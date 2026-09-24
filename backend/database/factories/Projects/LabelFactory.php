<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Models\Projects\Label;
use App\Models\Projects\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Label>
 */
class LabelFactory extends Factory
{
    protected $model = Label::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => fake()->randomElement(['Urgente', 'Bug', 'Melhoria', 'Documentação', 'Backend', 'Frontend']),
            'color' => fake()->safeHexColor(),
        ];
    }
}
