<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Models\Projects\Board;
use App\Models\Projects\BoardColumn;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BoardColumn>
 */
class BoardColumnFactory extends Factory
{
    protected $model = BoardColumn::class;

    public function definition(): array
    {
        return [
            'board_id' => Board::factory(),
            'name' => fake()->randomElement(['A Fazer', 'Em Progresso', 'Em Revisão', 'Concluído']),
            'position' => fake()->numberBetween(0, 3),
            'color' => fake()->safeHexColor(),
            'is_done_column' => false,
        ];
    }

    public function done(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Concluído',
            'is_done_column' => true,
        ]);
    }
}
