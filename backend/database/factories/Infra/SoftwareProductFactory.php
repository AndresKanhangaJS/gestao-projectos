<?php

declare(strict_types=1);

namespace Database\Factories\Infra;

use App\Models\Infra\SoftwareProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SoftwareProduct>
 */
class SoftwareProductFactory extends Factory
{
    protected $model = SoftwareProduct::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'category' => fake()->randomElement(['ERP', 'RH', 'Escolar', 'Financeiro', 'Web']),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
