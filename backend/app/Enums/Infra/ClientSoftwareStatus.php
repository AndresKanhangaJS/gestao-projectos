<?php

declare(strict_types=1);

namespace App\Enums\Infra;

enum ClientSoftwareStatus: string
{
    case Desenvolvimento = 'desenvolvimento';
    case DesenvolvimentoLocal = 'desenvolvimento_local';
    case Testes = 'testes';
    case Producao = 'producao';
    case Manutencao = 'manutencao';
    case Descontinuado = 'descontinuado';
}
