<?php

declare(strict_types=1);

namespace Database\Factories\Infra;

use App\Enums\Infra\MachineAccessType;
use App\Enums\Infra\MachineEnvironment;
use App\Models\Infra\Machine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Machine>
 */
class MachineFactory extends Factory
{
    protected $model = Machine::class;

    public function definition(): array
    {
        return [
            'name' => 'Máquina '.fake()->unique()->numberBetween(1, 999),
            'ip_address' => fake()->localIpv4(),
            'operating_system' => fake()->randomElement(['Windows Server 2019', 'Ubuntu 22.04', 'Windows 10']),
            'access_type' => fake()->randomElement(MachineAccessType::cases()),
            'access_user' => fake()->userName(),
            'environment' => fake()->randomElement(MachineEnvironment::cases()),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
