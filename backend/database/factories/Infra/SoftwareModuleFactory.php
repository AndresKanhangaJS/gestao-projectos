<?php

declare(strict_types=1);

namespace Database\Factories\Infra;

use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SoftwareModule>
 */
class SoftwareModuleFactory extends Factory
{
    protected $model = SoftwareModule::class;

    public function definition(): array
    {
        return [
            'software_product_id' => SoftwareProduct::factory(),
            'name' => fake()->unique()->word(),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
