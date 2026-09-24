<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Models\Projects\Board;
use App\Models\Projects\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Board>
 */
class BoardFactory extends Factory
{
    protected $model = Board::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => 'Quadro Principal',
            'is_default' => true,
        ];
    }
}
