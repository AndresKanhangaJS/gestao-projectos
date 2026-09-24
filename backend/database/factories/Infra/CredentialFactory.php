<?php

declare(strict_types=1);

namespace Database\Factories\Infra;

use App\Enums\Infra\CredentialType;
use App\Models\Infra\Credential;
use App\Models\Infra\Machine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Credential>
 */
class CredentialFactory extends Factory
{
    protected $model = Credential::class;

    public function definition(): array
    {
        return [
            'credentialable_type' => Machine::class,
            'credentialable_id' => Machine::factory(),
            'type' => fake()->randomElement(CredentialType::cases()),
            'username' => fake()->userName(),
            'secret' => fake()->password(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
