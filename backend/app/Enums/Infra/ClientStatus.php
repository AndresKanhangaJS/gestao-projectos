<?php

declare(strict_types=1);

namespace App\Enums\Infra;

enum ClientStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
}
