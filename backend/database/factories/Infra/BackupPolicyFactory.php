<?php

declare(strict_types=1);

namespace Database\Factories\Infra;

use App\Enums\Infra\BackupFrequency;
use App\Models\Infra\BackupPolicy;
use App\Models\Infra\Machine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BackupPolicy>
 */
class BackupPolicyFactory extends Factory
{
    protected $model = BackupPolicy::class;

    public function definition(): array
    {
        return [
            'backupable_type' => Machine::class,
            'backupable_id' => Machine::factory(),
            'frequency' => fake()->randomElement(BackupFrequency::cases()),
            'retention_count' => fake()->numberBetween(3, 30),
            'last_run_at' => fake()->optional()->dateTimeBetween('-30 days', 'now'),
            'next_run_at' => fake()->optional()->dateTimeBetween('now', '+30 days'),
        ];
    }
}
