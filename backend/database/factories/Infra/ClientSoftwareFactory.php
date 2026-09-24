<?php

declare(strict_types=1);

namespace Database\Factories\Infra;

use App\Enums\Infra\ClientSoftwareStatus;
use App\Models\Infra\Client;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClientSoftware>
 */
class ClientSoftwareFactory extends Factory
{
    protected $model = ClientSoftware::class;

    public function definition(): array
    {
        return [
            'client_id' => Client::factory(),
            'software_product_id' => SoftwareProduct::factory(),
            'status' => ClientSoftwareStatus::Producao,
            'activated_at' => fake()->optional()->date(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
