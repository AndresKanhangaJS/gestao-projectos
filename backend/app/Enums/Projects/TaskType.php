<?php

declare(strict_types=1);

namespace App\Enums\Projects;

enum TaskType: string
{
    case Epic = 'epic';
    case Story = 'story';
    case Task = 'task';
    case Bug = 'bug';
}
