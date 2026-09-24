<?php

declare(strict_types=1);

namespace App\Enums\Infra;

enum MachineAccessType: string
{
    case Ssh = 'ssh';
    case Rdp = 'rdp';
    case Web = 'web';
}
