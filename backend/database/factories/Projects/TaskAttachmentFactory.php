<?php

declare(strict_types=1);

namespace Database\Factories\Projects;

use App\Models\Projects\Task;
use App\Models\Projects\TaskAttachment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskAttachment>
 */
class TaskAttachmentFactory extends Factory
{
    protected $model = TaskAttachment::class;

    public function definition(): array
    {
        $name = fake()->word().'.pdf';

        return [
            'task_id' => Task::factory(),
            'uploaded_by' => User::factory(),
            'path' => 'task-attachments/'.fake()->uuid().'-'.$name,
            'original_name' => $name,
        ];
    }
}
