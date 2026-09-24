<?php

declare(strict_types=1);

namespace App\Enums\Projects;

enum SprintStatus: string
{
    case Planned = 'planned';
    case Active = 'active';
    case Completed = 'completed';
}
