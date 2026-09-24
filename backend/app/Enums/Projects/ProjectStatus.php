<?php

declare(strict_types=1);

namespace App\Enums\Projects;

enum ProjectStatus: string
{
    case Active = 'active';
    case Archived = 'archived';
}
