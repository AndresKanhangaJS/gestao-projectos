<?php

declare(strict_types=1);

namespace App\Enums\Projects;

enum TaskRelationType: string
{
    case Blocks = 'blocks';
    case BlockedBy = 'blocked_by';
    case RelatesTo = 'relates_to';
    case Duplicates = 'duplicates';

    /** Rótulo em português (usado nas descrições do histórico de actividade). */
    public function label(): string
    {
        return match ($this) {
            self::Blocks => 'bloqueia',
            self::BlockedBy => 'bloqueada por',
            self::RelatesTo => 'relacionada com',
            self::Duplicates => 'duplica',
        };
    }
}
