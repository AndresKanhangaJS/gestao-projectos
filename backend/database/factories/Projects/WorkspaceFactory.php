<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Models\Projects\Workspace;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Workspace>
 */
class WorkspaceFactory extends Factory
{
    protected $model = Workspace::class;

    public function definition(): array
    {
        $name = fake()->randomElement([
            'Equipa Web', 'Equipa Mobile', 'Equipa Infraestrutura',
            'Equipa Produto', 'Level-School', 'Level-RH', 'Level-Facturação',
        ]).' '.fake()->unique()->numberBetween(1, 9999);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->optional()->sentence(12),
            'owner_id' => User::factory(),
        ];
    }
}
