<?php

declare(strict_types=1);

namespace App\Enums\Infra;

enum MachineEnvironment: string
{
    case Docker = 'docker';
    case Tradicional = 'tradicional';
}
