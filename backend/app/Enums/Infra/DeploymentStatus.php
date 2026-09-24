<?php

declare(strict_types=1);

namespace App\Enums\Infra;

enum DeploymentStatus: string
{
    case Activo = 'activo';
    case Testes = 'testes';
    case Parado = 'parado';
}
