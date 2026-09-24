<?php

declare(strict_types=1);

namespace App\Enums\Infra;

enum BackupFrequency: string
{
    case Diario = 'diario';
    case Semanal = 'semanal';
    case Mensal = 'mensal';
}
