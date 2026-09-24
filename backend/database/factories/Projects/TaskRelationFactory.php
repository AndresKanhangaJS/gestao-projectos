<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Enums\Projects\TaskRelationType;
use App\Models\Projects\Task;
use App\Models\Projects\TaskRelation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskRelation>
 */
class TaskRelationFactory extends Factory
{
    protected $model = TaskRelation::class;

    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'related_task_id' => Task::factory(),
            'type' => fake()->randomElement(TaskRelationType::cases()),
        ];
    }
}
