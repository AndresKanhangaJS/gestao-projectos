<?php

declare(strict_types=1);

namespace App\Enums\Projects;

enum WorkspaceRole: string
{
    case Owner = 'owner';
    case Manager = 'manager';
    case Member = 'member';
    case Viewer = 'viewer';
}
