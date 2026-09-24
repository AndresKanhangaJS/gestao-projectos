<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Enums\Projects\ActivityEvent;
use App\Models\Projects\ActivityLog;
use App\Models\Projects\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActivityLog>
 */
class ActivityLogFactory extends Factory
{
    protected $model = ActivityLog::class;

    public function definition(): array
    {
        return [
            'project_id' => null,
            'subject_type' => Task::class,
            'subject_id' => Task::factory(),
            'causer_id' => User::factory(),
            'event' => fake()->randomElement(ActivityEvent::cases()),
            'changes' => null,
            'created_at' => now(),
        ];
    }
}
