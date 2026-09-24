<?php

declare(strict_types=1);

namespace Database\Factories\Infra;

use App\Enums\Infra\DeploymentComponent;
use App\Enums\Infra\DeploymentStatus;
use App\Enums\Infra\MachineEnvironment;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Deployment>
 */
class DeploymentFactory extends Factory
{
    protected $model = Deployment::class;

    public function definition(): array
    {
        $environmentType = fake()->randomElement(MachineEnvironment::cases());

        return [
            'client_software_id' => ClientSoftware::factory(),
            'software_module_id' => null,
            'machine_id' => Machine::factory(),
            'component' => DeploymentComponent::Full,
            'port' => fake()->numberBetween(3000, 9000),
            'stack' => fake()->randomElement(['Laravel 10.50.2', 'Laravel 11', 'Angular 17', 'React 19']),
            'database_engine' => fake()->randomElement(['mysql', 'pgsql', null]),
            'database_name' => fake()->optional()->word(),
            'database_host' => fake()->optional()->ipv4(),
            'environment_type' => $environmentType,
            'start_command' => $environmentType === MachineEnvironment::Tradicional ? 'php artisan serve --port=8000' : null,
            'status' => DeploymentStatus::Activo,
            'last_checked_at' => fake()->optional()->dateTimeBetween('-60 days', 'now'),
        ];
    }
}
