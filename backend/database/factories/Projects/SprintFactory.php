<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Enums\Projects\SprintStatus;
use App\Models\Projects\Project;
use App\Models\Projects\Sprint;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sprint>
 */
class SprintFactory extends Factory
{
    protected $model = Sprint::class;

    public function definition(): array
    {
        $startsAt = fake()->dateTimeBetween('-2 weeks', '+1 week');

        return [
            'project_id' => Project::factory(),
            'name' => 'Sprint '.fake()->numberBetween(1, 40),
            'goal' => fake()->optional()->sentence(15),
            'starts_at' => $startsAt,
            'ends_at' => (clone $startsAt)->modify('+2 weeks'),
            'status' => fake()->randomElement(SprintStatus::cases()),
        ];
    }
}
