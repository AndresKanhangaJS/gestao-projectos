<?php

declare(strict_types=1);

namespace App\Enums\Infra;

enum CredentialType: string
{
    case Ssh = 'ssh';
    case Rdp = 'rdp';
    case Web = 'web';
    case Database = 'database';
}
